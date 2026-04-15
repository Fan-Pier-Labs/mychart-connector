import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth-helpers';
import { geminiProvider } from '@/lib/ai/gemini';
import { checkSpendLimit, recordUsage, SpendLimitError } from '@/lib/ai/usage';
import type { AiMessage } from '@/lib/ai/types';

const provider = geminiProvider;

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const body = await req.json();
    const messages: AiMessage[] = body.messages;
    const model: string | undefined = body.model;
    const system: string | undefined = body.system;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages must be a non-empty array' },
        { status: 400 },
      );
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content || !['user', 'assistant'].includes(msg.role)) {
        return NextResponse.json(
          { error: 'Each message must have a role ("user" or "assistant") and content' },
          { status: 400 },
        );
      }
    }

    // Check spending limit before making the API call
    await checkSpendLimit(user.id);

    const result = await provider.chat({ messages, model, system });

    // Record the usage
    const spend = await recordUsage(
      user.id,
      result.usage.inputTokens,
      result.usage.outputTokens,
    );

    return NextResponse.json({
      content: result.content,
      model: result.model,
      usage: result.usage,
      spend: {
        spentCents: spend.spentCents,
        limitCents: spend.limitCents,
        remainingCents: spend.remainingCents,
        period: spend.period,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof SpendLimitError) {
      return NextResponse.json(
        { error: err.message, spend: err.spend },
        { status: 429 },
      );
    }
    console.error('[ai] Error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { getUserSpend } = await import('@/lib/ai/usage');
    const spend = await getUserSpend(user.id);
    return NextResponse.json(spend);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
