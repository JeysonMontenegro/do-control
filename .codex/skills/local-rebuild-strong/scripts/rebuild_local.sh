#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

docker compose down --remove-orphans
docker system prune -f
docker compose up -d --build
docker compose ps

for _ in $(seq 1 30); do
  if curl -fsSI http://localhost:13000 >/dev/null; then
    break
  fi
  sleep 1
done

for _ in $(seq 1 30); do
  if curl -fsS http://localhost:18000/health >/dev/null; then
    break
  fi
  sleep 1
done

curl -I http://localhost:13000
curl http://localhost:18000/health
