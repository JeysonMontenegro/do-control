# Frontend Handoff

## Goal For Next Session
Start frontend/UX work only.
Do not begin new backend refactors before frontend work starts.

## Current Context
- Repo root: `/home/jeyson/Documents/Personal Projects/do-control`
- Frontend path: `/home/jeyson/Documents/Personal Projects/do-control/frontend`
- Backend DB hardening work is complete for now.
- Push is currently blocked by GitHub Push Protection because a Brevo key exists in git history.
- The next session is expected to run without sandbox, so git cleanup/push should happen first if possible.

## User Intent
The user explicitly said they want:
- commit/push handled outside the current sandboxed environment
- then move into frontend with a UX-expert mindset
- and avoid starting more backend changes first

## Frontend Stack
- Next.js 15
- React 18
- TypeScript 5

## Working Rules To Preserve
- Do not change API contracts without updating frontend, backend, and tests.
- Since the user wants to begin frontend work, prefer leaving backend unchanged unless frontend work reveals a real blocker.
- Preserve existing design-system/app patterns if they already exist.
- If a UI redesign is requested, prioritize intentional, non-generic UX.

## Suggested Next Session Order
1. Fix git history / push-protection issue.
2. Push the current branch.
3. Inspect the frontend app structure and current UX patterns.
4. Start frontend UX work only.

## Immediate Frontend Startup Checklist
- inspect `frontend/app` and major route structure
- inspect shared UI components/styles
- identify the first user-facing workflow the user wants redesigned or improved
- avoid backend edits unless there is a confirmed contract mismatch or blocker

## Related Files
- Main backend handoff: `/home/jeyson/Documents/Personal Projects/do-control/backend/SESSION_HANDOFF.md`
- Current DB schema snapshot: `/home/jeyson/Documents/Personal Projects/do-control/backend/current_db_schema.sql`
