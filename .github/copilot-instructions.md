# Green & Tasty (marathon2026)

One repo: `backend/restaurant-backend-app` (.NET 10 Lambda + API Gateway + DynamoDB + Cognito),
`frontend/restaurant-frontend-app` (Angular 22, signals), `infra/terraform`.

## Workflow
- Before finishing any task run `bash scripts/verify.sh` and show the real output. Never claim tests pass without running them.
- Backend rules and examples: `agents/dotnet-backend-agent.md`.
- Frontend rules: `frontend/restaurant-frontend-app/CLAUDE.md`. Deploy steps: `docs-deploy/DEPLOY-AND-GITHUB.md`.

## Commands
- Backend tests: `dotnet test backend/restaurant-backend-app/Tests/APIHandler.Tests.csproj` (expected: 164+ passed)
- Frontend (run in `frontend/restaurant-frontend-app`, Node 22):
  `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.spec.json --noEmit`,
  `npm run test:hw -- --browsers=ChromeHeadless` (homework tests, expected: all green),
  `BACKEND_URL=https://zkxblk69uj.execute-api.eu-north-1.amazonaws.com/develop npm run build`

## Homework scope (Owner group pre-order)
- GET `/guest/groups/{id}/sessions`, GET `/reservations/{id}/guest-session-id`,
  POST `/group-reservations/{id}/submit`, DELETE `/guest/groups/{id}/sessions/{sessionId}`.
- Owner only. 403 not owner; 404 reservation/group/session not found; 400 no submitted sessions,
  no dishes, order not found, session from another group.
- A new route must be added to BOTH `Routing/RouteRegistry.cs` AND `backend/restaurant-backend-app/deployment_resources.json`.
- Specs: `homework-backend.md`, `homework-frontend.md`, designs in `homework-design/`.

## Do not
- Do not "fix" the ~47 failing tests outside the homework (they were red before). Only tests under
  `components/group-orders`, `pages/group-order-page`, `services/group-orders`, `shared/helpers` matter.
- Do not weaken a test to make it pass.
- Do not create new `Subject`/`BehaviorSubject` for UI state; use signals.
- Do not commit secrets, `.env`, `syndicate_venv/`, `logs/`, `dist/`, `bin/`, `obj/`.
- Do not run `git push`, `syndicate deploy`, `terraform apply` without an explicit request.

## Deploy facts
- Region `eu-north-1`. Run `syndicate` only from `backend/restaurant-backend-app` with
  `export SDCT_CONF="$(pwd)/.syndicate-config-restaurant-backend-app"` and Python 3.11.
- AWS keys expire: check `aws sts get-caller-identity` before any deploy.
- After deploy: `BACKEND_URL=... bash scripts/smoke-api.sh` (expects four 401 responses).
