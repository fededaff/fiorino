import { NextResponse } from "next/server";
import {
  createFxConversion,
  createFxQuote,
  createTransfer,
  createUsBeneficiary,
  hasLiveCredentials,
} from "@/lib/airwallex/client";
import { INDICATIVE_USD_RATES } from "@/lib/treasury/constants";
import { obligationMap } from "@/lib/treasury/policy";
import { getDemoState, setExecution } from "@/lib/treasury/state";
import type { ExecutionResult } from "@/lib/treasury/types";

export async function POST() {
  const state = getDemoState();
  if (!state.plan) {
    return NextResponse.json(
      { error: "Run a plan before executing." },
      { status: 400 },
    );
  }

  const obligations = obligationMap();
  const fundDecision = state.plan.decisions.find((d) => d.action === "fund");
  const convertDecision = state.plan.decisions.find(
    (d) => d.action === "convert_and_pay" && !d.requiresApproval,
  );

  if (!fundDecision) {
    return NextResponse.json(
      {
        error:
          "No autonomous fund decision available. Deposit or raise confidence first.",
      },
      { status: 409 },
    );
  }

  const shipping = obligations[fundDecision.obligationId];
  const notes: string[] = [];

  if (hasLiveCredentials()) {
    try {
      let fxConversion: ExecutionResult["fxConversion"];
      if (convertDecision?.fxBuyAmount && convertDecision.fxBuyCurrency) {
        const quote = await createFxQuote({
          buyCurrency: convertDecision.fxBuyCurrency,
          sellCurrency: convertDecision.fxSellCurrency ?? "USD",
          buyAmount: convertDecision.fxBuyAmount,
        });
        const conversion = await createFxConversion({
          buyCurrency: convertDecision.fxBuyCurrency,
          sellCurrency: convertDecision.fxSellCurrency ?? "USD",
          buyAmount: convertDecision.fxBuyAmount,
          quoteId: quote.quote_id,
        });
        fxConversion = {
          id: conversion.conversion_id,
          buyCurrency: conversion.buy_currency,
          sellCurrency: conversion.sell_currency,
          buyAmount: conversion.buy_amount,
          sellAmount: conversion.sell_amount,
          status: conversion.status,
        };
        notes.push(
          `Booked FX quote ${quote.quote_id} then conversion ${conversion.conversion_id}.`,
        );
      } else {
        notes.push("No autonomous FX conversion in current plan.");
      }

      const beneficiary = await createUsBeneficiary({
        companyName: shipping.counterparty,
        accountName: shipping.counterparty,
        accountNumber: "8489600841",
        routingNumber: "026073150",
      });
      const beneficiaryId =
        beneficiary.beneficiary_id || beneficiary.id || "";
      const transfer = await createTransfer({
        beneficiaryId,
        amount: shipping.amount,
        currency: shipping.currency,
        transferMethod: shipping.transferMethod,
        reference: `Fiorino ${shipping.id}`,
        reason: "business_expenses",
      });
      const transferId = transfer.payment_id || transfer.id || "";

      const execution = setExecution({
        mode: "live",
        fxConversion,
        transfer: {
          id: transferId,
          amount: shipping.amount,
          currency: shipping.currency,
          status: transfer.status,
          beneficiaryId,
        },
        notes: [
          ...notes,
          `Paid ${shipping.counterparty} $${shipping.amount.toLocaleString()} via LOCAL ACH.`,
          `Remaining reserve after plan: $${state.plan.remainingReserveUsd.toLocaleString()}.`,
        ],
      });

      return NextResponse.json({ ok: true, demo: execution });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Execution failed",
        },
        { status: 502 },
      );
    }
  }

  // Mock path — still shows the financial action for the demo.
  const sellAmount = convertDecision?.fxBuyAmount
    ? Number(
        (
          convertDecision.fxBuyAmount *
          INDICATIVE_USD_RATES[convertDecision.fxBuyCurrency ?? "EUR"]
        ).toFixed(2),
      )
    : undefined;

  const execution = setExecution({
    mode: "mock",
    fxConversion: convertDecision?.fxBuyAmount
      ? {
          id: `mock_fx_${Date.now()}`,
          buyCurrency: convertDecision.fxBuyCurrency ?? "EUR",
          sellCurrency: "USD",
          buyAmount: convertDecision.fxBuyAmount,
          sellAmount: sellAmount ?? 0,
          status: "SETTLED",
        }
      : undefined,
    transfer: {
      id: `mock_tr_${Date.now()}`,
      amount: shipping.amount,
      currency: shipping.currency,
      status: "PROCESSING",
      beneficiaryId: "mock_ben_harbor",
    },
    notes: [
      "Running in mock mode (set AWX_CLIENT_ID + AWX_API_KEY for live sandbox REST).",
      "Developer MCP already verified Global Accounts, balances, FX quotes, and beneficiary schema.",
      `Would pay ${shipping.counterparty} $${shipping.amount.toLocaleString()} and settle FX when live.`,
      `Remaining reserve after plan: $${state.plan.remainingReserveUsd.toLocaleString()}.`,
    ],
  });

  return NextResponse.json({ ok: true, demo: execution });
}
