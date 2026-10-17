@AGENTS.md

# Working on this repo

## Keep the docs current

The docs are a deliverable (the brief asks for a README covering architecture,
setup, known limitations and next steps), so they are part of "done", not a
cleanup task for the end. Whenever a change affects how the app works, update
the docs in the same change, before committing:

- `ARCHITECTURE.md`: the folder tree, module shape, data and auth, the call
  processing flow, and the **Status** section (what works, what's still a
  placeholder).
- `README.md`: setup steps, environment variables, scripts, **Known
  limitations** and **Next steps**.
- `.env.example`: every new environment variable, with a one-line comment.

Write the docs to match the code as it is, not as planned. Mark unfinished work
as such. Keep the existing voice: short sentences, plain words, tables where
they help.

## Call data stays private

The recordings, transcripts and manuals in `../docs/` are real customer data.
Never commit them, and never quote real names, addresses, phone numbers or
transcript text in code, docs, fixtures, tests or commit messages. Use
invented examples instead.
