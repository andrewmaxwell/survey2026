// Results: https://docs.google.com/spreadsheets/d/15O6-xEiLt_qJUXqtQL5KePNhQxt2uiYZqMzlx14rlMk/edit?gid=0#gid=0
// Apps Script: https://script.google.com/u/0/home/projects/15VlmFxcaRGAyhmaWKbuxCueXmyP52k6bihyvBxPE0PhVommVlxgLEoQ8/edit

const API_URL =
  "https://script.google.com/macros/s/AKfycbxmCId-MzDXfRv5DOuPdSuBQz5Na-UI4N0w-BJzl2d0tPWq4L8sfSv7xTEFKMP6y8W3/exec";

export interface SurveyRating {
  timestamp?: string;
  rater: string;
  subject: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  q6: number;
  q7: number;
  q8: number;
  q9: number;
  q10: number;
  q11: number;
  q12: number;
  q13: number;
  q14: number;
  q15: number;
}

export interface SubmissionResponse {
  status: "success" | "error";
  rowsAdded?: number;
  message?: string;
}

/**
 * Fetches all survey data for analysis and data visualization.
 */
export async function fetchData(): Promise<SurveyRating[]> {
  try {
    const url = `${API_URL}?action=getAllData`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as Record<string, unknown>[];

    return data.map((row) => ({
      timestamp: String(row.Timestamp || ""),
      rater: String(row.Rater || ""),
      subject: String(row.Subject || ""),
      q1: Number(row.Q1 || 0),
      q2: Number(row.Q2 || 0),
      q3: Number(row.Q3 || 0),
      q4: Number(row.Q4 || 0),
      q5: Number(row.Q5 || 0),
      q6: Number(row.Q6 || 0),
      q7: Number(row.Q7 || 0),
      q8: Number(row.Q8 || 0),
      q9: Number(row.Q9 || 0),
      q10: Number(row.Q10 || 0),
      q11: Number(row.Q11 || 0),
      q12: Number(row.Q12 || 0),
      q13: Number(row.Q13 || 0),
      q14: Number(row.Q14 || 0),
      q15: Number(row.Q15 || 0),
    }));
  } catch (error: unknown) {
    console.error("Failed to fetch analysis data:", error);
    return [];
  }
}

/**
 * Submits an array of completed surveys to the Google Sheet.
 */
export async function submitSurveys(
  surveyDataArray: SurveyRating[],
): Promise<SubmissionResponse> {
  try {
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
    return result;
  } catch (error: unknown) {
    console.error("Failed to submit surveys:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { status: "error", message: errorMessage };
  }
}
