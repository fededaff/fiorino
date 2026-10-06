"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type {
  DemoState,
  Obligation,
  TreasuryPlan,
} from "@/lib/treasury/types";

interface StatusPayload {
  liveMode: boolean;
  balanceSource: "live" | "mock";
  workingCapitalUsd: number;
  wallet: Array<{ currency: string; available: number; total: number }>;
  obligations: Obligation[];
  demo: DemoState;
  error?: string;
}

const ACTION_LABEL: Record<string, string> = {
  fund: "Fund",
  convert_and_pay: "Convert & pay",
  defer: "Defer",
  escalate: "Escalate",
  hold: "Hold",
};

const ACTION_TONE: Record<string, string> = {
  fund: "bg-emerald-500/15 text-emerald-800 border-emerald-500/30",
  convert_and_pay: "bg-sky-500/15 text-sky-900 border-sky-500/30",
  defer: "bg-amber-500/15 text-amber-900 border-amber-500/30",
  escalate: "bg-rose-500/15 text-rose-900 border-rose-500/30",
  hold: "bg-stone-500/15 text-stone-800 border-stone-500/30",
};

function money(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function phaseIndex(phase: DemoState["phase"]) {
  const order = [
    "idle",
    "planned",
    "confidence_lowered",
    "deposit_applied",
    "recalculated",
    "executed",
  ] as const;
  const idx = order.indexOf(phase === "recalculated" ? "recalculated" : phase);
  if (phase === "deposit_applied") return 3;
  return Math.max(0, idx);
}

export function TreasuryConsole() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventNote, setEventNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/treasury");
    const data = (await res.json()) as StatusPayload;
    if (!res.ok) throw new Error(data.error ?? "Failed to load treasury status");
    setStatus(data);
  }, []);

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message));
  }, [refresh]);

  const run = (path: string, successNote?: string) => {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch(path, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
        if (successNote) setEventNote(successNote);
        if (data.event) setEventNote(data.event);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request failed");
      }
    });
  };

  const reset = () => {
    startTransition(async () => {
      setError(null);
      setEventNote(null);
      await fetch("/api/treasury", { method: "DELETE" });
      await refresh();
    });
  };

  if (!status) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--ink-muted)]">
        Loading Fiorino treasury…
      </div>
    );
  }

  const demo = status.demo;
  const plan = demo.plan as TreasuryPlan | null;
  const step = phaseIndex(demo.phase);
  const progress = Math.min(100, (step / 5) * 100);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6">
      <header className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)]/80 p-6 shadow-[0_24px_80px_-40px_rgba(15,45,40,0.55)] backdrop-blur sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(201,162,39,0.35),transparent_65%)]" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,rgba(34,120,110,0.28),transparent_70%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--ink)] sm:text-5xl">
              Fiorino
            </p>
            <h1 className="text-xl font-medium text-[var(--ink)] sm:text-2xl">
              Adaptive Treasury Controller
            </h1>
            <p className="max-w-xl text-[15px] leading-relaxed text-[var(--ink-muted)]">
              Decide which obligations to fund, convert, defer, or escalate when
              cash is short — preserve the reserve floor, then recalculate when
              a deposit arrives.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-[var(--line)] bg-white/50">
              Kit 1 · Airwallex sandbox
            </Badge>
            <Badge
              variant="outline"
              className={
                status.liveMode
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-950"
              }
            >
              {status.liveMode ? "Live REST" : "Mock execute · MCP verified"}
            </Badge>
          </div>
        </div>
        <div className="relative mt-8 space-y-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            <span>Decision flow</span>
            <span>{demo.phase.replaceAll("_", " ")}</span>
          </div>
          <Progress value={progress} className="h-2 bg-[var(--wash)]" />
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}
      {eventNote ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-[var(--gold-line)] bg-[var(--gold-wash)] px-4 py-3 text-sm text-[var(--ink)]">
          {eventNote}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Metric
          label="Working capital"
          value={money(status.workingCapitalUsd)}
          hint="Demo envelope for scarcity decisions"
        />
        <Metric
          label="Forecast confidence"
          value={`${Math.round(demo.forecastConfidence * 100)}%`}
          hint={
            demo.forecastConfidence < 0.7
              ? "Low — FX autonomy tightened"
              : "High — larger autonomous FX allowed"
          }
        />
        <Metric
          label="Wallet (sandbox)"
          value={
            status.wallet.find((w) => w.currency === "USD")
              ? money(status.wallet.find((w) => w.currency === "USD")!.available)
              : "—"
          }
          hint={`${status.balanceSource} balances · USD/EUR/GBP funded`}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-[var(--line)] bg-[var(--panel)]/90 shadow-none">
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-display)] text-2xl">
              Obligations · 72 hours
            </CardTitle>
            <CardDescription>
              Five payables across USD, EUR, and GBP. Policy chooses what
              survives the reserve floor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {status.obligations.map((o) => {
              const decision = plan?.decisions.find((d) => d.obligationId === o.id);
              return (
                <div
                  key={o.id}
                  className="rounded-2xl border border-[var(--line)] bg-white/55 p-4 transition hover:bg-white/80"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--ink)]">{o.label}</p>
                      <p className="text-sm text-[var(--ink-muted)]">
                        {o.counterparty} · due in {o.dueInHours}h · {o.transferMethod}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium tabular-nums">
                        {money(o.amount, o.currency)}
                      </p>
                      {decision ? (
                        <span
                          className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs ${ACTION_TONE[decision.action]}`}
                        >
                          {ACTION_LABEL[decision.action]}
                          {decision.requiresApproval ? " · approval" : ""}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-[var(--ink-muted)]">{o.notes}</p>
                  {decision ? (
                    <p className="mt-2 text-sm text-[var(--ink)]">{decision.rationale}</p>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-[var(--line)] bg-[var(--panel)]/90 shadow-none">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)] text-2xl">
                Run the flow
              </CardTitle>
              <CardDescription>
                Plan in code → contradict the forecast → simulate deposit →
                recalculate → execute one FX and one supplier transfer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full bg-[var(--teal)] text-white hover:bg-[var(--teal-deep)]"
                disabled={pending || demo.phase !== "idle"}
                onClick={() => run("/api/treasury/plan", "Initial plan computed from policy.")}
              >
                1. Build initial plan
              </Button>
              <Button
                variant="outline"
                className="w-full border-[var(--line)]"
                disabled={pending || !["planned"].includes(demo.phase)}
                onClick={() => run("/api/treasury/confidence")}
              >
                2. Lower forecast confidence
              </Button>
              <Button
                variant="outline"
                className="w-full border-[var(--line)]"
                disabled={
                  pending ||
                  !["confidence_lowered", "planned"].includes(demo.phase) ||
                  demo.depositApplied
                }
                onClick={() =>
                  run(
                    "/api/treasury/deposit",
                    "Deposit landed — recalculating only balance-sensitive decisions.",
                  )
                }
              >
                3. Simulate $25,000 deposit
              </Button>
              <Button
                className="w-full bg-[var(--gold)] text-[var(--ink)] hover:bg-[var(--gold-deep)]"
                disabled={pending || demo.phase !== "recalculated"}
                onClick={() => run("/api/treasury/execute")}
              >
                4. Execute FX + shipping transfer
              </Button>
              <Separator className="my-2 bg-[var(--line)]" />
              <Button
                variant="ghost"
                className="w-full text-[var(--ink-muted)]"
                disabled={pending}
                onClick={reset}
              >
                Reset demo
              </Button>
            </CardContent>
          </Card>

          <Card className="border-[var(--line)] bg-[var(--panel)]/90 shadow-none">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)] text-2xl">
                Plan & execution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {plan ? (
                <>
                  <p className="leading-relaxed text-[var(--ink)]">{plan.summary}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <MiniStat label="Deployable" value={money(plan.deployableUsd)} />
                    <MiniStat
                      label="Reserve left"
                      value={money(plan.remainingReserveUsd)}
                    />
                    <MiniStat
                      label="FX autonomy"
                      value={money(plan.autonomousFxLimitUsd)}
                    />
                    <MiniStat
                      label="Reserve floor"
                      value={money(plan.reserveFloorUsd)}
                    />
                  </div>
                </>
              ) : (
                <p className="text-[var(--ink-muted)]">
                  No plan yet. Start with the initial plan to see fund / convert /
                  defer / escalate decisions.
                </p>
              )}

              {demo.execution ? (
                <div className="space-y-2 rounded-2xl border border-[var(--line)] bg-white/60 p-4">
                  <p className="font-medium">
                    Execution ({demo.execution.mode})
                  </p>
                  {demo.execution.fxConversion ? (
                    <p>
                      FX {demo.execution.fxConversion.sellCurrency}→
                      {demo.execution.fxConversion.buyCurrency}:{" "}
                      {money(
                        demo.execution.fxConversion.buyAmount,
                        demo.execution.fxConversion.buyCurrency,
                      )}{" "}
                      · {demo.execution.fxConversion.status}
                    </p>
                  ) : null}
                  {demo.execution.transfer ? (
                    <p>
                      Transfer {money(demo.execution.transfer.amount)} ·{" "}
                      {demo.execution.transfer.status}
                    </p>
                  ) : null}
                  <ul className="list-disc space-y-1 pl-4 text-[var(--ink-muted)]">
                    {demo.execution.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--line)] bg-[var(--panel)]/85 p-5 shadow-none">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        {value}
      </p>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">{hint}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--wash)] px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
        {label}
      </p>
      <p className="mt-1 font-medium tabular-nums">{value}</p>
    </div>
  );
}
