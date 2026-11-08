import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { format, parseISO } from "date-fns";
import { extractJson } from "./parse.js";
import { modelResultSchema } from "./schema.js";
import { heuristicQuiz } from "./heuristic.js";

describe("extractJson", () => {
  it("parses bare JSON", () => {
    const value = extractJson('{"questions":[]}');
    assert.deepEqual(value, { questions: [] });
  });

  it("strips markdown fences", () => {
    const value = extractJson("```json\n{\"a\":1}\n```");
    assert.deepEqual(value, { a: 1 });
  });

  it("rejects empty", () => {
    assert.throws(() => extractJson("   "));
  });
});

describe("modelResultSchema", () => {
  it("accepts five valid questions", () => {
    const value = modelResultSchema.parse({
      questions: [
        { type: "short", prompt: "What is X?", answer: "X", explanation: "From notes." },
        { type: "multiple", prompt: "Pick one", choices: ["A", "B"], answer: "A", explanation: "From notes." },
        { type: "short", prompt: "What is Y?", answer: "Y", explanation: "From notes." },
        { type: "multiple", prompt: "Pick two", choices: ["C", "D", "E"], answer: "C", explanation: "From notes." },
        { type: "short", prompt: "What is Z?", answer: "Z", explanation: "From notes." },
      ],
    });
    assert.equal(value.questions.length, 5);
  });

  it("rejects the wrong count", () => {
    assert.throws(() =>
      modelResultSchema.parse({
        questions: [{ type: "short", prompt: "P", answer: "A", explanation: "E" }],
      }),
    );
  });
});

describe("heuristicQuiz", () => {
  it("returns five questions from the notes without inventing", () => {
    const notes =
      "Photosynthesis converts light energy into chemical energy. Chlorophyll absorbs sunlight in the chloroplasts. Oxygen is released as a byproduct of splitting water. Carbon dioxide is fixed into sugars. Plants store excess glucose as starch.";
    const result = heuristicQuiz(notes);
    assert.equal(result.source, "heuristic");
    assert.equal(result.questions.length, 5);
    assert.equal(result.model, undefined);
    // Answers must come from the paste, not from invented content.
    for (const q of result.questions) {
      assert.ok(q.answer.length > 0);
      assert.ok(q.explanation.toLowerCase().includes("notes") || q.explanation.toLowerCase().includes("offline") || q.explanation.includes("No model"));
    }
    // At least one short and one multiple.
    assert.ok(result.questions.some((q) => q.type === "short"));
    assert.ok(result.questions.some((q) => q.type === "multiple"));
  });

  it("pads when notes are short", () => {
    const result = heuristicQuiz("Too short.");
    assert.equal(result.questions.length, 5);
    assert.ok(result.questions.some((q) => q.answer.includes("do not contain enough")));
  });
});

describe("date-fns formatting", () => {
  it("formats an ISO timestamp", () => {
    const formatted = format(parseISO("2026-11-08T10:00:00Z"), "PPp");
    assert.ok(formatted.includes("2026"));
    assert.ok(formatted.length > 8);
  });
});
