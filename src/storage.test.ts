// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QUESTION_COUNT } from "./data";
import { clearSession, emptySession, loadSession, saveSession } from "./storage";

const KEY = "vibeCheckState";

const validState = {
  userName: "Ann",
  targetName: "Bob",
  mode: "friend",
  answers: new Array(QUESTION_COUNT).fill(70),
  currentQuestionIndex: 3,
};

describe("session storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts fresh when nothing is saved", () => {
    expect(loadSession()).toEqual(emptySession());
  });

  it("round-trips a saved session", () => {
    const session = {
      state: { ...validState, mode: "friend" as const },
      hasSubmittedSelf: true,
      appState: "survey" as const,
    };
    saveSession(session);
    expect(loadSession()).toEqual(session);
  });

  it("starts fresh after clearSession", () => {
    saveSession({ state: { ...validState, mode: "self" }, hasSubmittedSelf: true, appState: "analysis" });
    clearSession();
    expect(loadSession()).toEqual(emptySession());
  });

  it("starts fresh when the saved value isn't valid JSON", () => {
    localStorage.setItem(KEY, "{not json");
    expect(loadSession()).toEqual(emptySession());
  });

  it("starts fresh when answers were saved for a different number of questions", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ state: { ...validState, answers: [50, 50, 50] }, appState: "survey" }),
    );
    expect(loadSession()).toEqual(emptySession());
  });

  it("starts fresh when the question index is out of range", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ state: { ...validState, currentQuestionIndex: QUESTION_COUNT } }),
    );
    expect(loadSession()).toEqual(emptySession());
  });

  it("infers the screen for sessions saved before appState was stored", () => {
    localStorage.setItem(KEY, JSON.stringify({ state: validState, hasSubmittedSelf: true }));
    expect(loadSession().appState).toBe("analysis");

    localStorage.setItem(KEY, JSON.stringify({ state: validState }));
    expect(loadSession().appState).toBe("survey");
  });

  it("starts fresh when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(loadSession()).toEqual(emptySession());
  });

  it("doesn't throw when saving fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() =>
      saveSession({ state: { ...validState, mode: "self" }, hasSubmittedSelf: false, appState: "intro" }),
    ).not.toThrow();
  });
});
