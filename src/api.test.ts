import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchData, submitSurveys, type SurveyRating } from "./api";

const rating: SurveyRating = {
  rater: "Ann",
  subject: "Ann",
  q1: 50, q2: 50, q3: 50, q4: 50, q5: 50,
  q6: 50, q7: 50, q8: 50, q9: 50, q10: 50,
  q11: 50, q12: 50, q13: 50, q14: 50, q15: 50,
};

function mockFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("submitSurveys", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves with the response when the sheet saves the rows", async () => {
    mockFetch({ status: "success", rowsAdded: 1 });
    await expect(submitSurveys([rating])).resolves.toEqual({
      status: "success",
      rowsAdded: 1,
    });
  });

  it("rejects on an HTTP error instead of resolving", async () => {
    mockFetch({}, { ok: false, status: 500 });
    await expect(submitSurveys([rating])).rejects.toThrow("status: 500");
  });

  it("rejects when Apps Script reports an error in a 200 response", async () => {
    mockFetch({ status: "error", message: "Sheet is locked" });
    await expect(submitSurveys([rating])).rejects.toThrow("Sheet is locked");
  });

  it("rejects when the network request itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(submitSurveys([rating])).rejects.toThrow("Failed to fetch");
  });
});

describe("fetchData", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps sheet rows to ratings", async () => {
    mockFetch([{ Rater: "Ann", Subject: "Bob", Q1: 70, Q15: 20 }]);
    const [row] = await fetchData();
    expect(row).toMatchObject({ rater: "Ann", subject: "Bob", q1: 70, q2: 0, q15: 20 });
  });

  it("resolves to an empty list when nobody has answered", async () => {
    mockFetch([]);
    await expect(fetchData()).resolves.toEqual([]);
  });

  it("rejects on an HTTP error instead of returning no data", async () => {
    mockFetch({}, { ok: false, status: 503 });
    await expect(fetchData()).rejects.toThrow("status: 503");
  });

  it("rejects when Apps Script returns an error object instead of rows", async () => {
    mockFetch({ status: "error", message: "Quota exceeded" });
    await expect(fetchData()).rejects.toThrow("Quota exceeded");
  });

  it("rejects when the network request itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(fetchData()).rejects.toThrow("Failed to fetch");
  });
});
