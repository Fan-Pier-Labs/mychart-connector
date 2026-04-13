/**
 * Per-user AI usage tracking and spending limits.
 *
 * Tracks monthly spend on the user table (ai_spend_cents + ai_spend_period).
 * The period resets on the 1st of each month.
 */

import { Pool } from 'pg';
import { getPoolOptions } from '../mcp/config';

/** $50/month limit expressed in cents */
const MONTHLY_LIMIT_CENTS = 50_00;

/** Gemini 2.5 Flash pricing per 1M tokens (thinking tokens are free) */
const INPUT_COST_PER_MILLION = 0.15; // $0.15 per 1M input tokens
const OUTPUT_COST_PER_MILLION = 0.60; // $0.60 per 1M output tokens (non-thinking)

let pool: Pool | null = null;

async function getPool(): Promise<Pool> {
  if (pool) return pool;
  const opts = await getPoolOptions();
  pool = new Pool(opts);
  return pool;
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function calculateCostCents(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;
  return Math.ceil((inputCost + outputCost) * 100); // round up to nearest cent
}

export interface SpendInfo {
  spentCents: number;
  limitCents: number;
  remainingCents: number;
  period: string;
}

/**
 * Get the user's current monthly spend. Resets if the period has rolled over.
 */
export async function getUserSpend(userId: string): Promise<SpendInfo> {
  const db = await getPool();
  const period = currentPeriod();

  const result = await db.query(
    `SELECT ai_spend_cents, ai_spend_period FROM "user" WHERE id = $1`,
    [userId],
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const row = result.rows[0];
  const storedPeriod = row.ai_spend_period as string | null;
  const storedCents = (row.ai_spend_cents as number) ?? 0;

  // If the period doesn't match, the spend has effectively reset
  const spentCents = storedPeriod === period ? storedCents : 0;

  return {
    spentCents,
    limitCents: MONTHLY_LIMIT_CENTS,
    remainingCents: Math.max(0, MONTHLY_LIMIT_CENTS - spentCents),
    period,
  };
}

/**
 * Check if the user can make a request (hasn't exceeded the monthly limit).
 */
export async function checkSpendLimit(userId: string): Promise<SpendInfo> {
  const spend = await getUserSpend(userId);
  if (spend.remainingCents <= 0) {
    throw new SpendLimitError(spend);
  }
  return spend;
}

/**
 * Record token usage for a completed request.
 */
export async function recordUsage(
  userId: string,
  inputTokens: number,
  outputTokens: number,
): Promise<SpendInfo> {
  const db = await getPool();
  const period = currentPeriod();
  const costCents = calculateCostCents(inputTokens, outputTokens);

  // Atomically update: if the stored period matches, increment; otherwise reset to this cost
  await db.query(
    `UPDATE "user"
     SET ai_spend_cents = CASE
           WHEN ai_spend_period = $2 THEN COALESCE(ai_spend_cents, 0) + $3
           ELSE $3
         END,
         ai_spend_period = $2
     WHERE id = $1`,
    [userId, period, costCents],
  );

  return getUserSpend(userId);
}

export class SpendLimitError extends Error {
  spend: SpendInfo;
  constructor(spend: SpendInfo) {
    super(
      `Monthly AI spending limit reached ($${(spend.limitCents / 100).toFixed(2)}/month). Resets next month.`,
    );
    this.name = 'SpendLimitError';
    this.spend = spend;
  }
}
