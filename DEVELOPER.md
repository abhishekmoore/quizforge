# Developer notes

This file is the map of the code. Read it before changing a route or the prompt. The product explanation for someone running the app is in [README.md](README.md).

## Shape

Two packages, one repo, npm workspaces.

```text
client/     React + Vite + Tailwind. Talks only to /api.
server/     Express. Owns validation, the model, and storage.
```

The client does not import server files. The quiz contract is duplicated in `client/src/types.ts` and `server/src/types.ts` on purpose. A shared package would be a third workspace for one interface. If you add a field, change both types and the Zod schema that actually enforces the model output.

```mermaid
flowchart LR
  UI[React desk] -->|POST /api/quizzes| API[Express router]
  API --> Zod[Zod request check]
  Zod --> AI{API key set?}
  AI -->|yes| Model[OpenAI-compatible chat]
  AI -->|no| Heuristic[Sentence quiz]
  Model --> Store[(Mongo or memory)]
  Heuristic --> Store
  Store --> UI
```

## Request path

1. `client/src/App.tsx` submits the form through `client/src/api.ts` (axios).
2. `server/src/routes/quizzes.ts` parses the body with `quizRequestSchema`. A failed parse is a 400 with one sentence, not the raw Zod tree.
3. `makeQuiz` in `server/src/ai/quiz.ts` either calls the model or `heuristicQuiz`.
4. The store inserts the input plus the result. The response is the saved record, including its id, so the UI can select it without a second fetch.
5. Errors from the store or an unexpected throw hit the handler in `server/src/app.ts` and become a 500 `{ error }`.

`GET /api/health` is how the header knows whether it is showing a model name or the words "offline quiz". The handler does not return the API key.

## Model contract

`modelResultSchema` is the only shape we accept from a model:

- `questions` array of exactly 5 items
- each item: `type` (`"short"` or `"multiple"`), `prompt` string, optional `choices` string[], `answer` string, `explanation` string

`source` and `model` are set by our code after parsing. The model is not allowed to claim it is the offline checker, and the offline checker is not allowed to claim it is a model.

Flow inside `fromModel`:

1. Ask with `response_format: json_object`.
2. If that flag is rejected by the provider, retry the same prompt without it.
3. Strip optional markdown fences in `extractJson` and run Zod.
4. On invalid JSON, ask once more, quoting a clipped reason.
5. If that still fails, or the HTTP call fails, return the heuristic result and put the failure in the first explanation. The user still gets a saved quiz, and the badge still says the result is offline.

The system prompt's important rule: every question, answer, and explanation must be supportable from the notes. Do not invent facts, numbers, names, or events that are not in the paste. That is the behavior you should be able to defend in an interview. The code does not have a second checker that proves the model obeyed. Zod checks shape, not truth.

Temperature is `0.2` so repeated runs on the same notes stay closer.

## Offline checker

`heuristicQuiz` is not a miniature model. It does three things:

- Splits the notes on sentence boundaries and keeps the first five reasonably long sentences.
- Pads with a short honest note if there are fewer than five.
- Builds a mix of short-answer and multiple-choice questions whose answers are the sentences themselves.

It never invents content that is not in the paste.

## Storage

`QuizStore` in `server/src/types.ts` is the seam: `insert`, `list`, `get`, `remove`.

- `createMemoryStore` keeps an array in the process. Newest first. Used when `MONGO_URI` is empty so `npm run dev` works with zero infrastructure. Data dies with the process. Say that out loud if you demo it.
- `createMongoStore` connects with Mongoose and maps `_id` to `id` at the edge. Callers never see an ObjectId. Invalid ids return null instead of throwing, so a bad id is a 404.

`connectStore` is the only place that chooses. Routes take a `QuizStore`, which is why `memory.test.ts` does not need a database.

Documents are not user-scoped. There is no account system. Do not store real private notes on a shared server until that exists.

## UI

`App` holds the form and the selected quiz id. Server state lives in TanStack Query (`queryKey: ["quizzes"]`). After a create or delete the mutation invalidates that key. There is no second copy of the list in `useState`.

The selected quiz is an id into the list, not a second copy, so a delete cannot leave a stale detail on screen.

Client-only quiz navigation lives in a zustand store (`client/src/store.ts`): the current question index and which answers have been revealed. Switching quizzes resets it. Server state stays in React Query.

`Load sample` fills the same fields a student would paste. It does not skip the API. You can watch the network call.

Styles are Tailwind utilities. There is no hand-written CSS design system.

## Library notes

- **Tailwind CSS** (`@tailwindcss/vite`): all UI styling. Used throughout `client/src/App.tsx`. Interview question: how do you style a React app without a large CSS file or a component library?
- **date-fns**: every timestamp the user sees. `formatWhen` and `formatRelative` in `client/src/dates.ts` call `format` and `formatDistanceToNow`. Example: `format(parseISO("2026-11-08T10:00:00Z"), "PPp")` returns a localized date and time such as "Nov 8, 2026, 10:00 AM". Interviewers still say "moment"; the answer is: Moment is legacy, mutable, and heavy; this repo uses date-fns.
- **axios**: every API call. `client/src/api.ts` creates a client with `baseURL: "/api"` and uses `get`/`post`/`delete`. Interview question: how do you make HTTP requests from the browser without raw `fetch`?
- **TanStack Query**: loading, creating, and deleting server data. `useQuery({ queryKey: ["quizzes"], queryFn: fetchQuizzes })` and `useMutation` that calls `invalidateQueries`. Interview question: how do you keep server state out of a second `useState` copy?
- **Zod**: request bodies and model JSON. `quizRequestSchema` and `modelResultSchema` in `server/src/ai/schema.ts`. Interview question: how do you validate untrusted JSON before you trust it?
- **helmet**: basic Express security headers. `app.use(helmet())` in `server/src/app.ts`. Interview question: what is the first middleware you add for Express security headers?
- **zustand**: featured extra. Holds which answers are revealed and the current question index in `client/src/store.ts` (`useQuizUi`). Interview question: how do you keep small client-only UI state out of a global Redux store and out of React Query?

Redux Toolkit is for a large shared client cache this app does not have. Server state stays in React Query; quiz navigation is zustand; the form is local `useState`.

## Tradeoffs

- In-memory fallback makes the repo runnable in a portfolio review. It is the wrong store for anything private or multi-instance.
- Falling back to the heuristic when the model fails keeps the demo alive. It can also hide a bad key. The explanation string is the signal. The health badge is the other one.
- Duplicated types will drift if you only edit one side. The API response is the runtime contract. TypeScript will not catch a client that forgot a new field until you use it.
- `Mixed` for the Mongo result is deliberate. The result shape is owned by Zod at write time. A rigid Mongoose subschema would reject old rows the moment the JSON gained a key.
- Hiding answers until reveal is a client concern. The answers are already in the saved record; a determined user can see them in the network response. That is acceptable for a study tool.

## Interview walkthrough

If someone asks you to explain this repo, walk this path and stop where they interrupt:

1. The UI never calls a model. It only posts text to Express via axios.
2. Zod rejects short or huge payloads before any token is spent.
3. The model must return JSON. We parse it, check it, and retry once.
4. We label heuristic results so a missing API key cannot look like GPT.
5. Mongo is optional behind a store interface. Tests hit the memory implementation.
6. Answers stay hidden until reveal via a small zustand store. Server state stays in React Query.
7. There is no auth, so the README tells you not to deploy it with private notes.

## What I would not add next without a reason

Login, spaced repetition, or a question bank that grows across sessions. Each one is a new product. The current gap that matters is the quality of the questions, not more screens.
