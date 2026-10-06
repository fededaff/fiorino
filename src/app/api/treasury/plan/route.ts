import { NextResponse } from "next/server";
import { buildTreasuryPlan } from "@/lib/treasury/policy";
import { getDemoState, setPlan } from "@/lib/treasury/state";

export async function POST() {
  const state = getDemoState();
  const plan = buildTreasuryPlan({
    workingCapitalUsd: state.workingCapitalUsd,
    forecastConfidence: state.forecastConfidence,
  });
  const next = setPlan(plan, state.phase === "idle" ? "planned" : state.phase);
  return NextResponse.json({ ok: true, demo: next, plan });
}
