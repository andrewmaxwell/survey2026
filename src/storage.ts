import { QUESTION_COUNT } from "./data";
import type { AppScreen, SurveyState } from "./types";

const LOCAL_STORAGE_KEY = "vibeCheckState";

export interface SavedSession {
  state: SurveyState;
  hasSubmittedSelf: boolean;
  appState: AppScreen;
}

export const initialAnswers = (): number[] =>
  new Array(QUESTION_COUNT).fill(50);

export const emptySession = (): SavedSession => ({
  state: {
    userName: "",
    targetName: "",
    mode: "self",
    answers: initialAnswers(),
    currentQuestionIndex: 0,
  },
  hasSubmittedSelf: false,
  appState: "intro",
});

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/** Validate the stored survey state; null if it doesn't fit the current questions. */
function parseSurveyState(v: unknown): SurveyState | null {
  if (!isRecord(v)) return null;
  const { userName, targetName, mode, answers, currentQuestionIndex } = v;
  if (typeof userName !== "string" || typeof targetName !== "string") return null;
  if (mode !== "self" && mode !== "friend") return null;
  if (
    !Array.isArray(answers) ||
    answers.length !== QUESTION_COUNT ||
    !answers.every((a) => typeof a === "number" && a >= 0 && a <= 100)
  )
    return null;
  if (
    typeof currentQuestionIndex !== "number" ||
    !Number.isInteger(currentQuestionIndex) ||
    currentQuestionIndex < 0 ||
    currentQuestionIndex >= QUESTION_COUNT
  )
    return null;
  return { userName, targetName, mode, answers, currentQuestionIndex };
}

/**
 * Restore the session saved in localStorage. Anything missing, corrupt, or
 * saved for a different set of questions falls back to a fresh session.
 */
export function loadSession(): SavedSession {
  let parsed: unknown;
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return emptySession();
    parsed = JSON.parse(saved);
  } catch {
    console.warn("Failed to read saved session");
    return emptySession();
  }

  if (!isRecord(parsed)) return emptySession();
  const state = parseSurveyState(parsed.state);
  if (!state) return emptySession();

  const hasSubmittedSelf = parsed.hasSubmittedSelf === true;
  let appState: AppScreen;
  if (
    parsed.appState === "intro" ||
    parsed.appState === "survey" ||
    parsed.appState === "analysis"
  ) {
    appState = parsed.appState;
  } else if (hasSubmittedSelf) {
    appState = "analysis";
  } else {
    appState = state.userName ? "survey" : "intro";
  }

  return { state, hasSubmittedSelf, appState };
}

export function saveSession(session: SavedSession): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage can be full or blocked (e.g. private browsing); the app still works.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // See saveSession.
  }
}
