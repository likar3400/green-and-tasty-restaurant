# Деплой і GitHub (один репозиторій: backend + frontend + infra)

## 0. Що в логах не так (з твоїх logs/2026-10-31-syndicate.log)
1. `The syndicate configuration file is not found in the directory .../marathon2026` — команди запускали з кореня.
   Запускай з `backend/restaurant-backend-app` і задай `SDCT_CONF`.
2. `Credentials were refreshed, but the refreshed credentials are still expired` — протухли тимчасові AWS-ключі
   (SSO/session token). Онови: `aws sso login` або встав свіжі ключі (`aws configure` / змінні `AWS_ACCESS_KEY_ID`,
   `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`), перевір `aws sts get-caller-identity`.
3. Python: README вимагає 3.10–3.11, а в `syndicate_venv` — 3.13. Створи venv заново на 3.11.
`syndicate_venv/` і `AWSCLIV2.pkg` у git не кладемо.

## 1. GitHub (один проєкт)
```bash
cd marathon2026
cat >> .gitignore <<'X'
syndicate_venv/
AWSCLIV2.pkg
logs/
**/bin/
**/obj/
**/dist/
**/.angular/
**/environment.production.ts
X
git init -b main
git add .
git commit -m "Group pre-order: owner endpoints (backend) + group order page (frontend)"
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

## 2. Деплой (порядок з README)
```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# 1) Terraform (state-бакет і var-и з README вже підставлені твоїм account_id/email)
cd infra/terraform && terraform init && terraform apply -auto-approve

# 2) Backend (Syndicate) — з правильної папки
cd ../../backend/restaurant-backend-app
python3.11 -m venv syndicate_venv && source syndicate_venv/bin/activate && pip install aws-syndicate
export SDCT_CONF="$(pwd)/.syndicate-config-restaurant-backend-app"
syndicate create-deploy-target-bucket
syndicate build
syndicate deploy --deploy_name dev       # наступні зміни: syndicate update

# 3) Frontend
API_ID=$(aws apigateway get-rest-apis --region eu-north-1 --query "items[?name=='restaurant-backend-api'].id | [0]" --output text)
export BACKEND_URL="https://$API_ID.execute-api.eu-north-1.amazonaws.com/develop"
cd ../../frontend/restaurant-frontend-app && npm ci && npm run build
aws s3 sync dist/restaurant-frontend-app/browser s3://restaurant-frontend-$ACCOUNT_ID/ --delete
cd ../../infra/terraform && terraform output cloudfront_distribution_domain_name
```
Перед деплоєм перевір `syndicate.yml` (`project_path` — твій абсолютний шлях) і `syndicate_aliases.yml` (бакети з твоїм ACCOUNT_ID).

## 3. Перевірка після деплою
Фронт: `https://<cloudfront>/reservations/<reservationId>/group-order` (залогінений Owner).
Бекенд (curl з Cognito id-токеном):
```bash
curl -H "Authorization: Bearer $ID_TOKEN" $BACKEND_URL/reservations/$RES_ID/guest-session-id
curl -H "Authorization: Bearer $ID_TOKEN" $BACKEND_URL/guest/groups/$GROUP_ID/sessions
curl -X POST -H "Authorization: Bearer $ID_TOKEN" -H "Content-Type: application/json" \
     -d "{\"reservationId\":\"$RES_ID\"}" $BACKEND_URL/group-reservations/$GROUP_ID/submit
curl -X DELETE -H "Authorization: Bearer $ID_TOKEN" $BACKEND_URL/guest/groups/$GROUP_ID/sessions/$SESSION_ID
```
