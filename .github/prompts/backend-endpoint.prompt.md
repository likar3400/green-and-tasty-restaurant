---
agent: agent
description: Add a new Owner-only Lambda endpoint
---
Add a new endpoint following `agents/dotnet-backend-agent.md`. Create the handler in `Handlers/`, the service method,
DTOs, the route in `Routing/RouteRegistry.cs` AND in `deployment_resources.json` (cognito_authorizer), xUnit tests for every
status code (400/403/404/200), and update `docs/ApiRoutes.md` and the swagger file. Then run `bash scripts/verify.sh`.

Endpoint details: ${input:details:HTTP method, path, who may call it, response shape, error cases}
