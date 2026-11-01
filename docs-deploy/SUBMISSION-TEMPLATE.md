# Домашнє завдання: груповий pre-order (Owner) — опис для здачі

## Що зроблено
**Backend (.NET, AWS Lambda)** — рівні 1–3:
- `GET /guest/groups/{groupReservationId}/sessions` — учасники, страви, суми, загальна сума (Owner першим);
- `GET /reservations/{reservationId}/guest-session-id` — id owner-сесії;
- `POST /group-reservations/{groupReservationId}/submit` — лише submitted-сесії, злиття страв за `dishId`,
  order → `SubmittedByCustomer`, group reservation → `Submitted`;
- `DELETE /guest/groups/{groupReservationId}/sessions/{guestSessionId}` — повертає оновлений знімок.
Статуси: 403 (не Owner), 404 (не знайдено), 400 (немає submitted-сесій / немає страв / order не знайдено / сесія з іншої групи).
Тести: 164 xUnit, усі проходять (24 нові).

**Frontend (Angular)** — практичне, рівні 1–3, бонус Remove Guest:
сторінка `/reservations/:reservationId/group-order`, картка учасника, `GroupOrdersService`, Consolidated pre-order,
Grand Total із підтверджених кошиків, Submit через модалку, Remove Guest, синхронізація кожні 15 с (`exhaustMap`, `SKIP_ERROR_TOAST`),
«Updated at» і Refresh. Тести домашки: 46 з 46 зелені.

**Деплой:** Terraform (S3 + CloudFront), Syndicate (Lambda + API Gateway), frontend → S3.

## Як перевірено
- `dotnet test` — 164/164; `npm run test:hw` — 46/46; `tsc` (app + spec); `npm run build`.
- Ручна перевірка на розгорнутому API: <вставити результати curl / скріни>.

## Скріни
<вставити: Owner Review, Sent to Restaurant, Remove Guest, стан помилки, мобільна ширина 375 px>

## Використання AI
Код і тести написані за участі AI-асистента (Claude). Я перевірила: запустила всі тести локально,
пройшла ручний сценарій (бронювання → гість → кошик → submit → remove) на розгорнутому API,
і вичитала код перед здачею. <додати власні уточнення>
