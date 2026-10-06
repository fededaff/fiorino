import { NextResponse } from "next/server";
import { LOW_FORECAST_CONFIDENCE } from "@/lib/treasury/constants";
import { buildTreasuryPlan } from "@/lib/treasury/policy";
import { getDemoState, setPlan } from "@/lib/treasury/state";

export async function POST() {
  const state = getDemoState();
  state.forecastConfidence = LOW_FORECAST_CONFIDENCE;
  const plan = buildTreasuryPlan({
    workingCapitalUsd: state.workingCapitalUsd,
    forecastConfidence: state.forecastConfidence,
  });
  const next = setPlan(plan, "confidence_lowered");
  return NextResponse.json({
    ok: true,
    event:
      "Customer email contradicts receivable forecast — lowering forecast confidence and FX autonomy.",
    demo: next,
    plan,
  });
}
