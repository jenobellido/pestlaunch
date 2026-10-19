# PestLaunch Call Intelligence

Turns pest control phone calls into a transcript, call type, outcome,
scorecard grade and coaching for the employee, and shows the owner where
calls are leaking money.

Built with Next.js 16, Supabase (Postgres, Auth, Storage) and Drizzle. See
[ARCHITECTURE.md](ARCHITECTURE.md) for how the code is organized.

## What it does

| The brief asks to… | Where it is |
| --- | --- |
| Process a call recording | **Calls**: drag in an MP3, WAV or M4A (up to 50 MB). It uploads straight to private storage and processes in the background, with live progress. Failed calls can be retried. |
| View the transcript | **Call page**: speaker-labelled transcript, synced to an audio player (click a line to jump), with search. |
| See what type of call it was | New customer, Scheduling, Billing, Re-service, Retention or Other, defined from the call manuals; grouped like PestLaunch's Call Log (Sales, Service, Billing, Retention, Other). |
| See the important outcome and details | Summary, resolution (booked, saved, cancelled, resolved, follow-up needed, unresolved), key facts (pest, price quoted, appointment…), open follow-ups and, for cancel calls, the reason. |
| See the PestLaunch score or grade | All Calls, Retention and Sales scorecards from the manuals. Every item shows pass or fail with a quote from the call, checked against the transcript, or the reason it was missed. Points and grade (Gold, Green, Below) are computed in code. Each company can edit these, add its own call types and scorecards, or have uploaders pick the type (Settings → Call types). |
| See coaching for the employee | Per call: strengths, up to 3 improvements with the words to say next time, and one focus. **Team** and each **rep's page**: average score, trend, the steps they miss most with what good sounds like (from the manual), and **Plays** a manager can assign. |
| (beyond the brief) Customer sentiment | **Call page**: which parts of the call were positive, neutral or negative (a lane under the player), the customer's mood over the call, where it turned (upset, calmed down) with their words and a link that jumps the player there, and whether they ended happier than they started. |
| (beyond the brief) Follow up | **Follow-ups**: everything you've been asked to follow up on (Mine / Team, Open / Done), with a count in the sidebar, and leaks that still need an owner, assigned in one click. |
| Review all calls and results | **⌘K quick search** from any page jumps to a call, customer, rep or page, matching what was said too. **Search** inside every transcript ("termites") and **export** calls to CSV. **Overview**: close rate, cancels saved, follow-ups open, average score, a **Leaks** list of calls that lost money or need action (assign one to a teammate and it shows on their Overview, as a badge in the sidebar, and on the call), reps, and cancel reasons, for 7 days, 30 days or all time. **Calls**: filter by outcome, type, rep and date, and search. |

Every AI result can be **reviewed and corrected** by a manager (call type,
outcome, any scorecard step, with a note). The grade recalculates, uncertain
calls are flagged **Needs review**, and corrected calls show who reviewed
them.

Beyond the brief, it's ready for a real team:

