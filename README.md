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
| See the PestLaunch score or grade | All Calls, Retention and Sales scorecards from the manuals. Every item shows pass or fail with a quote from the call, checked against the transcript, or the reason it was missed. Points and grade (Gold, Green, Below) are computed in code. |
| See coaching for the employee | Per call: strengths, up to 3 improvements with the words to say next time, and one focus. Per rep: average score, trend, most-missed steps, and **Plays** a manager can assign. |
| (beyond the brief) Follow leads | **Leads**: every new-customer call becomes a lead (New, Contacted, Booked, Lost) with the customer, pest, price and next step. |
| Review all calls and results | **Search** inside every transcript ("termites") and **export** calls to CSV. **Overview**: close rate, cancels saved, follow-ups open, average score, a **Leaks** list of calls that lost money or need action, reps, and cancel reasons, for 7 days, 30 days or all time. **Calls**: filter by outcome, type, rep and date, and search. |

Beyond the brief, it's ready for a real team:

- Invite people with a link.
- Permission-based roles, with custom roles.
- Calls belong to the rep who made them.
- Reps only see their own calls.

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
  storage.

## Local setup

Requires Node 22+ and Docker.

```bash
npm install
cp .env.example .env.local
npm run db:start      # starts Supabase in Docker; prints the keys for .env.local
npm run db:migrate    # applies migrations in drizzle/
npm run dev
```

Put a Groq API key (https://console.groq.com) in `AI_API_KEY` in `.env.local`;
transcription and call analysis use it. The AI client works with any
OpenAI-compatible API: to use OpenAI, set `AI_BASE_URL`, the model names and an
OpenAI key as shown in `.env.example`. No code changes are needed.

Open http://localhost:3000 and create an account. Locally, email confirmation
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

Each workspace has a Settings page (`/<company>/settings`, at the bottom of
the sidebar):

- **Appearance:** System, Light or Dark. Saved in a cookie on this browser.
- **Profile:** your display name.
- **Company:** the company name (needs `company.manage`). The URL doesn't
  change.
- **Modules:** turn Scorecards and Coaching on or off for the whole company
  (needs `modules.manage`). Calls is the base module and is always on.
- **Team:** members and their roles. Invite someone by email and role, and
  copy the link to send them (needs `team.manage`).
- **Roles:** what each role can do, with custom roles (needs `roles.manage`).
  Every company starts with Owner, Manager and Rep.

## Known limitations

- Speaker labels come from a language model reading the transcript, not from
  the audio, so they're occasionally swapped, mostly where two people talk
  over each other. When a segment is split between speakers, the split's
  timestamps are estimated from text length.
- Groq's free tier allows 8,000 chat tokens a minute and 200,000 a day on
  `gpt-oss-120b`. A 20-minute call takes about 4 minutes, mostly waiting out
  the per-minute limit, and the daily limit covers only a handful of long
  calls. When it's used up, the app switches to `gpt-oss-20b`, which has its
  own daily allowance; it gave the same type, outcome and score on a test
  call but is a smaller model, so results may be less precise. When both are
  used up, calls fail with a message saying when to retry. The paid Dev tier
  removes these limits. The free tier also caps audio files
  at 25 MB (the app accepts up to 50 MB).
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

## Next steps

1. Switch the AI provider to OpenAI (configuration only), then run every test
   call and tune prompts for accuracy, including speaker labels, against a
   small hand-checked answer key.
2. Notify people when a follow-up is assigned to them (email or SMS), and
   alert the owner when a new leak appears.
3. Link callers to customers in the PestLaunch CRM, and import calls
   automatically from the phone system instead of uploading them.
4. A durable job queue for processing, and paging on the server for large
   call libraries.
5. Deploy.

## Call data

The call recordings used to test this are real customer calls. They are never
committed to this repository. Keep them outside the repo or in private storage.
Uploaded recordings live only in the private `recordings` bucket, and deleting
a call deletes its recording too.
