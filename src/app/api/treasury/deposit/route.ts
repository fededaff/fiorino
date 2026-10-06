import { NextResponse } from "next/server";
import {
  hasLiveCredentials,
  simulateDeposit,
} from "@/lib/airwallex/client";
import { DEMO_DEPOSIT_USD } from "@/lib/treasury/constants";
import { buildTreasuryPlan } from "@/lib/treasury/policy";
import { getDemoState, setPlan } from "@/lib/treasury/state";

export async function POST() {
  const state = getDemoState();
  if (state.depositApplied) {
    return NextResponse.json(
      { error: "Deposit already applied in this demo run." },
      { status: 409 },
    );
  }

  let depositMeta: {
    id: string;
    amount: number;
    status: string;
    mode: "live" | "mock";
  };

  if (hasLiveCredentials() && state.globalAccountId) {
    try {
      const deposit = await simulateDeposit({
        globalAccountId: state.globalAccountId,
        amount: DEMO_DEPOSIT_USD,
        payerName: "Customer receivable — seed funding",
      });
      depositMeta = {
        id: deposit.id,
        amount: DEMO_DEPOSIT_USD,
        status: deposit.status,
        mode: "live",
      };
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Deposit simulation failed",
        },
        { status: 502 },
      );
    }
  } else {
    depositMeta = {
      id: `mock_dep_${Date.now()}`,
      amount: DEMO_DEPOSIT_USD,
      status: "PENDING",
      mode: "mock",
    };
  }

  state.workingCapitalUsd += DEMO_DEPOSIT_USD;
  state.depositApplied = true;
  const plan = buildTreasuryPlan({
    workingCapitalUsd: state.workingCapitalUsd,
    forecastConfidence: state.forecastConfidence,
  });
  const next = setPlan(plan, "recalculated");
  next.phase = "recalculated";

  return NextResponse.json({
    ok: true,
    deposit: depositMeta,
    note: "Sandbox deposit responses may say PENDING while balance is available immediately.",
    demo: next,
    plan,
  });
}
