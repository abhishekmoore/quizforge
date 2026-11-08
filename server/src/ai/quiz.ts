import OpenAI from "openai";
import { heuristicQuiz } from "./heuristic.js";
import { extractJson } from "./parse.js";
import { modelResultSchema } from "./schema.js";
import type { QuizResult } from "../types.js";

const SYSTEM = `You write a short study quiz from notes the user pastes.
Return JSON only with key: questions (array of exactly 5 items).
Each item: type ("short" or "multiple"), prompt (string), choices (string[] only when type is multiple, 3-4 options), answer (string), explanation (one sentence).
Rules:
- Every prompt, choice, answer, and explanation must be supportable from the notes.
- Never invent facts, numbers, names, dates, or events that are not in the notes.
- Mix short-answer and multiple-choice. At least two of each.
- For multiple-choice the answer must be one of the choices.
- If the notes are too thin, still return five questions and say in the explanation that the notes were limited.
- Do not mention that you are a model.`;

export async function makeQuiz(input: {
  notesText: string;
  apiKey: string;
  baseURL: string;
  model: string;
}): Promise<QuizResult> {
  if (!input.apiKey) {
    return heuristicQuiz(input.notesText);
  }
  try {
    return await fromModel(input);
  } catch (error) {
    const fallback = heuristicQuiz(input.notesText);
    const message = error instanceof Error ? error.message : "model request failed";
    const first = fallback.questions[0];
    if (first) {
      first.explanation = `Model request failed (${clip(message)}). Showing the offline quiz instead. ${first.explanation}`;
    }
    return fallback;
  }
}

async function fromModel(input: {
  notesText: string;
  apiKey: string;
  baseURL: string;
  model: string;
}): Promise<QuizResult> {
  const client = new OpenAI({
    apiKey: input.apiKey,
    baseURL: input.baseURL || undefined,
  });
  const user = `NOTES:\n${input.notesText}`;
  let raw = await complete(client, input.model, user, true);
  let parsed = readModel(raw);
  if (!parsed.ok) {
    raw = await complete(
      client,
      input.model,
      `${user}\n\nThe previous reply was invalid (${parsed.reason}). Reply with one JSON object only.`,
      false,
    );
    parsed = readModel(raw);
  }
  if (!parsed.ok) {
    throw new Error(parsed.reason);
  }
  return {
    questions: parsed.value.questions,
    source: "model",
    model: input.model,
  };
}

function readModel(raw: string): { ok: true; value: ReturnType<typeof modelResultSchema.parse> } | { ok: false; reason: string } {
  try {
    const json = extractJson(raw);
    const value = modelResultSchema.parse(json);
    return { ok: true, value };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? clip(error.message) : "invalid model JSON" };
  }
}

async function complete(client: OpenAI, model: string, user: string, jsonMode: boolean): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
      ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
    });
    return response.choices[0]?.message?.content ?? "";
  } catch (error) {
    if (!jsonMode) throw error;
    const response = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    });
    return response.choices[0]?.message?.content ?? "";
  }
}

function clip(message: string): string {
  return message.replace(/\s+/g, " ").slice(0, 180);
}
