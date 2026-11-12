import { PathogenProfile, PeptideDesignParams } from '../types/peptide';
import {
  AMP_SYSTEM_INSTRUCTION,
  buildPeptidePrompt,
  normalizeAiPeptideOutput,
  RawAiPeptideOutput
} from './prompt-utils';

export interface ProviderGenerationResult {
  output: RawAiPeptideOutput;
  provider: 'gemini' | 'groq' | 'heuristic';
  model: string;
}

interface GroqChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
    code?: string;
  };
}

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_GROQ_MODEL = 'qwen/qwen3.8-27b';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGroqModel(
  apiKey: string,
  model: string,
  pathogen: PathogenProfile,
  params: PeptideDesignParams,
  useJsonMode = true
): Promise<ProviderGenerationResult> {
  const isGptOss = model.startsWith('openai/gpt-oss');

  const bodyPayload: Record<string, unknown> = {
    model,
    temperature: 0.65,
    max_completion_tokens: isGptOss ? 1100 : 550,
    ...(isGptOss ? { reasoning_effort: 'low' } : {}),
    ...(useJsonMode ? { response_format: { type: 'json_object' } } : {}),
    messages: [
      { role: 'system', content: AMP_SYSTEM_INSTRUCTION },
      { role: 'user', content: buildPeptidePrompt(pathogen, params) }
    ]
  };

  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bodyPayload),
    signal: AbortSignal.timeout(7000)
  });

  if (response.status === 429) {
    const retryHeader = Number(response.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryHeader) && retryHeader > 0 ? Math.min(retryHeader * 1000, 2200) : 1200;
    await sleep(waitMs);
    const retryRes = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(7000)
    });
    const retryPayload = (await retryRes.json()) as GroqChatResponse;
    if (!retryRes.ok) {
      throw new Error(retryPayload.error?.message || `Groq HTTP ${retryRes.status}`);
    }
    const retryContent = retryPayload.choices?.[0]?.message?.content;
    if (!retryContent) {
      throw new Error(`Groq (${model}) returned empty content on retry`);
    }
    return {
      output: normalizeAiPeptideOutput(retryContent, pathogen, params.sequenceLength),
      provider: 'groq',
      model
    };
  }

  const payload = (await response.json()) as GroqChatResponse;
  if (!response.ok) {
    // If strict json_object validation failed on Groq, retry once in raw mode
    if (response.status === 400 && useJsonMode) {
      return callGroqModel(apiKey, model, pathogen, params, false);
    }
    throw new Error(payload.error?.message || `Groq HTTP ${response.status}`);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`Groq (${model}) returned empty content`);
  }

  return {
    output: normalizeAiPeptideOutput(content, pathogen, params.sequenceLength),
    provider: 'groq',
    model
  };
}

/**
 * Generates an AMP candidate using Groq REST API with low reasoning overhead (~450 tokens/call).
 * Automatically retries transient JSON/rate-limit hiccups and falls back to secondary model if needed.
 */
export async function generateWithGroq(
  pathogen: PathogenProfile,
  params: PeptideDesignParams
): Promise<ProviderGenerationResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const primaryModel = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  try {
    return await callGroqModel(apiKey, primaryModel, pathogen, params, true);
  } catch (primaryErr) {
    if (primaryModel === FALLBACK_GROQ_MODEL) {
      throw primaryErr;
    }
    console.warn(`[SynthiaBio Groq] ${primaryModel} failed, trying ${FALLBACK_GROQ_MODEL}:`, primaryErr);
    return await callGroqModel(apiKey, FALLBACK_GROQ_MODEL, pathogen, params, true);
  }
}
