import { Router } from "express";
import { makeQuiz } from "../ai/quiz.js";
import { quizRequestSchema } from "../ai/schema.js";
import type { AppEnv } from "../env.js";
import type { QuizStore } from "../types.js";

export function quizzesRouter(store: QuizStore, env: AppEnv) {
  const router = Router();

  router.get("/", async (req, res) => {
    const limit = clampLimit(req.query.limit);
    const quizzes = await store.list(limit);
    res.json({ quizzes });
  });

  router.post("/", async (req, res) => {
    const parsed = quizRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Notes must be 40–20,000 characters." });
      return;
    }
    const result = await makeQuiz({
      notesText: parsed.data.notesText,
      apiKey: env.openAiKey,
      baseURL: env.baseURL,
      model: env.model,
    });
    const quiz = await store.insert({
      title: parsed.data.title?.trim() || "",
      notesText: parsed.data.notesText,
      result,
    });
    res.status(201).json({ quiz });
  });

  router.get("/:id", async (req, res) => {
    const quiz = await store.get(req.params.id);
    if (!quiz) {
      res.status(404).json({ error: "Quiz not found." });
      return;
    }
    res.json({ quiz });
  });

  router.delete("/:id", async (req, res) => {
    const removed = await store.remove(req.params.id);
    if (!removed) {
      res.status(404).json({ error: "Quiz not found." });
      return;
    }
    res.status(204).end();
  });

  return router;
}

function clampLimit(raw: unknown): number {
  const n = Number(raw ?? 20);
  if (!Number.isFinite(n)) return 20;
  return Math.min(50, Math.max(1, Math.floor(n)));
}
