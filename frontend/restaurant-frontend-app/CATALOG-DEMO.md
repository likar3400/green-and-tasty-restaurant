# Local catalog demo

The ZIPs include cafe and dish images. The frontend source also has a local group-order mock with four dish names, prices, weights, matching image paths, and the Rustaveli Avenue 48 reservation address. They do not contain a complete catalog dataset or backend seed records; the marathon archive's backend code reads catalog records from its database. The separate demo catalog in this branch reuses the supplied dish names and images and adds clearly labeled local-only fields needed to render cafe and menu cards.

Run the app with Angular's development configuration:

```bash
cd frontend/restaurant-frontend-app
npm ci
npm start
```

Open `http://localhost:4200/main` for cafe and popular-dish cards, `http://localhost:4200/menu` for the full dish catalog, or `http://localhost:4200/join/demo-invite-token` to try the local guest invite, menu, cart, and submit flow. The guest flow and its cart are in-memory demo behavior, not a live reservation.

Catalog cards are used only when the corresponding API request succeeds with an empty list. API errors still show the normal error state, and non-empty API responses always take precedence. These fixtures are not real restaurant records; live production data still needs to be created through the backend.

The fixture switch is enabled only in `environment.development.ts`. The default and generated production environments disable it, and Angular replaces the demo service with a production implementation that never returns fixture data. The production bundle check also rejects a demo-only fixture marker. This feature is frontend-only: it does not create backend/DynamoDB records or write to AWS. Live production catalog data must be added to the backend separately.
