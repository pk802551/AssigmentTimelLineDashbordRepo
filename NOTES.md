# Timeline Dashboard Notes

## Running

```bash
npm install
cp .env.example .env
npm run dev
```

The backend URL is configured with `VITE_API_BASE_URL`. The default matches the assignment:
`https://fractaldmsdev.centralindia.cloudapp.azure.com`.

For offline fixture mode, set `VITE_USE_FIXTURES=true`. The app then reads the provided
`sample-payloads/*.json` copies from `src/fixtures` instead of calling the live API. Live mode remains
the default because the assignment asks for real backend integration.

## Session And Token Management

I store the access token in `localStorage` so a browser refresh keeps the operator signed in. The trade-off is that `localStorage` is exposed to injected JavaScript, so this would need strong XSS discipline in production. For this assignment the backend returns the token in the JSON login body and requires refresh-on-load, so `localStorage` gives the expected UX without inventing a cookie flow the backend does not provide.

All API calls go through `src/api/client.ts`. That client reads the token, attaches `Authorization: Bearer <token>`, unwraps the MES envelope, retries HTTP 500 responses twice with backoff, and clears the session on authenticated 401s. On app load `AuthProvider` calls `/auth/me`; if it succeeds the dashboard renders, and if it 401s the token is removed and the user returns to `/login`.

## Chart Performance

The timeline chart uses a Canvas renderer instead of SVG. Segment geometry and marker timestamps are prepared outside the draw path, so rendering does not parse dates per marker. With exact produces enabled the API can return 10k-20k rows; the chart draws every FAIL marker and thins PASS markers by screen pixel column. This avoids drawing thousands of visually identical points while preserving defects, which are the points an operator must never miss.

Drag-to-zoom and double-click reset are handled directly on the canvas. Hover checks the already-drawn marker list, which is much smaller after thinning.

## Time And Bucketing

The UI treats shift definitions as IST start times. `src/utils/time.ts` builds the selected shift window in IST and converts it to UTC ISO strings before calling the backend. Response timestamps are parsed as UTC and formatted back as IST for display.

Hourly table buckets are built from the selected shift window and split on IST clock-hour boundaries. If a shift starts or ends at `:30`, the first or last column is partial and the middle columns remain normal clock hours. Segment minutes are split at each bucket boundary, so a segment crossing multiple hours contributes only the overlapping minutes to each column. Produce rows are summed from `produce_counts`, and Ideal/Actual Cycle Time rows come from the separate `/analytics-query` hourly request.

## Assumptions And Scope

I flatten the asset hierarchy into a single selector and default to the first line/machine-level node when available. I did not build auto-refresh, classification dialogs, export, or hierarchy drill-down because they are explicitly out of scope.
