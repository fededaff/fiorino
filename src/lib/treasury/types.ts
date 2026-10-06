export type Currency = "USD" | "EUR" | "GBP";

export type DecisionAction =
  | "fund"
  | "convert_and_pay"
  | "defer"
  | "escalate"
  | "hold";

export type ObligationPriority =
  | "critical_ops"
  | "time_sensitive"
  | "standard"
  | "discretionary";

export interface Obligation {
  id: string;
  label: string;
  counterparty: string;
  amount: number;
  currency: Currency;
  dueInHours: number;
  priority: ObligationPriority;
  transferMethod: "LOCAL" | "SWIFT";
  notes: string;
}

export interface BalanceSnapshot {
  currency: string;
  available: number;
  total: number;
}

export interface Decision {
  obligationId: string;
  action: DecisionAction;
  rationale: string;
  estimatedUsdCost: number;
  requiresApproval: boolean;
  fxBuyAmount?: number;
  fxBuyCurrency?: Currency;
  fxSellCurrency?: Currency;
}

export interface TreasuryPlan {
  generatedAt: string;
  reserveFloorUsd: number;
  deployableUsd: number;
  remainingReserveUsd: number;
  forecastConfidence: number;
  autonomousFxLimitUsd: number;
  decisions: Decision[];
  summary: string;
}

export type DemoPhase =
  | "idle"
  | "planned"
  | "confidence_lowered"
  | "deposit_applied"
  | "recalculated"
  | "executed";

export interface ExecutionResult {
  mode: "live" | "mock";
  fxConversion?: {
    id: string;
    buyCurrency: string;
    sellCurrency: string;
    buyAmount: number;
    sellAmount: number;
    status: string;
  };
  transfer?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    beneficiaryId: string;
  };
  deposit?: {
    id: string;
    amount: number;
    globalAccountId: string;
    status: string;
  };
  notes: string[];
}

export interface DemoState {
  phase: DemoPhase;
  forecastConfidence: number;
  workingCapitalUsd: number;
  depositApplied: boolean;
  depositAmount: number;
  plan: TreasuryPlan | null;
  priorPlan: TreasuryPlan | null;
  execution: ExecutionResult | null;
  globalAccountId: string | null;
  liveMode: boolean;
}
