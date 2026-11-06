#!/usr/bin/env bash
# Перевіряє, що нові маршрути розгорнуті. Без токена Cognito має відповісти 401;
# 403 "Missing Authentication Token" означає, що маршруту в API Gateway немає.
# Із ID_TOKEN, RES_ID, GROUP_ID перевіряє ще й 200 / 404.
: "${BACKEND_URL:?set BACKEND_URL, e.g. https://<id>.execute-api.eu-north-1.amazonaws.com/develop}"
fail=0
check() { # method path expected [token]
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' -X "$1" ${4:+-H "Authorization: Bearer $4"} \
    -H 'Content-Type: application/json' ${5:+-d "$5"} "$BACKEND_URL$2")
  if [ "$code" = "$3" ]; then echo "OK   $1 $2 -> $code"; else echo "FAIL $1 $2 -> $code (expected $3)"; fail=1; fi
}
check GET    /guest/groups/x/sessions            401
check GET    /reservations/x/guest-session-id    401
check POST   /group-reservations/x/submit        401
check DELETE /guest/groups/x/sessions/y          401
if [ -n "${ID_TOKEN:-}" ]; then
  check GET  "/reservations/${RES_ID:-x}/guest-session-id" "${RES_ID:+200}"  "$ID_TOKEN"
  check GET  "/guest/groups/${GROUP_ID:-x}/sessions"       "${GROUP_ID:+200}" "$ID_TOKEN"
  check GET  /guest/groups/not-existing/sessions            404 "$ID_TOKEN"
fi
exit $fail
