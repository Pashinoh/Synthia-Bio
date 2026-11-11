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
  };
}

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_GROQ_MODEL = 'qwen/qwen3.8-27b';

async function callGroqModel(
  apiKey: string,
  model: string,
  pathogen: PathogenProfile,
  params: PeptideDesignParams
): Promise<ProviderGenerationResult> {
  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.65,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: AMP_SYSTEM_INSTRUCTION },
        { role: 'user', content: buildPeptidePrompt(pathogen, params) }
      ]
    }),
    signal: AbortSignal.timeout(10000)
  });

  const payload = (await response.json()) as GroqChatResponse;
  if (!response.ok) {
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
 * Generates an AMP candidate using Groq REST API without external SDK overhead.
 * Automatically tries a secondary active Groq model if the primary model fails.
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
    return await callGroqModel(apiKey, primaryModel, pathogen, params);
  } catch (primaryErr) {
    if (primaryModel === FALLBACK_GROQ_MODEL) {
      throw primaryErr;
    }
    console.warn(`[SynthiaBio Groq] ${primaryModel} failed, trying ${FALLBACK_GROQ_MODEL}:`, primaryErr);
    return await callGroqModel(apiKey, FALLBACK_GROQ_MODEL, pathogen, params);
  }
}
