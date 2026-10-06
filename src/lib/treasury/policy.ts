import {
  HIGH_CONFIDENCE_FX_LIMIT_USD,
  INDICATIVE_USD_RATES,
  LOW_CONFIDENCE_FX_LIMIT_USD,
  OBLIGATIONS,
  RESERVE_FLOOR_USD,
  SWIFT_FEE_EUR,
} from "./constants";
import type {
  Decision,
  Obligation,
  TreasuryPlan,
} from "./types";

function toUsd(amount: number, currency: Obligation["currency"]): number {
  return Number((amount * INDICATIVE_USD_RATES[currency]).toFixed(2));
}

function eurConversionCost(eurAmount: number): number {
  return toUsd(eurAmount + SWIFT_FEE_EUR, "EUR");
}

function autonomousFxLimit(forecastConfidence: number): number {
  return forecastConfidence >= 0.7
    ? HIGH_CONFIDENCE_FX_LIMIT_USD
    : LOW_CONFIDENCE_FX_LIMIT_USD;
}

/**
 * Policy-first planner: reserve floor, ops priority, FX autonomy limits.
 * Thresholds live in code — not prompts.
 */
export function buildTreasuryPlan(input: {
  workingCapitalUsd: number;
  forecastConfidence: number;
  reserveFloorUsd?: number;
}): TreasuryPlan {
  const reserveFloorUsd = input.reserveFloorUsd ?? RESERVE_FLOOR_USD;
  const deployableUsd = Math.max(0, input.workingCapitalUsd - reserveFloorUsd);
  const fxLimit = autonomousFxLimit(input.forecastConfidence);

  let remaining = deployableUsd;
  const decisions: Decision[] = [];

  const byId = Object.fromEntries(OBLIGATIONS.map((o) => [o.id, o]));

  // 1) Always fund critical ops shipping if deployable cash covers it.
  const shipping = byId["ship-harbor"];
  if (shipping && remaining >= shipping.amount) {
    remaining -= shipping.amount;
    decisions.push({
      obligationId: shipping.id,
      action: "fund",
      rationale:
        "Critical operations invoice — non-payment stops warehouse dispatch.",
      estimatedUsdCost: shipping.amount,
      requiresApproval: false,
    });
  } else if (shipping) {
    decisions.push({
      obligationId: shipping.id,
      action: "hold",
      rationale: "Insufficient deployable cash after reserve floor for shipping.",
      estimatedUsdCost: shipping.amount,
      requiresApproval: true,
    });
  }

  // 2) Convert + pay time-sensitive EUR supplier if within FX autonomy.
  const rhine = byId["parts-rhine"];
  if (rhine) {
    const cost = eurConversionCost(rhine.amount);
    const withinAutonomy = cost <= fxLimit;
    if (remaining >= cost && withinAutonomy) {
      remaining -= cost;
      decisions.push({
        obligationId: rhine.id,
        action: "convert_and_pay",
        rationale: `Convert minimum USD→EUR for time-sensitive supplier (SWIFT fee €${SWIFT_FEE_EUR}). Within FX autonomy $${fxLimit}.`,
        estimatedUsdCost: cost,
        requiresApproval: false,
        fxBuyAmount: rhine.amount + SWIFT_FEE_EUR,
        fxBuyCurrency: "EUR",
        fxSellCurrency: "USD",
      });
    } else if (remaining >= cost && !withinAutonomy) {
      decisions.push({
        obligationId: rhine.id,
        action: "escalate",
        rationale: `Forecast confidence ${(input.forecastConfidence * 100).toFixed(0)}% lowers FX autonomy to $${fxLimit}; conversion of ~$${cost} needs human approval.`,
        estimatedUsdCost: cost,
        requiresApproval: true,
        fxBuyAmount: rhine.amount + SWIFT_FEE_EUR,
        fxBuyCurrency: "EUR",
        fxSellCurrency: "USD",
      });
    } else {
      decisions.push({
        obligationId: rhine.id,
        action: "hold",
        rationale: "Not enough deployable cash for EUR conversion + SWIFT fee.",
        estimatedUsdCost: cost,
        requiresApproval: true,
      });
    }
  }

  // 3) Defer cheapest standard obligation.
  const saas = byId["saas-pacific"];
  if (saas) {
    decisions.push({
      obligationId: saas.id,
      action: "defer",
      rationale: "Cheapest obligation — defer one cycle to protect reserve.",
      estimatedUsdCost: saas.amount,
      requiresApproval: false,
    });
  }

  // 4) Escalate policy exception bonus.
  const bonus = byId["bonus-policy"];
  if (bonus) {
    decisions.push({
      obligationId: bonus.id,
      action: "escalate",
      rationale: "Discretionary spend exceeds policy — dual approval required.",
      estimatedUsdCost: bonus.amount,
      requiresApproval: true,
    });
  }

  // 5) Counsel — fund only if surplus remains after higher priorities.
  const counsel = byId["counsel-uk"];
  if (counsel) {
    const cost = toUsd(counsel.amount, "GBP");
    if (remaining >= cost && input.forecastConfidence >= 0.7) {
      remaining -= cost;
      decisions.push({
        obligationId: counsel.id,
        action: "convert_and_pay",
        rationale: "Surplus after ops priorities — convert USD→GBP for retainer.",
        estimatedUsdCost: cost,
        requiresApproval: false,
        fxBuyAmount: counsel.amount,
        fxBuyCurrency: "GBP",
        fxSellCurrency: "USD",
      });
    } else {
      decisions.push({
        obligationId: counsel.id,
        action: "defer",
        rationale: "Defer counsel until deposit or higher forecast confidence.",
        estimatedUsdCost: cost,
        requiresApproval: false,
      });
    }
  }

  const funded = decisions.filter((d) =>
    d.action === "fund" || d.action === "convert_and_pay",
  );
  const remainingReserveUsd = Number(
    (reserveFloorUsd + remaining).toFixed(2),
  );

  return {
    generatedAt: new Date().toISOString(),
    reserveFloorUsd,
    deployableUsd: Number(deployableUsd.toFixed(2)),
    remainingReserveUsd,
    forecastConfidence: input.forecastConfidence,
    autonomousFxLimitUsd: fxLimit,
    decisions,
    summary: `Fund ${funded.length} obligation(s); reserve floor $${reserveFloorUsd.toLocaleString()} held. FX autonomy $${fxLimit.toLocaleString()} at ${(input.forecastConfidence * 100).toFixed(0)}% forecast confidence.`,
  };
}

export function obligationMap(): Record<string, Obligation> {
  return Object.fromEntries(OBLIGATIONS.map((o) => [o.id, o]));
}
