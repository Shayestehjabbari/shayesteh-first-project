# pawaPay Sandbox Tester

A web app for testing pawaPay Deposit, Payout, and Refund APIs against the pawaPay sandbox environment.

## Project Structure

```
shayesteh-first-project/
├── server.js              # Express entry point (port from PORT env or 3000)
├── routes/api.js          # API route handlers for all operations
├── services/
│   ├── pawapay.js         # pawaPay API client (axios, base URL: api.sandbox.pawapay.io)
│   └── transactionStore.js # In-memory transaction log (max 200 entries)
├── public/
│   ├── index.html         # Single-page frontend
│   ├── app.js             # Frontend JS (dynamic forms, result rendering)
│   └── style.css          # Styles
├── .env                   # API token (PAWAPAY_API_TOKEN) — not committed
└── .env.example           # Template for .env
```

## Tech Stack

- **Runtime:** Node.js
- **Backend:** Express 4
- **HTTP Client:** Axios (for pawaPay API calls)
- **Frontend:** Vanilla HTML/CSS/JS (no framework, no build step)
- **State:** In-memory transaction store (no database)

## Setup

```bash
cd shayesteh-first-project
cp .env.example .env       # Then add your sandbox API token
npm install
npm start                  # Runs on http://localhost:3000
```

## API Endpoints

| Method | Path                          | Description                    |
|--------|-------------------------------|--------------------------------|
| POST   | `/api/deposit`                | Initiate a deposit             |
| POST   | `/api/payout`                 | Initiate a payout              |
| POST   | `/api/refund`                 | Initiate a refund              |
| GET    | `/api/deposit-status/:id`     | Check deposit status           |
| GET    | `/api/payout-status/:id`      | Check payout status            |
| GET    | `/api/refund-status/:id`      | Check refund status            |
| GET    | `/api/active-conf`            | Fetch active provider config   |
| GET    | `/api/wallet-balances`        | Fetch wallet balances          |
| GET    | `/api/transactions`           | List in-memory transaction log |

## Key Patterns

- All pawaPay service functions return `{ success: true, data }` or `{ success: false, error }`.
- Deposit/payout flow: predict provider -> fetch active-conf -> resolve currency -> initiate transaction.
- UUIDs are generated server-side via the `uuid` package for transaction IDs.
- The frontend escapes all dynamic content via a custom `esc()` helper to prevent XSS.

## Environment Variables

- `PAWAPAY_API_TOKEN` — sandbox API bearer token (required)
- `PORT` — server port (default: 3000)
