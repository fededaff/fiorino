import { NextResponse } from "next/server";
import { getBalances, hasLiveCredentials } from "@/lib/airwallex/client";
import { OBLIGATIONS } from "@/lib/treasury/constants";
import { getDemoState, resetDemoState } from "@/lib/treasury/state";

export async function GET() {
  const state = getDemoState();
  let wallet: Array<{ currency: string; available: number; total: number }> = [];
  let source: "live" | "mock" = "mock";

  if (hasLiveCredentials()) {
    try {
      const balances = await getBalances();
      wallet = balances
        .filter((b) => b.available_amount > 0)
        .map((b) => ({
          currency: b.currency,
          available: b.available_amount,
          total: b.total_amount,
        }));
      source = "live";
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to load balances",
          liveMode: false,
        },
        { status: 502 },
      );
    }
  } else {
    wallet = [
      { currency: "USD", available: 10000100, total: 10000100 },
      { currency: "EUR", available: 10000000, total: 10000000 },
      { currency: "GBP", available: 10000000, total: 10000000 },
    ];
  }

  return NextResponse.json({
    liveMode: hasLiveCredentials(),
    balanceSource: source,
    workingCapitalUsd: state.workingCapitalUsd,
    wallet,
    obligations: OBLIGATIONS,
    demo: state,
  });
}

export async function DELETE() {
  const state = resetDemoState();
  return NextResponse.json({ ok: true, demo: state });
}
