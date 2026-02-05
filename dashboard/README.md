# SentinelWatch Dashboard

Minimal React UI to prove the end-to-end flow from the API to the user.

## What it does

- Fetches events from the API
- Filters by impact and type
- Displays the main event fields in a table

## API

- GET /events
  - Optional filters: impact, type
  - Example: /events?impact=high&type=geopolitical

## Run locally

From this folder:

```bash
npm install
npm run dev
```

Make sure the API is running at http://localhost:8000.

## Future work

- Map view of Brazil with event locations
- Advanced filters and search
