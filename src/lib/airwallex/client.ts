import { randomUUID } from "crypto";

const BASE_URL =
  process.env.AWX_API_BASE_URL ?? "https://api.sandbox.airwallex.com";

type TokenCache = { token: string; expiresAt: number };

const globalStore = globalThis as typeof globalThis & {
  __awxToken?: TokenCache;
};

export function hasLiveCredentials(): boolean {
  return Boolean(process.env.AWX_CLIENT_ID && process.env.AWX_API_KEY);
}

async function login(): Promise<string> {
  const clientId = process.env.AWX_CLIENT_ID;
  const apiKey = process.env.AWX_API_KEY;
  if (!clientId || !apiKey) {
    throw new Error("Missing AWX_CLIENT_ID or AWX_API_KEY");
  }

  const cached = globalStore.__awxToken;
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const res = await fetch(`${BASE_URL}/api/v1/authentication/login`, {
    method: "POST",
    headers: {
      "x-client-id": clientId,
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airwallex login failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { token: string; expires_at?: string };
  const expiresAt = data.expires_at
    ? Date.parse(data.expires_at)
    : Date.now() + 25 * 60_000;
  globalStore.__awxToken = { token: data.token, expiresAt };
  return data.token;
}

async function awxFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await login();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(
      `Airwallex ${path} failed (${res.status}): ${text.slice(0, 500)}`,
    );
  }
  return data as T;
}

export interface AwBalance {
  currency: string;
  available_amount: number;
  total_amount: number;
  pending_amount?: number;
  reserved_amount?: number;
}

export async function getBalances(): Promise<AwBalance[]> {
  return awxFetch<AwBalance[]>("/api/v1/balances/current");
}

export async function listGlobalAccounts() {
  return awxFetch<{ items: Array<{ id: string; status: string; country_code: string }> }>(
    "/api/v1/global_accounts",
  );
}

export async function simulateDeposit(input: {
  globalAccountId: string;
  amount: number;
  payerName?: string;
}) {
  return awxFetch<{ id: string; status: string; amount: number }>(
    "/api/v1/simulation/deposit/create",
    {
      method: "POST",
      body: JSON.stringify({
        global_account_id: input.globalAccountId,
        amount: input.amount,
        payer_name: input.payerName ?? "Seed funding",
      }),
    },
  );
}

export async function createFxQuote(input: {
  buyCurrency: string;
  sellCurrency: string;
  buyAmount: number;
}) {
  return awxFetch<{
    quote_id: string;
    client_rate: number;
    buy_amount: number;
    sell_amount: number;
    buy_currency: string;
    sell_currency: string;
  }>("/api/v1/fx/quotes/create", {
    method: "POST",
    body: JSON.stringify({
      buy_currency: input.buyCurrency,
      sell_currency: input.sellCurrency,
      buy_amount: input.buyAmount,
      validity: "MIN_1",
    }),
  });
}

export async function createFxConversion(input: {
  buyCurrency: string;
  sellCurrency: string;
  buyAmount: number;
  quoteId?: string;
}) {
  return awxFetch<{
    conversion_id: string;
    status: string;
    buy_amount: number;
    sell_amount: number;
    buy_currency: string;
    sell_currency: string;
  }>("/api/v1/fx/conversions/create", {
    method: "POST",
    body: JSON.stringify({
      request_id: randomUUID(),
      buy_currency: input.buyCurrency,
      sell_currency: input.sellCurrency,
      buy_amount: input.buyAmount,
      ...(input.quoteId ? { quote_id: input.quoteId } : {}),
    }),
  });
}

export async function createUsBeneficiary(input: {
  companyName: string;
  accountName: string;
  accountNumber: string;
  routingNumber: string;
}) {
  return awxFetch<{ beneficiary_id: string; id?: string }>(
    "/api/v1/beneficiaries/create",
    {
      method: "POST",
      body: JSON.stringify({
        beneficiary: {
          entity_type: "COMPANY",
          company_name: input.companyName,
          type: "BANK_ACCOUNT",
          bank_details: {
            account_currency: "USD",
            account_name: input.accountName,
            account_number: input.accountNumber,
            account_routing_type1: "aba",
            account_routing_value1: input.routingNumber,
            bank_country_code: "US",
            bank_account_category: "Checking",
            local_clearing_system: "ACH",
          },
          address: {
            country_code: "US",
            street_address: "100 Market Street",
            city: "San Francisco",
            state: "US-CA",
            postcode: "94105",
          },
        },
        transfer_methods: ["LOCAL"],
        nickname: input.companyName,
      }),
    },
  );
}

export async function createTransfer(input: {
  beneficiaryId: string;
  amount: number;
  currency: string;
  transferMethod: "LOCAL" | "SWIFT";
  reference: string;
  reason?: string;
}) {
  return awxFetch<{
    payment_id?: string;
    id?: string;
    status: string;
    transfer_amount: number;
    transfer_currency: string;
  }>("/api/v1/transfers/create", {
    method: "POST",
    body: JSON.stringify({
      request_id: randomUUID(),
      beneficiary_id: input.beneficiaryId,
      transfer_amount: input.amount,
      transfer_currency: input.currency,
      source_currency: input.currency,
      transfer_method: input.transferMethod,
      reason: input.reason ?? "business_expenses",
      reference: input.reference.slice(0, 35),
    }),
  });
}

export { randomUUID };
