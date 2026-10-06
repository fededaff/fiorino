# Fiorino

Adaptive Treasury Controller for Project Fiorino — Airwallex Developer Lab **Kit 1**.

When cash is short across a 72-hour window, Fiorino decides which obligations to **fund**, **convert & pay**, **defer**, or **escalate**, while holding a reserve floor. A contradicted receivable forecast tightens FX autonomy; a simulated deposit recalculates only the balance-sensitive decisions; then the app executes one FX conversion and one supplier transfer.

Built from [airwallexdev.com](https://airwallexdev.com/) / [builder guide](https://airwallexdev.com/agentic-banking-builder-guide.md).

## Run locally

```bash
npm install
npm run dev
```

App: [http://127.0.0.1:43127](http://127.0.0.1:43127)

## Live sandbox REST (optional)

Developer MCP on this Project already verified Global Accounts, balances, and FX quotes. For the Next.js app to call sandbox REST itself:

```bash
cp .env.example .env.local
# set AWX_CLIENT_ID and AWX_API_KEY from sandbox.airwallex.com → Account → Developer → API keys
```

Without credentials the UI runs the full decision demo in **mock execute** mode (policy + flow still work).

## Demo flow

1. Build initial plan  
2. Lower forecast confidence (customer email contradicts receivable)  
3. Simulate $25,000 deposit  
4. Execute FX + shipping transfer  

## Stack

- Next.js · TypeScript · Tailwind · shadcn/ui  
- Airwallex sandbox APIs (`balances`, `fx/quotes`, `fx/conversions`, `beneficiaries`, `transfers`, `simulation/deposit`)  
- Airwallex-dev MCP for connection verify
