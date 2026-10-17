# PestLaunch Call Intelligence

Turns pest control phone calls into a transcript, call type, outcome,
scorecard grade and coaching for the employee.

Built with Next.js 16, Supabase (Postgres, Auth, Storage) and Drizzle. See
[ARCHITECTURE.md](ARCHITECTURE.md) for how the code is organized.

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
transcription and call analysis use it.

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
| `npm run db:start` / `db:stop` | Start or stop the local Supabase stack |
| `npm run db:generate` | Create a migration from changes to `core/db/schema.ts` or a module's `server/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:reset` | Wipe the local database and re-apply all migrations |
| `npm run db:studio` | Drizzle Studio |

## Settings

Each workspace has a Settings page (`/<company>/settings`, at the bottom of
the sidebar):

- **Appearance:** System, Light or Dark. Saved in a cookie on this browser.
- **Profile:** your display name.
- **Company:** the company name (owners only). The URL doesn't change.
- **Modules:** turn Scorecards and Coaching on or off for the whole company
  (owners only). Calls is the base module and is always on.

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

1. Run every test call and tune prompts for accuracy, including speaker labels
   (needs the paid AI tier, or several days of the free one).
2. Deploy.

## Call data

The call recordings used to test this are real customer calls. They are never
committed to this repository. Keep them outside the repo or in private storage.
Uploaded recordings live only in the private `recordings` bucket, and deleting
a call deletes its recording too.
