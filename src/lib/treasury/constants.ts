import type { Obligation } from "./types";

/** Five obligations due within 72 hours across USD / EUR / GBP. */
export const OBLIGATIONS: Obligation[] = [
  {
    id: "ship-harbor",
    label: "Outbound shipping invoice",
    counterparty: "Harbor Logistics LLC",
    amount: 18500,
    currency: "USD",
    dueInHours: 18,
    priority: "critical_ops",
    transferMethod: "LOCAL",
    notes: "Non-payment stops warehouse dispatch for the week.",
  },
  {
    id: "parts-rhine",
    label: "Time-sensitive parts PO",
    counterparty: "Rhine Components GmbH",
    amount: 6200,
    currency: "EUR",
    dueInHours: 36,
    priority: "time_sensitive",
    transferMethod: "SWIFT",
    notes: "Supplier holds inventory 48h; includes EUR 12.85 SWIFT fee in conversion.",
  },
  {
    id: "saas-pacific",
    label: "Annual SaaS renewal",
    counterparty: "Pacific Analytics Inc.",
    amount: 4800,
    currency: "USD",
    dueInHours: 60,
    priority: "standard",
    transferMethod: "LOCAL",
    notes: "Cheapest obligation; can slip one billing cycle.",
  },
  {
    id: "bonus-policy",
    label: "Signing bonus (policy exception)",
    counterparty: "People Ops — offer letter",
    amount: 12000,
    currency: "USD",
    dueInHours: 48,
    priority: "discretionary",
    transferMethod: "LOCAL",
    notes: "Exceeds discretionary spend policy without dual approval.",
  },
  {
    id: "counsel-uk",
    label: "Outside counsel retainer",
    counterparty: "Northbridge Legal LLP",
    amount: 3500,
    currency: "GBP",
    dueInHours: 54,
    priority: "standard",
    transferMethod: "SWIFT",
    notes: "Important but not operations-blocking this week.",
  },
];

/** Indicative rates for planning when live FX is unavailable. */
export const INDICATIVE_USD_RATES: Record<"EUR" | "GBP" | "USD", number> = {
  USD: 1,
  EUR: 1.13,
  GBP: 1.27,
};

export const SWIFT_FEE_EUR = 12.85;

/** Demo starts cash-constrained so the agent must choose. */
export const INITIAL_WORKING_CAPITAL_USD = 42000;
export const RESERVE_FLOOR_USD = 15000;
export const DEFAULT_FORECAST_CONFIDENCE = 0.82;
export const LOW_FORECAST_CONFIDENCE = 0.48;
export const HIGH_CONFIDENCE_FX_LIMIT_USD = 9000;
export const LOW_CONFIDENCE_FX_LIMIT_USD = 2500;
export const DEMO_DEPOSIT_USD = 25000;
export const USD_GLOBAL_ACCOUNT_ID =
  process.env.AWX_GLOBAL_ACCOUNT_ID ?? "30080aa9-621d-46c8-9e5d-776fe69a92cf";
