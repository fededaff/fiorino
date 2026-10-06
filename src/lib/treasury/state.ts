import {
  DEFAULT_FORECAST_CONFIDENCE,
  DEMO_DEPOSIT_USD,
  INITIAL_WORKING_CAPITAL_USD,
  USD_GLOBAL_ACCOUNT_ID,
} from "./constants";
import type { DemoState, ExecutionResult, TreasuryPlan } from "./types";

const globalStore = globalThis as typeof globalThis & {
  __fiorinoDemo?: DemoState;
};

function blankState(): DemoState {
  return {
    phase: "idle",
    forecastConfidence: DEFAULT_FORECAST_CONFIDENCE,
    workingCapitalUsd: INITIAL_WORKING_CAPITAL_USD,
    depositApplied: false,
    depositAmount: DEMO_DEPOSIT_USD,
    plan: null,
    priorPlan: null,
    execution: null,
    globalAccountId: USD_GLOBAL_ACCOUNT_ID,
    liveMode: Boolean(
      process.env.AWX_CLIENT_ID && process.env.AWX_API_KEY,
    ),
  };
}

export function getDemoState(): DemoState {
  if (!globalStore.__fiorinoDemo) {
    globalStore.__fiorinoDemo = blankState();
  }
  return globalStore.__fiorinoDemo;
}

export function resetDemoState(): DemoState {
  globalStore.__fiorinoDemo = blankState();
  return globalStore.__fiorinoDemo;
}

export function setPlan(plan: TreasuryPlan, phase: DemoState["phase"]) {
  const state = getDemoState();
  if (state.plan) state.priorPlan = state.plan;
  state.plan = plan;
  state.phase = phase;
  return state;
}

export function setExecution(execution: ExecutionResult) {
  const state = getDemoState();
  state.execution = execution;
  state.phase = "executed";
  return state;
}
