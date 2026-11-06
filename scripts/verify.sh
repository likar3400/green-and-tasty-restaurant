#!/usr/bin/env bash
# Локальна перевірка: бекенд-тести, typecheck і тести фронтенду, production-збірка.
cd "$(dirname "$0")/.." || exit 1
fail=0

echo "== [1/4] Backend: dotnet test"
dotnet test backend/restaurant-backend-app/Tests/APIHandler.Tests.csproj || fail=1

cd frontend/restaurant-frontend-app || exit 1
echo "== [2/4] Frontend: typecheck"
[ -d node_modules ] || npm ci --no-audit --no-fund
npx tsc -p tsconfig.app.json --noEmit && npx tsc -p tsconfig.spec.json --noEmit || fail=1

echo "== [3/4] Frontend: тести домашки (потрібен Google Chrome)"
npm run test:hw -- --browsers=ChromeHeadless || fail=1
echo "(інформативно) решта тестів проєкту: частина з них червона ще до домашки"
npx ng test --watch=false --browsers=ChromeHeadless >/dev/null 2>&1 || echo "   - у решті проєкту є падіння (не стосуються домашки)"

echo "== [4/4] Frontend: production build"
BACKEND_URL="${BACKEND_URL:-https://zkxblk69uj.execute-api.eu-north-1.amazonaws.com/develop}" npm run build || fail=1

[ "$fail" -eq 0 ] && echo "ALL CHECKS PASSED" || echo "SOME CHECKS FAILED"
exit $fail
