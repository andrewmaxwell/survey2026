// Results: https://docs.google.com/spreadsheets/d/15O6-xEiLt_qJUXqtQL5KePNhQxt2uiYZqMzlx14rlMk/edit?gid=0#gid=0
// Apps Script: https://script.google.com/u/0/home/projects/15VlmFxcaRGAyhmaWKbuxCueXmyP52k6bihyvBxPE0PhVommVlxgLEoQ8/edit

import { questionKeys, type QuestionKey } from "./data";

const API_URL =
  "https://script.google.com/macros/s/AKfycbxmCId-MzDXfRv5DOuPdSuBQz5Na-UI4N0w-BJzl2d0tPWq4L8sfSv7xTEFKMP6y8W3/exec";

export type SurveyRating = {
  timestamp?: string;
  rater: string;
  subject: string;
} & Record<QuestionKey, number>;

export interface SubmissionResponse {
  status: "success" | "error";
  rowsAdded?: number;
  message?: string;
}

/**
 * Fetches all survey data for analysis and data visualization.
 * Throws if the request fails, so callers can tell "couldn't load"
 * apart from "no one has answered yet".
 */
export async function fetchData(): Promise<SurveyRating[]> {
  const url = `${API_URL}?action=getAllData`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = (await response.json()) as unknown;
  if (!Array.isArray(data)) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : "Unexpected response from the server.";
    throw new Error(message);
  }

  return (data as Record<string, unknown>[]).map((row) => {
    const rating = {
      timestamp: String(row.Timestamp || ""),
      rater: String(row.Rater || ""),
      subject: String(row.Subject || ""),
    } as SurveyRating;
    questionKeys.forEach((key, i) => {
      rating[key] = Number(row[`Q${i + 1}`] || 0);
    });
    return rating;
  });
}

/**
 * Submits an array of completed surveys to the Google Sheet.
 * Throws if the request fails or the Apps Script reports an error,
 * so callers can't mistake a failed save for a successful one.
 */
export async function submitSurveys(
  surveyDataArray: SurveyRating[],
): Promise<SubmissionResponse> {
  const response = await fetch(API_URL, {
    method: "POST",
    // text/plain is required here to bypass CORS preflight restrictions in Apps Script
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(surveyDataArray),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = (await response.json()) as SubmissionResponse;
  if (result.status !== "success") {
    throw new Error(result.message || "The server did not save your answers.");
  }
  return result;
}
