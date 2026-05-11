export type SurveyMode = "self" | "friend";

export interface SurveyState {
  userName: string;
  targetName: string;
  mode: SurveyMode;
  answers: number[];
  currentQuestionIndex: number;
}
