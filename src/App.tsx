import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import "./App.css";
import { fetchData, submitSurveys, type SurveyRating } from "./api";
import { Dashboard } from "./components/Dashboard";
import { Intro } from "./components/Intro";
import { Survey } from "./components/Survey";
import { questions } from "./data";
import type { SurveyState } from "./types";

const LOCAL_STORAGE_KEY = "vibeCheckState";
const INITIAL_ANSWERS = new Array(questions.length).fill(50);

function App() {
  const [state, setState] = useState<SurveyState>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved).state;
      } catch {
        console.warn("Failed to parse local storage");
      }
    }
    return {
      userName: "",
      targetName: "",
      mode: "self",
      answers: [...INITIAL_ANSWERS],
      currentQuestionIndex: 0,
    };
  });

  const [hasSubmittedSelf, setHasSubmittedSelf] = useState<boolean>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved).hasSubmittedSelf;
      } catch {
        console.warn("Failed to parse local storage");
      }
    }
    return false;
  });

  const [appState, setAppState] = useState<"intro" | "survey" | "analysis">(
    () => {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.appState) return parsed.appState;
          if (parsed.hasSubmittedSelf) return "analysis";
          if (parsed.state.userName) return "survey";
        } catch {
          console.warn("Failed to parse local storage");
        }
      }
      return "intro";
    },
  );

  const [analysisData, setAnalysisData] = useState<SurveyRating[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ state, hasSubmittedSelf, appState }),
    );
  }, [state, hasSubmittedSelf, appState]);

  useEffect(() => {
    let active = true;
    if (appState === "analysis") {
      const load = async () => {
        setIsLoading(true);
        try {
          const data = await fetchData();
          if (active) {
            setAnalysisData(data);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      load();
    }
    return () => {
      active = false;
    };
  }, [appState]);

  const handleStartOver = () => {
    if (state.mode === "friend") {
      if (
        window.confirm("Are you sure you want to cancel rating this person?")
      ) {
        setState((prev) => ({
          ...prev,
          targetName: prev.userName,
          mode: "self",
          answers: [...INITIAL_ANSWERS],
          currentQuestionIndex: 0,
        }));
        setAppState("analysis");
      }
    } else {
      if (
        window.confirm(
          "Are you sure you want to start over? This will reset your progress and forget your name.",
        )
      ) {
        handleSwitchUser();
      }
    }
  };

  const handleSwitchUser = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setState({
      userName: "",
      targetName: "",
      mode: "self",
      answers: [...INITIAL_ANSWERS],
      currentQuestionIndex: 0,
    });
    setHasSubmittedSelf(false);
    setAppState("intro");
  };

  const handleStartSelfSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    const typedName = state.userName.trim();
    if (!typedName) return;

    setIsLoading(true);
    try {
      const data = await fetchData();

      // Check if this user has already self-rated (case-insensitive)
      const existingRecord = data.find(
        (row) =>
          row.rater &&
          row.subject &&
          row.rater.toLowerCase() === typedName.toLowerCase() &&
          row.subject.toLowerCase() === typedName.toLowerCase(),
      );

      if (existingRecord) {
        // They've already taken it! Skip the survey.
        setHasSubmittedSelf(true);
        setState((prev) => ({
          ...prev,
          userName: existingRecord.rater,
          targetName: existingRecord.subject,
          mode: "self",
        }));
        setAnalysisData(data);
        setAppState("analysis");
      } else {
        setState((prev) => ({
          ...prev,
          targetName: typedName,
          mode: "self",
          answers: [...INITIAL_ANSWERS],
          currentQuestionIndex: 0,
        }));
        setAppState("survey");
      }
    } catch (err) {
      console.error("Failed to check user status", err);
      // Fallback: just go to survey
      setState((prev) => ({
        ...prev,
        targetName: typedName,
        mode: "self",
        answers: [...INITIAL_ANSWERS],
        currentQuestionIndex: 0,
      }));
      setAppState("survey");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartFriendSurvey = (friendName: string) => {
    setState((prev) => ({
      ...prev,
      targetName: friendName,
      mode: "friend",
      answers: [...INITIAL_ANSWERS],
      currentQuestionIndex: 0,
    }));
    setAppState("survey");
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAnswers = [...state.answers];
    newAnswers[state.currentQuestionIndex] = parseInt(e.target.value, 10);
    setState((prev) => ({ ...prev, answers: newAnswers }));
  };

  const handleNext = () => {
    if (state.currentQuestionIndex < questions.length - 1) {
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

    const surveyRating: SurveyRating = {
      rater: state.userName,
      subject: state.targetName,
      q1: state.answers[0],
      q2: state.answers[1],
      q3: state.answers[2],
      q4: state.answers[3],
      q5: state.answers[4],
      q6: state.answers[5],
      q7: state.answers[6],
      q8: state.answers[7],
      q9: state.answers[8],
      q10: state.answers[9],
      q11: state.answers[10],
      q12: state.answers[11],
      q13: state.answers[12],
      q14: state.answers[13],
      q15: state.answers[14],
    };

    try {
      await submitSurveys([surveyRating]);
      if (state.mode === "self") {
        setHasSubmittedSelf(true);
      }

      // Optimistically add the new rating so it appears immediately
      setAnalysisData((prev) => [...prev, surveyRating]);

      setAppState("analysis");
    } catch (err) {
      console.error("Submission failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Derived state for analysis
  const subjectsMap = new Map<
    string,
    { friendCount: number; raters: Set<string> }
  >();

  // Find valid subjects (those who rated themselves), ignoring empty rows
  analysisData.forEach((row) => {
    if (row.rater && row.subject && row.rater === row.subject) {
      if (!subjectsMap.has(row.subject)) {
        subjectsMap.set(row.subject, { friendCount: 0, raters: new Set() });
      }
    }
  });

  // Count friends and track raters
  analysisData.forEach((row) => {
    if (subjectsMap.has(row.subject)) {
      const subjectData = subjectsMap.get(row.subject)!;
      subjectData.raters.add(row.rater);
      if (row.rater !== row.subject) {
        subjectData.friendCount++;
      }
    }
  });

  const subjectsArray = Array.from(subjectsMap.entries()).map(
    ([subject, data]) => ({
      subject,
      friendCount: data.friendCount,
      hasCurrentRater: data.raters.has(state.userName),
    }),
  );

  // Sort available subjects alphabetically as requested
  subjectsArray.sort((a, b) => a.subject.localeCompare(b.subject));

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
            />
          )}

          {appState === "survey" && (
            <Survey
              state={state}
              isLoading={isLoading}
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
              subjectsArray={subjectsArray}
              handleSwitchUser={handleSwitchUser}
              handleStartFriendSurvey={handleStartFriendSurvey}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export default App;
