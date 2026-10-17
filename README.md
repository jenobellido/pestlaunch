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
- Groq's free tier allows 8,000 chat tokens a minute. The full pipeline for a
  20-minute call takes about 4 minutes, mostly waiting out the limit. The paid tier
  removes this. The free tier also caps audio files at 25 MB (the app accepts
  up to 50 MB).
- Calls can be deleted through the API (`DELETE /api/[tenant]/calls/[id]`),
  but there's no delete button in the UI yet.
- Processing runs inside the upload request. Long recordings will hit
  serverless time limits once deployed.
- The Coaching page is a placeholder; per-employee trends aren't built.
- There's no way to invite teammates yet, so every workspace has one member,
  its owner. The manager and rep views of Settings (read-only company name
  and modules) are built but can't be reached without editing the database.
- The theme is saved per browser, not per account.

## Next steps

1. Process in the background and show progress in the UI.
2. Run every test call and tune prompts for accuracy, including speaker labels.
3. Per-employee coaching page: scores and recurring feedback over time.
4. Deploy.

## Call data

The call recordings used to test this are real customer calls. They are never
committed to this repository. Keep them outside the repo or in private storage.
Uploaded recordings live only in the private `recordings` bucket, and deleting
a call deletes its recording too.
