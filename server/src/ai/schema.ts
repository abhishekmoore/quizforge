import { z } from "zod";

const questionSchema = z.object({
  type: z.enum(["short", "multiple"]),
  prompt: z.string().trim().min(1).max(500),
  choices: z.array(z.string().trim().min(1).max(200)).max(6).optional(),
  answer: z.string().trim().min(1).max(500),
  explanation: z.string().trim().min(1).max(400),
});

export const modelResultSchema = z.object({
  questions: z.array(questionSchema).length(5),
});

export type ModelResult = z.infer<typeof modelResultSchema>;

export const quizRequestSchema = z.object({
  notesText: z.string().trim().min(40).max(20000),
  title: z.string().trim().max(120).optional(),
});
