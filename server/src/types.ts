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

export interface NewQuiz {
  title: string;
  notesText: string;
  result: QuizResult;
}

export interface QuizStore {
  insert(quiz: NewQuiz): Promise<QuizRecord>;
  list(limit: number): Promise<QuizRecord[]>;
  get(id: string): Promise<QuizRecord | null>;
  remove(id: string): Promise<boolean>;
}

export interface HealthInfo {
  ok: true;
  store: "memory" | "mongo";
  ai: "model" | "heuristic";
  model: string | null;
}
