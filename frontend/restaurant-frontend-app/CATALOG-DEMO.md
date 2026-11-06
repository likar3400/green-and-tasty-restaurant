# Local catalog demo

The supplied ZIP contains cafe and dish image assets but no backend catalog records or backend service. The frontend therefore has a small, clearly labeled demo catalog for local UI review.

Run the app with Angular's development configuration:

```bash
cd frontend/restaurant-frontend-app
npm ci
npm start
```

Open `http://localhost:4200/main` for cafe and popular-dish cards, or `http://localhost:4200/menu` for the full dish catalog. Demo cards are used only when the corresponding API request succeeds with an empty list. API errors still show the normal error state, and non-empty API responses always take precedence.

The fixture switch is enabled only in `environment.development.ts`. The default and generated production environments disable it, and Angular replaces the demo service with a production implementation that never returns fixture data. The production bundle check also rejects a demo-only fixture marker. This feature is frontend-only: it does not create backend/DynamoDB records or write to AWS. Live production catalog data must be added to the backend separately.
