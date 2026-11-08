import { randomUUID } from "node:crypto";
import type { NewQuiz, QuizRecord, QuizStore } from "../types.js";

export function createMemoryStore(): QuizStore {
  const rows: QuizRecord[] = [];

  return {
    async insert(quiz: NewQuiz): Promise<QuizRecord> {
      const record: QuizRecord = {
        id: randomUUID(),
        ...quiz,
        createdAt: new Date().toISOString(),
      };
      rows.unshift(record);
      return record;
    },
    async list(limit: number): Promise<QuizRecord[]> {
      return rows.slice(0, limit);
    },
    async get(id: string): Promise<QuizRecord | null> {
      return rows.find((row) => row.id === id) ?? null;
    },
    async remove(id: string): Promise<boolean> {
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) return false;
      rows.splice(index, 1);
      return true;
    },
  };
}
