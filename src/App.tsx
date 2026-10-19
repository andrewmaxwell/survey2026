import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { fetchData, submitSurveys, type SurveyRating } from "./api";
import { Dashboard } from "./components/Dashboard";
import { Intro } from "./components/Intro";
import { Survey } from "./components/Survey";
import { QUESTION_COUNT } from "./data";
import {
  clearSession,
  emptySession,
  initialAnswers,
  loadSession,
  saveSession,
} from "./storage";
import type { AppScreen, SurveyState } from "./types";
import { prepareAnalysisData } from "./scoring";
import {
  getSubjectSummaries,
  ratingFromAnswers,
  selfRatingOf,
} from "./utils";

const LOAD_ERROR_MESSAGE =
  "Couldn't load the latest results. Check your connection and hit Refresh.";

/** Fields that reset whenever a new survey starts. */
const freshSurvey = () => ({
  answers: initialAnswers(),
  currentQuestionIndex: 0,
});

function App() {
  // Read localStorage once; each piece of state starts from the same snapshot.
  const [saved] = useState(loadSession);
  const [state, setState] = useState<SurveyState>(saved.state);
  const [hasSubmittedSelf, setHasSubmittedSelf] = useState(
    saved.hasSubmittedSelf,
  );
  const [appState, setAppState] = useState<AppScreen>(saved.appState);

  // Raw rows as stored in the sheet. The analysis rows are derived from these
  // on every change, so the scoring pipeline always runs over the full raw
  // dataset and is never applied twice.
  const [rawData, setRawData] = useState<SurveyRating[]>([]);
  const analysisData = useMemo(() => prepareAnalysisData(rawData), [rawData]);
  const [isLoading, setIsLoading] = useState(appState === "analysis");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    saveSession({ state, hasSubmittedSelf, appState });
  }, [state, hasSubmittedSelf, appState]);

  /** Fetch the latest rows; on failure keep what we have and show an error. */
  const loadResults = useCallback(async (isActive: () => boolean) => {
    setIsLoading(true);
    try {
      const data = await fetchData();
      if (isActive()) {
        setRawData(data);
        setLoadError(null);
      }
    } catch (err) {
      console.error(err);
      if (isActive()) setLoadError(LOAD_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = () => loadResults(() => true);

  useEffect(() => {
    if (appState !== "analysis") return;
    let active = true;
    const load = async () => loadResults(() => active);
    load();
    return () => {
      active = false;
    };
  }, [appState, loadResults]);

  const handleSwitchUser = () => {
    setSubmitError(null);
    setLoadError(null);
    clearSession();
    const fresh = emptySession();
    setState(fresh.state);
    setHasSubmittedSelf(fresh.hasSubmittedSelf);
    setAppState(fresh.appState);
  };

  const handleStartOver = () => {
    if (state.mode === "friend") {
      if (
        window.confirm("Are you sure you want to cancel rating this person?")
      ) {
        setState((prev) => ({
          ...prev,
          ...freshSurvey(),
          targetName: prev.userName,
          mode: "self",
        }));
        setAppState("analysis");
      }
    } else if (
      window.confirm(
        "Are you sure you want to start over? This will reset your progress and forget your name.",
      )
    ) {
      handleSwitchUser();
    }
  };

  const handleStartSelfSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    const typedName = state.userName.trim();
    if (!typedName) return;

    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchData();
      const existingRecord = selfRatingOf(typedName, data);

      if (existingRecord) {
        // They've already taken it! Skip the survey.
        setHasSubmittedSelf(true);
        setState((prev) => ({
          ...prev,
          userName: existingRecord.rater,
          targetName: existingRecord.subject,
          mode: "self",
        }));
        setRawData(data);
        setAppState("analysis");
      } else {
        setState((prev) => ({
          ...prev,
          ...freshSurvey(),
          userName: typedName,
          targetName: typedName,
          mode: "self",
        }));
        setAppState("survey");
      }
    } catch (err) {
      console.error("Failed to check user status", err);
      // Don't guess: if we can't check, a returning user would be sent
      // through the survey again and submit a duplicate self-rating.
      setLoadError(
        "Couldn't reach the server to look up your name. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartFriendSurvey = (friendName: string) => {
    setSubmitError(null);
    setState((prev) => ({
      ...prev,
      ...freshSurvey(),
      targetName: friendName,
      mode: "friend",
    }));
    setAppState("survey");
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAnswers = [...state.answers];
    newAnswers[state.currentQuestionIndex] = parseInt(e.target.value, 10);
    setState((prev) => ({ ...prev, answers: newAnswers }));
  };

  const handleNext = () => {
    if (state.currentQuestionIndex < QUESTION_COUNT - 1) {
      setState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
      }));
    }
  };

  const handlePrev = () => {
    if (state.currentQuestionIndex > 0) {
      setState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1,
      }));
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setSubmitError(null);

    const surveyRating = ratingFromAnswers(
      state.userName,
      state.targetName,
      state.answers,
    );

    try {
      await submitSurveys([surveyRating]);
      if (state.mode === "self") {
        setHasSubmittedSelf(true);
      }

      // Optimistically add the new rating so it appears immediately
      setRawData((prev) => [...prev, surveyRating]);

      setAppState("analysis");
    } catch (err) {
      console.error("Submission failed", err);
      setSubmitError(
        err instanceof Error && err.message
          ? `Your answers weren't saved: ${err.message}`
          : "Your answers weren't saved. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const subjectsArray = useMemo(
    () => getSubjectSummaries(analysisData, state.userName),
    [analysisData, state.userName],
  );

  return (
    <>
      <div className="ambient-bg" />
      <div className="app-container">
        <AnimatePresence mode="wait">
          {appState === "intro" && (
            <Intro
              userName={state.userName}
              setUserName={(name) =>
                setState((prev) => ({ ...prev, userName: name }))
              }
              handleStartSelfSurvey={handleStartSelfSurvey}
              isLoading={isLoading}
              loadError={loadError}
            />
          )}

          {appState === "survey" && (
            <Survey
              state={state}
              isLoading={isLoading}
              submitError={submitError}
              handleStartOver={handleStartOver}
              handleSliderChange={handleSliderChange}
              handlePrev={handlePrev}
              handleNext={handleNext}
              handleSubmit={handleSubmit}
            />
          )}

          {appState === "analysis" && (
            <Dashboard
              state={state}
              isLoading={isLoading}
              analysisData={analysisData}
              rawData={rawData}
              loadError={loadError}
              subjectsArray={subjectsArray}
              handleSwitchUser={handleSwitchUser}
              handleStartFriendSurvey={handleStartFriendSurvey}
              handleRefresh={handleRefresh}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export default App;