- **Example data:** a new company can load 7 made-up calls and 3 example
  reps (who can't sign in), already scored and coached, with follow-ups and
  coaching plays, to see every page working before uploading its own. Remove
  it anytime (Overview, or Settings → Company). No AI runs.
- A **Get set up** checklist on the Overview walks a new company through
  its first call, inviting the team, checking a score and assigning a
  follow-up. Steps tick off from what's actually in the workspace.
- Invite people with a link.
- Permission-based roles, with custom roles.
- Calls belong to the rep who made them.
- Reps only see their own calls.
- A landing page at `/` with a 3D hero (react-three-fiber), in both themes.

## How it works

1. The browser uploads the recording to a private Supabase bucket with a
   one-time signed URL, so files never pass through the API.
2. In the background, Whisper transcribes the call. A language model labels
   who's speaking, then classifies the call and extracts the outcome. The
   scorecard and coaching steps run in parallel. Each stage is saved as it
   finishes.
3. All model output is strict JSON checked against a schema. Quotes are only
   shown if they really appear in the transcript, and the grade maths is
   deterministic.

Key decisions:

- **Accuracy you can check:** every score cites the employee's own words.
- **Modules:** Calls, Scorecards and Coaching can each be switched on or off
  per company.
- **Pluggable AI:** the client speaks to any OpenAI-compatible provider.
- **Private call data:** recordings and customer data never leave private
  storage, and card details read out on a call are masked before the
  transcript is saved or sent to a language model.

## Accuracy

All 20 test recordings were run on OpenAI (`whisper-1`, `gpt-5.5`), and
every result was checked by hand against the transcript and the call
manuals, three times: before the fixes below, after the first round, and
after the second.

Since then, coaching and sentiment moved to the cheaper `gpt-5.4-mini` after
a side-by-side test on invented calls (see "AI models" in ARCHITECTURE.md).
The 20 real calls weren't re-run on it. Scoring, call type and outcome, and
the speaker labels they depend on, still use `gpt-5.5`.

| What | First check | Final check |
| --- | --- | --- |
| Call type | 19 of 20 | 19 of 20 |
| Outcome (resolution) | 19 of 20 | 19 of 20 |
| Follow-ups fully right | 10 of 20 | 14 of 20 |
| Key details fully right | 7 of 20 | 13 of 20 |
| Scorecard steps | 95% | see below |

The "Below Standard" grades are right on every call: even after
correcting disputed steps, none reaches Green. The reps really do skip steps
such as thanking the customer (2 of 19 calls) and voicing empathy (3 of 18).

Scorecard steps agreed 95% in the first check, but the misses were mostly
lenient: one quoted line earning two steps. Enforcing "one line, one step"
in code first went too far (91%, mostly harsh), because it kept the credit
on the earlier step; it now gives it to the later one, and scheduling clashes
no longer count as sales objections. Re-scored with that fix, 18 of the 19
scored calls match the hand-checked score exactly (11) or within a point
(7); the other is 2 points under.

Fixed along the way:

- **Lost speech.** A silence filter tuned for Groq dropped 25–60 seconds of
  real speech on 9 calls. It now uses Whisper's own rule, plus guards
  against Whisper's repetition loops.
- **A card number in a transcript.** Card details are now masked before
  anything is stored or sent to a model (see ARCHITECTURE.md).
- **Missed follow-ups:** promises such as notes for the technician or
  payment at the visit are now extracted even on booked calls, written as
  the office's own tasks.
- **A quote that didn't book was marked resolved.** It's now follow-up
  needed.
- **Coaching** no longer invents placeholder prices, and a call where the
  rep never speaks gets no coaching.

Still known: Whisper's output varies between runs (two uploads of the same
voicemail gave different text), names are often misheard (the team-list hint
can't be tested on these recordings, which come from other companies), and
two saved transcripts still have a swapped speaker on one exchange.

## Local setup

Requires Node 22+ and Docker.

```bash
npm install
cp .env.example .env.local
npm run db:start      # starts Supabase in Docker; prints the keys for .env.local
npm run db:migrate    # applies migrations in drizzle/
npm run dev
```

Put an OpenAI API key in `AI_API_KEY` in `.env.local`; transcription
(`whisper-1`) and the AI steps use it. Scoring, call analysis and speaker
labels use `gpt-5.5`; coaching and sentiment use the cheaper
`gpt-5.4-mini`, which matched it in testing (see "AI models" in
ARCHITECTURE.md). The AI client works with any OpenAI-compatible API: to use Groq
instead, set `AI_BASE_URL`, the model names and a Groq key as shown in
`.env.example`. No code changes are needed.

Open http://localhost:3000 and create an account. On a deployed app, set
`SIGNUP_CODE`: creating a new company then needs that access code, so the
app isn't open to anyone, while invite links still work without it. Locally, email confirmation
is off and confirmation emails are caught by Mailpit at http://127.0.0.1:56424.

This project uses ports 56420–56429, so it can run beside other local
Supabase projects on the default 543xx ports.

| URL | What |
| --- | --- |
| http://localhost:3000 | App |
| http://127.0.0.1:56423 | Supabase Studio |
| http://127.0.0.1:56424 | Mailpit (local email) |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run typecheck` | Generate route types and run tsc |
| `npm run lint` | ESLint, including architecture import rules |
| `npm test` | Unit tests (Vitest), once. `npm run test:watch` re-runs them on save |
| `npm run db:start` / `db:stop` | Start or stop the local Supabase stack |
| `npm run db:generate` | Create a migration from changes to `core/db/schema.ts` or a module's `server/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:reset` | Wipe the local database and re-apply all migrations |
| `npm run db:studio` | Drizzle Studio |
| `npm run seed:demo -- <company>` | Adds 7 invented demo calls (every call type and outcome) to a company and runs them through analysis, scoring and coaching. No real call data; no audio. |

CI (`.github/workflows/ci.yml`) runs `npm ci`, typecheck, lint and the unit
tests on Node 22 for every push and pull request. None of them need a
database or env vars.

## Settings

Each workspace has Settings (`/<company>/settings`, at the bottom of the
sidebar), split into pages with a settings menu:

- **Profile:** your display name; your email and role are shown read-only.
- **Appearance:** System, Light or Dark, picked from preview cards. Saved in
  a cookie on this browser.
- **Company:** the company name (needs `company.manage`; the URL doesn't
  change) and **Modules**: turn Scorecards and Coaching on or off for the
  whole company (needs `modules.manage`). Calls is the base module and is
  always on.
- **Members:** everyone in the company and their role. Invite someone by
  email and role, and copy the link to send them (needs `team.manage`).
- **Roles:** what each role can do, with custom roles (needs `roles.manage`).
  Every company starts with Owner, Manager and Rep.
- **Call types:** how calls get their type (Automatic, or Ask on upload)
  and each kind of call with its scorecard (needs `calltypes.manage`). The
  manuals' types and scorecards are the defaults: edit them, turn them off,
  reset them, or add your own. **Create with AI** drafts a new type and its
  scorecard from a description or a pasted part of your manual, for you to
  review before saving.

## Known limitations

- Speaker labels come from a language model reading the transcript, not from
  the audio, so they're occasionally swapped, mostly where two people talk
  over each other. When a segment is split between speakers, the split's
  timestamps are estimated from text length.
- OpenAI's transcription API caps audio files at 25 MB, but the app accepts
  up to 50 MB, so a very long WAV fails at transcription. MP3s of normal
  calls are far smaller (a 20-minute call is about 10 MB). Splitting long
  files would remove the limit.
- Processing a call takes about 20 seconds to 4 minutes on OpenAI.
  Each call makes several chat requests (speaker labels, analysis, then
  scoring, coaching and sentiment at once). The account's current limits
  (5,000 requests a minute) are far above that, but OpenAI's lowest usage
  tier allows only a few requests a minute; there, processing several calls
  at once can hit the limit.
- A rate limit that would take more than a minute to clear fails the call
  with a message saying when to retry, and an empty prepaid balance fails it
  with "out of credits". Processing has a 5-minute ceiling, so it can't wait
  longer; a job queue would queue such calls instead.
- Processing runs in the background with Next's `after()`, not a durable job
  queue. If the server stops mid-way, the call shows as failed after 10
  minutes and can be retried. A queue (e.g. Inngest or a database-backed
  worker) would resume automatically.
- Search and filters on the call library run in the browser over every call.
  That's fine for hundreds of calls; thousands will need paging on the server.
- Invites are links the inviter copies and sends; the app doesn't email them.
- "Work it out from the call" matches the heard employee name to a member by
  first name only, and leaves the call unassigned when no single member
  matches. It can be reassigned on the call page.
- There are no sub-teams inside a company yet (e.g. a manager who only sees
  their own reps). Roles are company-wide.
- The theme is saved per browser, not per account.
- Sentiment is read from the transcript's words, not the tone of voice, so
  sarcasm or a flat "fine" can read differently from how it sounded. It adds
  about one cent to a typical call (one small AI request). Calls processed
  before it existed have no sentiment until they're re-run.

## Next steps

1. Turn the hand check into a saved answer key (call type, outcome,
   follow-ups and each scorecard step per call) and a script that scores
   every prompt change against it, then finish the second accuracy pass.
2. Notify people when a follow-up is assigned to them (email or SMS), and
   alert the owner when a new leak appears.
3. Send sales calls to the PestLaunch CRM as leads (there's deliberately no
   second pipeline here), link callers to customers there, and import calls
   automatically from the phone system instead of uploading them.
4. A durable job queue for processing, and paging on the server for large
   call libraries.
5. Deploy.

## Call data

The call recordings used to test this are real customer calls. They are never
committed to this repository. Keep them outside the repo or in private storage.
Uploaded recordings live only in the private `recordings` bucket, and deleting
a call deletes its recording too.
