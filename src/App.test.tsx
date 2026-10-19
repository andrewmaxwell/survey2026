// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MotionGlobalConfig } from "framer-motion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { fetchData, submitSurveys, type SurveyRating } from "./api";
import { prepareAnalysisData } from "./scoring";

vi.mock("./api", () => ({
  fetchData: vi.fn(),
  submitSurveys: vi.fn(),
}));

// Stand-in Dashboard that records the data App hands it and lets the test
// start a friend survey, without rendering the real charts.
let dashboardData: SurveyRating[] = [];
vi.mock("./components/Dashboard", () => ({
  Dashboard: (props: {
    analysisData: SurveyRating[];
    loadError?: string | null;
    handleStartFriendSurvey: (name: string) => void;
    handleRefresh: () => void;
  }) => {
    dashboardData = props.analysisData;
    return (
      <>
        {props.loadError && <p role="alert">{props.loadError}</p>}
        <button onClick={() => props.handleStartFriendSurvey("Bob")}>
          Rate Bob
        </button>
        <button onClick={props.handleRefresh}>Refresh</button>
      </>
    );
  },
}));

function row(rater: string, subject: string, values: number[]): SurveyRating {
  const r = { rater, subject } as SurveyRating;
  values.forEach((v, i) => {
    (r[`q${i + 1}` as keyof SurveyRating] as number) = v;
  });
  return r;
}

const rawRows = [
  row("Ann", "Ann", [10, 20, 30, 40, 50, 60, 70, 80, 90, 15, 25, 35, 45, 55, 65]),
  row("Bob", "Bob", [90, 70, 50, 30, 10, 85, 65, 45, 25, 5, 95, 75, 55, 35, 15]),
  row("Ann", "Bob", [60, 60, 60, 60, 60, 40, 40, 40, 40, 40, 50, 50, 50, 50, 50]),
];

const ANSWERS = new Array(15).fill(80);

function seedStorage(appState: "survey" | "analysis") {
  localStorage.setItem(
    "vibeCheckState",
    JSON.stringify({
      state: {
        userName: "Cara",
        targetName: "Cara",
        mode: "self",
        answers: ANSWERS,
        currentQuestionIndex: 14,
      },
      hasSubmittedSelf: appState === "analysis",
      appState,
    }),
  );
}

describe("App submission", () => {
  beforeEach(() => {
    MotionGlobalConfig.skipAnimations = true;
    localStorage.clear();
    dashboardData = [];
    vi.mocked(fetchData).mockResolvedValue(rawRows);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("shows an error and stays on the survey when the save fails", async () => {
    vi.mocked(submitSurveys).mockRejectedValue(new Error("Sheet is locked"));
    seedStorage("survey");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Your answers weren't saved: Sheet is locked",
    );
    expect(screen.getByRole("button", { name: /submit/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Rate Bob" })).toBeNull();
  });

  it("runs the scoring pipeline once over raw data after a new rating is added", async () => {
    vi.mocked(submitSurveys).mockResolvedValue({ status: "success" });
    // Keep the post-submit refetch pending so we see the optimistic data,
    // which is what's on screen until the refetch comes back.
    vi.mocked(fetchData)
      .mockResolvedValueOnce(rawRows)
      .mockReturnValue(new Promise(() => {}));
    seedStorage("analysis");
    render(<App />);

    // Dashboard loads with the fetched rows, then the user rates Bob.
    await waitFor(() => expect(dashboardData).toHaveLength(rawRows.length));
    fireEvent.click(screen.getByRole("button", { name: "Rate Bob" }));
    // A friend survey starts at question 1 with every slider at 50.
    for (let i = 0; i < 14; i++) {
      fireEvent.click(await screen.findByRole("button", { name: /next/i }));
    }
    fireEvent.click(await screen.findByRole("button", { name: /submit/i }));

    await waitFor(() => expect(dashboardData).toHaveLength(rawRows.length + 1));

    const newRating = row("Cara", "Bob", new Array(15).fill(50));
    expect(dashboardData).toEqual(prepareAnalysisData([...rawRows, newRating]));
  });
});

describe("App loading", () => {
  beforeEach(() => {
    MotionGlobalConfig.skipAnimations = true;
    localStorage.clear();
    dashboardData = [];
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("stays on the intro with an error when the name lookup fails", async () => {
    vi.mocked(fetchData).mockRejectedValue(new Error("offline"));
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText(/enter your name/i), {
      target: { value: "Ann" },
    });
    fireEvent.click(screen.getByRole("button", { name: /start my survey/i }));

    expect((await screen.findByRole("alert")).textContent).toMatch(
      /couldn't reach the server/i,
    );
    // Not sent into the survey, where a returning user would rate themselves twice.
    expect(screen.queryByText(/question 1 of/i)).toBeNull();
    expect(screen.getByRole("button", { name: /start my survey/i })).toBeTruthy();
  });

  it("keeps the loaded results and shows an error when a refresh fails", async () => {
    vi.mocked(fetchData)
      .mockResolvedValueOnce(rawRows)
      .mockRejectedValueOnce(new Error("offline"));
    seedStorage("analysis");
    render(<App />);

    await waitFor(() => expect(dashboardData).toHaveLength(rawRows.length));
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect((await screen.findByRole("alert")).textContent).toMatch(
      /couldn't load the latest results/i,
    );
    expect(dashboardData).toEqual(prepareAnalysisData(rawRows));
  });
});
