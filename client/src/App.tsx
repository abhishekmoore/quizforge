import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createQuiz, deleteQuiz, fetchHealth, fetchQuizzes } from "./api";
import { formatRelative, formatWhen } from "./dates";
import { SAMPLE_NOTES, SAMPLE_TITLE } from "./sample";
import { useQuizUi } from "./store";
import type { Question, QuizRecord } from "./types";

export function App() {
  const queryClient = useQueryClient();
  const health = useQuery({ queryKey: ["health"], queryFn: fetchHealth });
  const quizzes = useQuery({ queryKey: ["quizzes"], queryFn: fetchQuizzes });

  const [notesText, setNotesText] = useState("");
  const [title, setTitle] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const resetUi = useQuizUi((s) => s.reset);

  const create = useMutation({
    mutationFn: createQuiz,
    onSuccess: (quiz) => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      setSelectedId(quiz.id);
      setFormError(null);
      resetUi();
    },
    onError: (error: Error) => {
      setFormError(error.message);
    },
  });

  const remove = useMutation({
    mutationFn: deleteQuiz,
    onSuccess: (_void, id) => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      if (selectedId === id) setSelectedId(null);
    },
  });

  const selected = quizzes.data?.find((q) => q.id === selectedId) ?? null;

  useEffect(() => {
    resetUi();
  }, [selectedId, resetUi]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    create.mutate({ notesText, title: title.trim() || undefined });
  }

  function loadSample() {
    setNotesText(SAMPLE_NOTES);
    setTitle(SAMPLE_TITLE);
  }

  const aiLabel =
    health.data?.ai === "model" && health.data.model
      ? `model: ${health.data.model}`
      : "offline quiz";

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">QuizForge</h1>
            <p className="text-sm text-stone-500">Paste notes. Get five questions. Reveal when ready.</p>
          </div>
          <div className="text-right text-xs text-stone-500">
            <div>{health.isPending ? "checking…" : aiLabel}</div>
            <div>{health.data?.store === "mongo" ? "mongo" : "memory"}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-6 py-8 md:grid-cols-[1fr_280px]">
        <section className="space-y-6">
          <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">New quiz</h2>
              <button
                type="button"
                onClick={loadSample}
                className="text-sm text-stone-600 underline-offset-2 hover:underline"
              >
                Load sample
              </button>
            </div>
            <label className="block text-sm">
              Title (optional)
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
                placeholder="Chapter 4 — photosynthesis"
              />
            </label>
            <label className="block text-sm">
              Notes
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                required
                minLength={40}
                rows={8}
                className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
                placeholder="Paste study notes…"
              />
            </label>
            {formError && <p className="text-sm text-red-700">{formError}</p>}
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {create.isPending ? "Writing quiz…" : "Make quiz"}
            </button>
          </form>

          {selected && <QuizView quiz={selected} />}
        </section>

        <aside>
          <h2 className="mb-3 text-sm font-medium text-stone-700">Saved quizzes</h2>
          {quizzes.isPending && <p className="text-sm text-stone-500">Loading…</p>}
          {quizzes.isError && <p className="text-sm text-red-700">Could not load quizzes.</p>}
          <ul className="space-y-2">
            {quizzes.data?.map((quiz) => (
              <li key={quiz.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(quiz.id)}
                  className={`w-full rounded border px-3 py-2 text-left text-sm ${
                    selectedId === quiz.id
                      ? "border-stone-900 bg-stone-100"
                      : "border-stone-200 bg-white hover:border-stone-400"
                  }`}
                >
                  <div className="font-medium">{quiz.title || "Untitled quiz"}</div>
                  <div className="text-xs text-stone-500">
                    {formatWhen(quiz.createdAt)} · {formatRelative(quiz.createdAt)}
                  </div>
                  <div className="text-xs text-stone-500">
                    {quiz.result.source === "model" ? "model" : "offline"} · {quiz.result.questions.length} questions
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => remove.mutate(quiz.id)}
                  disabled={remove.isPending}
                  className="mt-1 text-xs text-stone-500 hover:text-red-700"
                >
                  Delete
                </button>
              </li>
            ))}
            {quizzes.data?.length === 0 && <li className="text-sm text-stone-500">None yet.</li>}
          </ul>
        </aside>
      </main>
    </div>
  );
}

function QuizView({ quiz }: { quiz: QuizRecord }) {
  const currentIndex = useQuizUi((s) => s.currentIndex);
  const revealed = useQuizUi((s) => s.revealed);
  const setIndex = useQuizUi((s) => s.setIndex);
  const reveal = useQuizUi((s) => s.reveal);

  const questions = quiz.result.questions;
  const q = questions[currentIndex];
  if (!q) return null;

  const isRevealed = Boolean(revealed[currentIndex]);
  const badge = quiz.result.source === "model" ? `model${quiz.result.model ? `: ${quiz.result.model}` : ""}` : "offline quiz";

  return (
    <div className="space-y-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-medium">{quiz.title || "Untitled quiz"}</h2>
          <p className="text-xs text-stone-500">
            {formatWhen(quiz.createdAt)} · {badge}
          </p>
        </div>
        <span className="text-sm text-stone-500">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      <QuestionCard question={q} revealed={isRevealed} onReveal={() => reveal(currentIndex)} />

      <div className="flex gap-2">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => setIndex(currentIndex - 1)}
          className="rounded border border-stone-300 px-3 py-1 text-sm disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={currentIndex >= questions.length - 1}
          onClick={() => setIndex(currentIndex + 1)}
          className="rounded border border-stone-300 px-3 py-1 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  revealed,
  onReveal,
}: {
  question: Question;
  revealed: boolean;
  onReveal: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-wide text-stone-500">{question.type}</div>
      <p className="text-base leading-relaxed">{question.prompt}</p>
      {question.type === "multiple" && question.choices && (
        <ul className="list-inside list-disc space-y-1 text-sm text-stone-700">
          {question.choices.map((choice, i) => (
            <li key={i}>{choice}</li>
          ))}
        </ul>
      )}
      {!revealed ? (
        <button
          type="button"
          onClick={onReveal}
          className="rounded bg-stone-100 px-3 py-1 text-sm font-medium hover:bg-stone-200"
        >
          Reveal answer
        </button>
      ) : (
        <div className="space-y-1 rounded bg-amber-50 p-3 text-sm">
          <p>
            <span className="font-medium">Answer:</span> {question.answer}
          </p>
          <p className="text-stone-700">
            <span className="font-medium">Why:</span> {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
