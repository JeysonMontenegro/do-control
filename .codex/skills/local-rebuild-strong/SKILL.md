---
name: local-rebuild-strong
description: Use when the user asks for a strong rebuild, hard reload of Docker services, or when local frontend/backend changes are not appearing in do-control. Rebuilds images cleanly, recreates containers, and verifies frontend and backend are responding.
---

# local-rebuild-strong

## Purpose
Reliable rebuild workflow for the local `do-control` Docker Compose stack when changes are not appearing or runtime state is inconsistent.

## When to use
- The user says changes are not visible after edits
- Frontend or backend seems stale
- Docker containers were rebuilt but the served app still looks old
- You need a "rebuild fuerte" or "hard reload"

## Workflow
1. Run from repo root.
2. Stop compose services:
   - `docker compose down --remove-orphans`
3. Remove dangling Docker artifacts:
   - `docker system prune -f`
4. Rebuild and recreate the stack:
   - `docker compose up -d --build`
5. Verify services:
   - `docker compose ps`
   - retry `curl -I http://localhost:13000` until frontend responds
   - retry `curl http://localhost:18000/health` until backend responds
6. If frontend is still not reflecting CSS/layout changes, inspect the CSS actually served from `/_next/static/css/...` instead of trusting local source files.

## Notes
- In this repo, frontend runs from a built image, not a live bind mount. Local frontend changes do not appear until the image is rebuilt.
- If `next build` fails due to export path issues, ensure the frontend command recreates `.next/export` before build.
