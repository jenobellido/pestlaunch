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

## Known limitations

- Calls can't be processed yet: transcription, call analysis, scoring and
  coaching are still placeholders.
- Calls can be deleted through the API (`DELETE /api/[tenant]/calls/[id]`),
  but there's no delete button in the UI yet.
- Processing runs inside the upload request. Long recordings will hit
  serverless time limits once deployed.
- The Coaching page is a placeholder; per-employee trends aren't built.

## Next steps

1. Transcription with speaker labels.
2. Call type and outcome, scorecard grading with evidence quotes, coaching.
3. Process in the background and show progress in the UI.
4. Run every test call and tune prompts for accuracy.
5. Deploy.

## Call data

The call recordings used to test this are real customer calls. They are never
committed to this repository. Keep them outside the repo or in private storage.
Uploaded recordings live only in the private `recordings` bucket, and deleting
a call deletes its recording too.
