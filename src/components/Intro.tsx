import { motion } from "framer-motion";
import { Loader2, User } from "lucide-react";
import type React from "react";

interface IntroProps {
  userName: string;
  setUserName: (name: string) => void;
  handleStartSelfSurvey: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export function Intro({
  userName,
  setUserName,
  handleStartSelfSurvey,
  isLoading,
}: IntroProps) {
  return (
    <motion.div
      key="intro"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass-panel card intro-card"
    >
      <h1 className="title">Vibe Check</h1>
      <p className="subtitle">
        Discover your personality and see how your friends see you.
      </p>

      <form onSubmit={handleStartSelfSurvey} className="intro-form">
        <div className="input-group">
          <User className="input-icon" size={20} />
          <input
            type="text"
            className="input-field with-icon"
            placeholder="Enter your name to begin..."
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
        <button
          type="submit"
          className="btn full-width"
          disabled={!userName.trim() || isLoading}
        >
          {isLoading ? (
            <Loader2 size={20} className="spin" />
          ) : (
            "Start My Survey"
          )}
        </button>
      </form>
    </motion.div>
  );
}
