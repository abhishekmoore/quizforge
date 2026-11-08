import axios from "axios";
import type { HealthInfo, QuizRecord } from "./types";

const client = axios.create({ baseURL: "/api" });

export async function fetchHealth(): Promise<HealthInfo> {
  const { data } = await client.get<HealthInfo>("/health");
  return data;
}

export async function fetchQuizzes(): Promise<QuizRecord[]> {
  const { data } = await client.get<{ quizzes: QuizRecord[] }>("/quizzes");
  return data.quizzes;
}

export async function createQuiz(body: { notesText: string; title?: string }): Promise<QuizRecord> {
  const { data } = await client.post<{ quiz: QuizRecord }>("/quizzes", body);
  return data.quiz;
}

export async function deleteQuiz(id: string): Promise<void> {
  await client.delete(`/quizzes/${id}`);
}
