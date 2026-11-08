# QuizForge

QuizForge turns pasted study notes into a five-question quiz.

It is a small TypeScript MERN app: React, Express, MongoDB, and an OpenAI-compatible model. If you do not set a model key, it still runs. The screen is labeled as an offline quiz, not as a model judgment.

The UI hides answers until you reveal them. You can step through questions and save the quiz.

## What you can do

- Paste notes (or load the built-in sample).
- Get five mixed short-answer and multiple-choice questions, each with an answer and a one-line explanation.
- Hide answers until you choose to reveal them.
- Save each quiz and reopen it later.
- Delete a quiz you do not want to keep.

Questions are drawn only from the notes. The model prompt forbids invented facts. The offline checker does the same.

## Stack

| Piece | Choice |
| --- | --- |
| UI | React 19, TypeScript, Vite, Tailwind CSS |
| Client data | TanStack Query, axios, zustand, date-fns |
| API | Express 4, TypeScript, Zod, helmet, cors |
| Data | MongoDB via Mongoose, or an in-memory store |
| Model | `openai` SDK against any compatible base URL |
| Tests | `node:test` through `tsx` |

## Run it

Node 20 or newer.

```bash
cp .env.example .env
npm install
npm run dev
```

Open the Vite URL printed in the terminal (port 5173). The API is on port 4000. Vite proxies `/api` to it.

Production-style, one process:

```bash
npm run build
npm start
```

Then open port 4000. Express serves the built React app.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | API port. Default `4000`. |
| `MONGO_URI` | No | Example: `mongodb://127.0.0.1:27017/quizforge`. If empty, quizzes live in memory and vanish when the process stops. |
| `OPENAI_API_KEY` | No | If empty, QuizForge uses the offline quiz. |
| `OPENAI_BASE_URL` | No | Use this for xAI, Groq, OpenRouter, or a local server. |
| `OPENAI_MODEL` | No | Default `gpt-4o-mini`. |

Do not commit `.env`.

## API

`GET /api/health` — `{ ok, store: "memory" \| "mongo", ai: "model" \| "heuristic", model }`

`GET /api/quizzes?limit=20` — newest first, limit 1–50.

`POST /api/quizzes` — body `{ notesText, title? }`. `notesText` must be 40–20,000 characters. Returns the saved quiz.

`GET /api/quizzes/:id`

`DELETE /api/quizzes/:id` — `204` when removed.

## Scripts

```bash
npm test
npm run typecheck
npm run build
```

GitHub Actions runs those three on every push.

## Limits

- The offline quiz is a simple extraction of sentences from the paste. It is not a teaching model.
- The model can still be wrong. Read the notes yourself before you trust a question.
- There is no login. Anyone who can reach the server can read saved notes. Do not point this at the public internet with private study material.

Design notes for someone changing the code are in [DEVELOPER.md](DEVELOPER.md).
