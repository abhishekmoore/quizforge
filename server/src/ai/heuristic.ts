import type { Question, QuizResult } from "../types.js";

const PAD = "The notes do not contain enough distinct sentences for a full quiz.";

export function heuristicQuiz(notes: string): QuizResult {
  const sentences = notes
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20)
    .slice(0, 5);

  while (sentences.length < 5) {
    sentences.push(PAD);
  }

  const questions: Question[] = sentences.map((sentence, index) => {
    const short = index % 2 === 0;
    if (short) {
      return {
        type: "short",
        prompt: `Recall what the notes say: ${clip(sentence, 48)}`,
        answer: sentence,
        explanation: "Taken directly from the pasted notes. No model was used.",
      };
    }
    return {
      type: "multiple",
      prompt: `Which statement matches the notes?`,
      choices: [clip(sentence, 80), "This is not in the notes.", "The notes say the opposite.", "Unrelated filler."],
      answer: clip(sentence, 80),
      explanation: "The first choice is a direct excerpt from the notes. No model was used.",
    };
  });

  return { questions, source: "heuristic" };
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
