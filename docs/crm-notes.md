# PestLaunch OS: notes for Call Intelligence

Notes from PestLaunch's walkthrough video of their CRM, "PestLaunch OS". The
video shows a demo company with sample data (an on-screen banner says it's
read-only sample data). No names, phone numbers or figures from it are copied
here. Research only: nothing in this file is built yet.

## 1. What PestLaunch OS is

PestLaunch helps pest control owners grow. Their customers' data is spread
over many tools: a field CRM (FieldRoutes, GorillaDesk or PestPac), QuickBooks,
review sites and collections software. PestLaunch OS pulls it into one place,
so an owner has one login instead of ten.

Main screens, in sidebar order:

| Screen | What it shows |
| --- | --- |
| Home | The company's current "play" with a progress bar (e.g. a sales and retention system, % complete) and a link to an Implementation Hub. Finances (revenue chart, collections %, gross and net profit). Office numbers (retention, cancels) and tech numbers (overall score, re-services). A "Needs attention" list, each item with an Assign button. |
| Tasks | "Plays" grouped as For Review, In Progress, Completed. Each has a tag (Priority, Next), a title, a one-line goal and an "Assign to …" button. The plan is for AI to suggest them. |
| Team | Scorecards for technicians and office staff: KPI tiles and a leaderboard (score, on-time, photos, notes, average time, trend). Scores are coloured green, orange or red. |
| Assistant | Planned AI assistant that knows the business and PestLaunch's own rubrics. |
| Financials, Collections | Money: financial data, and later a collections agent. |
| **Sales** | The focus of the video, and of this project. See below. |
| Customer Health, Updates | Listed in the sidebar; not shown in the video. |

The bottom of the sidebar has All clients, Connections, Feedback and Support.
The top has the company's name ("<Company> OS", "Powered by PestLaunch") and a
search box with a ⌘K hint.

### The Sales screen

"It's called sales, but really it's all calls." It has four tabs:

- **Overview:** a date range (7d / 30d) with a Refresh button and an "as of"
  time. A **Scorecard** card shows New leads, Qualified leads, Close %, New
  recurring customers, Revenue sold, Average response time and Follow-ups due.
  A **Sales Leaks** card lists problems as rows (e.g. "N follow-ups waiting",
  "N unassigned leads"), each with an "Assign … →" button.
- **Pipeline:** a kanban of leads (New, Contacted, Qualified, Quoted,
  Follow-up, …), filter chips per rep plus Unassigned, and an Add Lead button.
  Cards show the name, phone, next step date and the assigned rep. The goal is
  that calls drop leads into the pipeline and move them along automatically,
  so the owner never has to touch it.
- **Reps:** performance by rep, with click-through. In the video this tab is
  still loading ("We want this to be really fast").
- **Call Log:** a call history table. Filter chips: All, Today, Missed,
  Inbound, Outbound, Sales, Service, Billing, Retention, Other, Rep. Columns:
  time, In/Out, Type, Caller / Number, Rep, Talk (length), Outcome (e.g.
  Answered), and Listen and Transcript buttons. A note says calls are
  transcribed and split by speaker ("Rep / Caller").

### What the owner wants from calls

In the presenter's words, roughly:

- **Sales calls:** are we closing them? If not, where are we missing, and
  what should I train reps on? Ideally the product trains them.
- **Retention (cancel) calls:** how many customers called to cancel, how many
  did we save, which didn't we save, and why?
- **Customer service calls** (scheduling, billing, questions): how is the team
  handling them?
- Every call graded, scored and classified by person and call type, against
  PestLaunch's own rubrics, scripts and trainings.
- Data that is clean, accurate and reliable first, then easy to see.
- "Like Apple": simple enough to use with no onboarding.

## 2. UI and UX patterns to match

| Pattern | In PestLaunch OS | In our app today |
| --- | --- | --- |
| Navigation | Left sidebar, icon + label, active item tinted. Utility links at the bottom. | Same shape (Freehold sidebar). |
| Page header | Large page title. Tabs as a segmented control under it. Date range and Refresh on the right. | Title + description + icon tile. No tabs, no date range. |
| Metrics | A "Scorecard" card: small label over a big number, coloured green / orange / red by health. | Four stat tiles on Calls; colour isn't used for health. |
| Problems as actions | "Leaks" and "Needs attention" rows, each with one primary action ("Assign …"). | Not built. |
| Tables | Dense rows, chip filters above, inline buttons (Listen, Transcript). | Card list with chips and search; whole row opens the call. |
| Boards | Kanban per stage, rep filter chips. | Not built. |
| Words | Rep, Caller, Talk, Outcome, Close %, Leaks, Plays, Assign, Missed, Inbound / Outbound. | Employee, Customer, Duration, Result, Won. |
| Theme | Light, white cards with thin grey borders, a blue primary colour; one card has a blue left accent bar. | Freehold: dark by default (light available), mint accent, borderless rounded cards. |

