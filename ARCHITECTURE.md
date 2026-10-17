# Architecture

PestLaunch **Call Intelligence**: upload a call recording, get a transcript,
call type, outcome, scorecard grade and coaching. The UI and the backend API
live in this one Next.js app.

The code is feature-sliced. Each feature is a **module** that can be turned on
or off per tenant (pest control company).

```
app/                     Routing only: thin pages, layouts, route handlers
  [tenant]/              UI, e.g. /noble-pest/calls
    _components/         TenantNav (shows enabled modules only)
    _lib/                requireModule (per-page module check)
    calls/               Call library + upload
    calls/[callId]/      Call detail; composes panels from other modules
    scorecards/          The scoring standards
    coaching/            Employee coaching
  api/[tenant]/          Backend API, e.g. /api/noble-pest/calls
    _lib/                withModule (per-handler module check)
    calls/route.ts       GET list · POST upload + process
    calls/[callId]/      GET one call
core/                    Platform code every tenant gets. Not toggleable.
  calls/                 Shared call contract: CallType, TranscriptSegment,
                         CallAnalysisStep (how modules plug into processing)
  modules/               Module manifest types, defineModule, dependency resolver
  tenancy/               Tenant model and lookup (cached, tagged per tenant)
  ai/ storage/ db/       Placeholders for LLM/STT clients, file storage, database
modules/                 Toggleable features
  registry.ts            Lists every module; resolves a tenant's enabled set
  registry.server.ts     Collects the analysis steps of enabled modules
  calls/                 Base module: pipeline, transcript, call type, outcome
  scorecards/            Grades calls with the manual scorecards (needs calls)
  coaching/              Per-call feedback and per-employee view (needs calls)
shared/                  Business-agnostic UI, helpers and config
```

Every module has the same shape:

```
modules/<name>/
  module.ts    Manifest: id, defaultEnabled, dependsOn, nav
  index.ts     Public UI API: manifest, components, types
  server.ts    Public server API: services, route handlers, analysis steps
  ui/          Components
  server/      Server-only code (starts with import "server-only")
  model/       Types and pure domain logic
  config/      Static data, e.g. the scorecards
  lib/         Module-private helpers
```

## Dependency rules (enforced by ESLint)

`app → modules → core → shared`. A layer imports only from layers to its right.

- A module never imports another module. Share code through `core/` or
  `shared/`; compose modules in `app/` or the registries.
- `app/` imports a module only through `@/modules/<name>` or
  `@/modules/<name>/server`.
- Service functions take the tenant explicitly so every query is tenant-scoped.

## Call processing

`POST /api/[tenant]/calls` with a `recording` file runs
`modules/calls/server/process-call.ts`:

1. **Transcribe** with speaker labels (employee vs customer).
2. **Analyze**: classify the call type and extract the outcome and key details.
3. **Module steps**: run the `CallAnalysisStep` of every enabled module
   (scorecards, coaching). Each result is stored under `analyses[moduleId]`.

The calls module never imports scorecards or coaching. The route asks
`registry.server.ts` for the enabled steps and passes them in. Turning a module
off for a tenant removes both its UI and its processing step.

## Call types and scorecards

From the call manuals in `../docs/call-manuals/`:

| Call type | Scorecard | Max | Gold | Green |
| --- | --- | --- | --- | --- |
| New customer (sales) | Sales Calls | 17 | 17 | 14+ |
| Retention | Retention Calls | 12 | 12 | 11 |
| Scheduling, billing, re-service | All Calls | 12 | 12 | 11 |
| Other | Not scored | | | |

On sales calls with no objections, the 4 objection points are awarded
automatically. The scorecards are data in
`modules/scorecards/config/scorecards.ts`. The LLM decides pass/fail per item
with a supporting quote, and the points and grade are computed in code so
the maths is deterministic.

## Module toggling

1. Each `module.ts` declares `defaultEnabled` and optional `dependsOn`.
2. A tenant stores overrides in `tenant.modules`, e.g. `{ coaching: false }`.
3. `resolveEnabledModules` applies the overrides, then turns off any module
   whose dependencies are off.
4. Every module page calls `requireModule(params, "<id>")`, and API routes use
   `withModule("<id>", handler)`. Server actions must check `isModuleEnabled`.
   Don't rely on a layout for this: Next renders layouts and pages in
   parallel, so a layout check alone still lets a disabled page render and
   send its data.
5. After changing a tenant's modules, call `revalidateTag(tenantCacheTag(slug))`.

## Adding a module

1. Create `modules/<name>/` with the shape above and register it in `registry.ts`.
2. If it analyzes calls, export a `CallAnalysisStep` from its `server.ts` and
   add it in `registry.server.ts`.
3. Add `app/[tenant]/<name>/page.tsx` (calls `requireModule` first) and, for
   APIs, `app/api/[tenant]/<name>/route.ts` (uses `withModule`).

## Status

Structure, routing, module gating, scorecard data and grading maths are in
place. Still placeholders that throw: `transcribe`, `analyzeCall`,
`scoringStep`, `coachingStep`. Calls are stored in memory.
