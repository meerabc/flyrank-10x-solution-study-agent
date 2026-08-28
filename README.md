# Study Material Coach API

A backend service that turns course material into an adaptive quiz, with
one specific goal: never make the user wait on repeat work. New files
process in the background instead of blocking the request, and files
already processed once are served instantly from cache instead of being
reprocessed.

Built for the FlyRank Backend Track capstone, Your 10x Solution.

## The problem and the 10x claim

Processing a new file used to mean sitting and watching a terminal for
two or more minutes, unable to do anything else, since the entire slide
deck had to be read and analyzed before the request could return.
Re-processing a file already seen meant paying that same cost again.

This version fixes both. A new upload returns in well under a second
with a `processing` status, while the real work happens in the
background. Re-uploading a file already processed returns instantly from
cache instead of recomputing anything. Verified on a real 40 page
academic PDF: first processing completed in 5 minutes 46 seconds,
re-uploading the exact same file afterward returned in 0.03 seconds, a
genuine, measured result, not an estimate.

## The 5+ concepts

| Concept | Where it lives |
|---|---|
| API endpoints | `src/routes/`, `src/controllers/`, real HTTP routes with validation and honest status codes |
| Database | `src/config/db.js`, `src/models/`, SQLite schema for users, materials, concepts, questions, answer history |
| LLM integration | `src/services/gemini.service.js`, Gemini reads slide text and images, generates concepts and questions |
| Caching | `src/controllers/material.controller.js`, a file's content hash is checked before any processing starts |
| Background jobs | `src/controllers/material.controller.js`, upload responds immediately, processing continues after the response is sent |
| Authentication | `src/middleware/require-auth.js`, JWT protected routes, every material and answer scoped to its owner |

No swaps used. All 6 concepts come from the program's first table.

## Tech stack

- Node.js and Express
- SQLite via better-sqlite3
- Google Gemini API (free tier, no credit card)
- bcrypt and jsonwebtoken for authentication
- zod for request validation

## Setup

Requires Node.js 18 or later and a free Gemini API key from
https://aistudio.google.com/.

```
git clone https://github.com/meerabc/flyrank-10x-solution-study-agent.git
cd flyrank-10x-solution-study-agent
npm install
```

Create a `.env` file (copy `.env.example`):

```
PORT=3000
JWT_SECRET=replace-with-a-long-random-string
GEMINI_API_KEY=your-real-gemini-key
```

Seed a demo user:

```
node scripts/seed.js
```

Start the server:

```
npm start
```

## The 5 minute demo path

1. Log in as the seeded demo user:
   ```
   POST /api/auth/login
   { "email": "demo@example.com", "password": "demo1234" }
   ```
   Copy the returned token.

2. Upload a PDF or PPTX file, base64 encoded, as JSON:
   ```
   POST /api/materials
   Authorization: Bearer <token>
   { "fileName": "lecture.pdf", "fileData": "<base64 string>" }
   ```
   Note the response returns almost instantly with `status: "processing"`,
   this is the background job concept in action.

3. Poll status until it flips to `done`:
   ```
   GET /api/materials/:id
   Authorization: Bearer <token>
   ```

4. Get quiz questions once processing is done:
   ```
   GET /api/materials/:id/quiz
   Authorization: Bearer <token>
   ```

5. Submit an answer:
   ```
   POST /api/materials/:id/answers
   Authorization: Bearer <token>
   { "questionId": 1, "wasCorrect": false }
   ```

6. Upload the exact same file again. This time it returns instantly with
   `cached: true`, no reprocessing, this is the caching concept and the
   actual 10x claim, shown directly.

## API reference

| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Create an account |
| POST | /api/auth/login | Log in, returns a token |
| POST | /api/materials | Upload a file, processes in the background, or returns cached results |
| GET | /api/materials/:id | Check processing status |
| GET | /api/materials/:id/quiz?count=5 | Get quiz questions, weakest concepts first |
| POST | /api/materials/:id/answers | Log whether an answer was correct |

## Limitations, honestly

- Gemini's free tier has real per minute rate limits. Processing paces
  requests roughly 10 seconds apart to stay under them, and any request
  that still hits a rate limit automatically waits and retries up to 4
  times before giving up, using the retry delay Google's own API response
  specifies. A full 40 page file processes successfully in roughly 5 to 6
  minutes on this free tier. The improvement this capstone delivers is
  not that processing itself got faster, it is that the request no
  longer blocks waiting for it, and re-processing anything already seen
  is instant.
- Answers are self reported (`wasCorrect` sent by the client) rather than
  automatically graded, since these are open ended questions where
  correct answers can be phrased many ways.
- Background jobs run in process rather than through a dedicated job
  queue like BullMQ or Redis. This is a deliberate scope choice for a
  single server instance; a production version serving many concurrent
  users would need a real queue.
- Only PDF and PPTX are supported.
- File uploads are sent as base64 in a JSON body rather than multipart
  form data, kept simple deliberately since this is an API-first project
  with no file upload form.

## Built with AI

Built with Claude as a coding and design partner, reusing and adapting
proven logic (ingestion, extraction, question generation) from an earlier
personal agent project, then wrapping it in a real backend with caching,
background processing, and authentication. Real issues were hit and
fixed during this build: a payload size limit needed raising for
base64-encoded files, a caching check that could have served a failed
run as if it succeeded needed correcting, and a rate limit miscalculation
(3 second pacing was mathematically insufficient for a 15 requests per
minute limit at 2 calls per unit) needed fixing to 8 seconds. Full detail
in `BUILDLOG.md`.