The colours differ the most. We picked the Freehold look on purpose, so this
is a decision for the user, not a change to make quietly. A cheap middle
ground: the theme is already all tokens in `app/globals.css`, so a "PestLaunch"
palette (light default, blue accent) could be one more token set.

## 3. Features to add, in priority order

Effort: S is up to a day, M is 2 to 3 days, L is a week or more, or needs an
outside integration.

| # | Feature | Why it matters | Effort |
| --- | --- | --- | --- |
| 1 | **Sales Overview** with a 7d / 30d range: a scorecard of call volume, sales close %, retention save rate, average score per call type and follow-ups due, plus a **Leaks** list (unresolved follow-ups, cancel calls not saved, calls below standard), each linking to the calls behind it. | It answers the owner's first three questions on one screen. Almost all the data already exists (call type, outcome, follow-ups, score). | M |
| 2 | **Reps** tab: one row per rep with calls, average score, close % and save %, trend, most-missed scorecard items and their latest coaching focus. Click through to a rep's calls and coaching. | "Who's doing well, where can they improve." Needs calls attributed to members, which the main session is building now. It's also where the Coaching page should go. | M |
| 3 | **Training needs → Plays**: count the scorecard items each rep (and the team) misses most and turn them into suggested Plays, e.g. "Coach on the expectation statement: missed on 6 of 9 sales calls", with an Assign button. | "What do I need to train my reps on? Ideally it trains the reps for them." Matches the Tasks screen. Built from scorecard and coaching data we already store. | M |
| 4 | **Retention insights**: cancel calls in the range, saved vs lost, and the reasons customers gave, grouped (price, moving, results, service). Missed save steps on the lost ones. | Asked for word for word. Needs one new field from the analysis step (cancel reason), which is the main session's area. | M |
| 5 | **Call Log that matches the CRM**: columns Type, Caller, Rep, Talk, Outcome, Score, with Listen and Transcript actions. Filter chips Today, Sales, Service, Billing, Retention, Other and Rep. Later In/Out and Missed. | Ours should feel like their Call Log, not a separate product. Mostly UI on top of what we have. In/Out, Missed and the caller's number need call metadata from the phone system. | S (UI), M with metadata |
| 6 | **Lead from call**: a sales call creates or updates a lead card (name, number, address, pest, quote, stage: Quoted or Booked, next step) shown on a Pipeline tab, or sent to their pipeline. | "Automatically dropping calls and leads right into the pipeline." The analysis already pulls most of these details. A local leads table is M; syncing with their CRM is L. | M–L |
| 7 | **Customer link**: match the caller's number to a customer in the field CRM and show a customer's call history (and later customer health). | Connects calls to accounts and jobs. Depends on an integration (FieldRoutes, GorillaDesk or PestPac). | L |
| 8 | **Automatic call import** from the phone system or CRM instead of manual upload, with direction, number and missed calls. | Removes the upload step, the biggest gap between us and their Call Log. Fits the background processing the main session is building. | L |

Suggested order: 1 → 2 → 3 first. They need no outside integrations, build on
member attribution, and show the most value in a demo. Then 5 (quick), then 4.
Items 6 to 8 depend on integrations PestLaunch would choose.

## 4. Changes to naming and structure

- **One "Sales" area with tabs** instead of separate Calls, Scorecards and
  Coaching nav items: Overview · Reps · Call Log (plus Pipeline once leads
  exist). The scorecard rubric becomes a page reachable from Overview or the
  call detail, and Coaching lives under Reps. The modules can stay as they
  are in code; this only changes how pages are grouped and linked. Turning a
  module off would hide its tab instead of a nav item.
- **Use their words:** Employee → **Rep**, Customer → **Caller** (in the
  transcript and speaker timeline), Duration → **Talk**, Result →
  **Outcome**. "Won" → **Closed** for sales and **Saved** for retention.
  Leaks, Plays and Assign for action lists.
- **Call types in filters:** group ours the way the CRM does: Sales (new
  customer), Service (scheduling, re-service), Billing, Retention, Other.
  Keep the finer type on the call itself.
- **Date range everywhere numbers appear:** 7d / 30d, with an "as of" time.
  Our stats strip currently covers all time.
- **Sidebar header:** show the company as "<Company>" with "Powered by
  PestLaunch" underneath, and add search with ⌘K.
- **Speed is a selling point.** Their Reps tab was still loading in the
  video. Our pages already have instant loading shells, so keep the new tabs
  that fast.
