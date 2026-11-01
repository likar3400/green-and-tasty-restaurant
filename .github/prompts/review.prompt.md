---
agent: agent
description: Review current git changes
---
Review the current `git diff` (including staged changes) against `homework-backend.md` and `homework-frontend.md`:
Owner-only checks, status codes 400/403/404, catch order in handlers (404 exceptions before ValidationException),
route present in RouteRegistry.cs AND deployment_resources.json, signals usage and no new Subject, tests for new
branches, no secrets in the diff. Do not edit code. Run `bash scripts/verify.sh`.
Reply as: Blockers / Recommendations / What's good / Test result, with file and line for each point.
