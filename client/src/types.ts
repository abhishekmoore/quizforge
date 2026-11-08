export type ResultSource = "model" | "heuristic";

export type QuestionType = "short" | "multiple";

export interface Question {
  type: QuestionType;
  prompt: string;
  choices?: string[];
  answer: string;
  explanation: string;
}

export interface QuizResult {
  questions: Question[];
  source: ResultSource;
  model?: string;
}

export interface QuizRecord {
  id: string;
  title: string;
  notesText: string;
  result: QuizResult;
  createdAt: string;
}

export interface HealthInfo {
  ok: true;
  store: "memory" | "mongo";
  ai: "model" | "heuristic";
  model: string | null;
}
