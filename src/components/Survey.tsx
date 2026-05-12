import { motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type React from "react";
import { questions } from "../data";
import type { SurveyState } from "../types";

interface SurveyProps {
  state: SurveyState;
  isLoading: boolean;
  handleStartOver: () => void;
  handleSliderChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePrev: () => void;
  handleNext: () => void;
  handleSubmit: () => void;
}

export function Survey({
  state,
  isLoading,
  handleStartOver,
  handleSliderChange,
  handlePrev,
  handleNext,
  handleSubmit,
}: SurveyProps) {
  return (
    <motion.div
      key="survey"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="glass-panel card survey-card"
    >
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{
            width: `${((state.currentQuestionIndex + 1) / questions.length) * 100}%`,
          }}
        />
      </div>

      <div className="survey-header">
        <span className="question-count">
          Question {state.currentQuestionIndex + 1} of {questions.length}
        </span>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {state.mode === "friend" && (
            <span className="target-badge">
              Answering for {state.targetName}
            </span>
          )}
          <button
            onClick={handleStartOver}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              fontSize: "0.85rem",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {state.mode === "friend" ? "Cancel" : "Start Over"}
          </button>
        </div>
      </div>

      <div className="question-container">
        <h2 className="question-text">
          {questions[state.currentQuestionIndex].question}
        </h2>
      </div>

      <div className="slider-section">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "-8px",
          }}
        >
          <span className="slider-value">
            {state.answers[state.currentQuestionIndex]}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={state.answers[state.currentQuestionIndex]}
          onChange={handleSliderChange}
          className="custom-slider"
        />

        <div className="labels-container">
          <div className="label left-label">
            {questions[state.currentQuestionIndex].answers[0]}
          </div>
          <div className="label center-label">
            {questions[state.currentQuestionIndex].answers[1]}
          </div>
          <div className="label right-label">
            {questions[state.currentQuestionIndex].answers[2]}
          </div>
        </div>
      </div>

      <div className="survey-footer">
        <button
          className={`icon-btn ${state.currentQuestionIndex === 0 ? "hidden" : ""}`}
          onClick={handlePrev}
        >
          <ChevronLeft size={24} />
        </button>

        {state.currentQuestionIndex < questions.length - 1 ? (
          <button className="btn next-btn" onClick={handleNext}>
            Next <ChevronRight size={20} />
          </button>
        ) : (
          <button
            className="btn submit-btn"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 size={20} className="spin" />
            ) : (
              <>
                Submit <Check size={20} />
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
