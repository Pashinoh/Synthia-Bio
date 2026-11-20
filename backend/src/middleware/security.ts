import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { CorsOptions } from 'cors';

export interface AuthenticatedRequest extends Request {
  apiKeyAuthenticated?: boolean;
}

export interface ApiKeyAuthOptions {
  apiKey?: string;
  requireInProduction?: boolean;
}

export interface RateLimitDecision {
  allowed: boolean;
  count: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export interface RateLimitStore {
  readonly kind: 'memory-sliding-window' | 'upstash-redis';
  consume(
    key: string,
    windowMs: number,
    maxRequests: number,
    now: number
  ): Promise<RateLimitDecision> | RateLimitDecision;
}

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  store?: RateLimitStore;
}

function sha256Equal(provided: string, expected: string): boolean {
  const providedDigest = createHash('sha256').update(provided, 'utf8').digest();
  const expectedDigest = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

/**
 * Sets baseline HTTP hardening headers for JSON API responses.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // JSON-only API: no browser resources should be loaded or embedded.
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  // Enforce HTTPS on subsequent visits (no-op over plain HTTP/local dev).
  if (req.secure || req.get('x-forwarded-proto') === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

/**
 * Parses comma-separated ALLOWED_ORIGINS into a fail-closed CORS config.
 * Cross-origin browser requests are rejected when ALLOWED_ORIGINS is empty;
 * non-browser / server-to-server requests (Next.js BFF proxy, curl, healthchecks) omit Origin.
 */
export function buildCorsOptions(explicitOrigins?: string[]): CorsOptions {
  const envOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const normalizedExplicit = explicitOrigins
    ?.map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const allowedSet = new Set(normalizedExplicit ?? envOrigins);

  return {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalized = origin.trim().replace(/\/+$/, '');
      callback(null, allowedSet.has(normalized));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Client-IP']
  };
}

function extractProvidedApiKey(req: Request): string {
  const headerKey = req.get('x-api-key')?.trim() || '';
  if (headerKey) return headerKey;
  const authHeader = req.get('authorization')?.trim() || '';
  return authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
}

/**
 * Constant-time API key authentication middleware for /api/* routes.
 * - Accepts `X-API-Key: <key>` or `Authorization: Bearer <key>`.
 * - Fails closed with 503 in production if SYNTHIA_API_KEY is missing.
 * - Permits local dev/test requests when no key is configured and NODE_ENV !== 'production'.
 */
export function createApiKeyAuth(options: ApiKeyAuthOptions = {}) {
  const requireInProduction = options.requireInProduction ?? true;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    const expectedKey = (
      options.apiKey !== undefined ? options.apiKey : process.env.SYNTHIA_API_KEY || ''
    ).trim();

    if (!expectedKey) {
      if (requireInProduction && process.env.NODE_ENV === 'production') {
        res.status(503).json({
          success: false,
          error: 'Server misconfigured: SYNTHIA_API_KEY is required in production'
        });
        return;
      }
      next();
      return;
    }

    const provided = extractProvidedApiKey(req);

    if (!provided || !sha256Equal(provided, expectedKey)) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: missing or invalid API key'
      });
      return;
    }

    (req as AuthenticatedRequest).apiKeyAuthenticated = true;
    next();
  };
}

/**
 * Lightweight pre-auth tagger that marks requests carrying a valid API key so the
 * rate limiter can run BEFORE auth rejection (blocking key brute-force) while still
 * honoring X-Client-IP forwarded by trusted server-to-server proxies.
 */
export function createApiKeyTagger(options: Pick<ApiKeyAuthOptions, 'apiKey'> = {}) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const expectedKey = (
      options.apiKey !== undefined ? options.apiKey : process.env.SYNTHIA_API_KEY || ''
    ).trim();
    if (expectedKey) {
      const provided = extractProvidedApiKey(req);
      if (provided && sha256Equal(provided, expectedKey)) {
        (req as AuthenticatedRequest).apiKeyAuthenticated = true;
      }
    }
    next();
  };
}

/**
 * Exact sliding-window in-memory rate limit store.
 * Eliminates fixed-window boundary bursts by tracking per-request timestamps.
 */
export class InMemorySlidingWindowStore implements RateLimitStore {
  readonly kind = 'memory-sliding-window' as const;
  private readonly hits = new Map<string, number[]>();

  consume(
    key: string,
    windowMs: number,
    maxRequests: number,
    now: number
  ): RateLimitDecision {
    const cutoff = now - windowMs;

    if (this.hits.size > 1000) {
      for (const [k, timestamps] of this.hits) {
        if (timestamps.length === 0 || timestamps[timestamps.length - 1] <= cutoff) {
          this.hits.delete(k);
        }
      }
    }

    const existing = this.hits.get(key) || [];
    let firstValidIdx = 0;
    while (firstValidIdx < existing.length && existing[firstValidIdx] <= cutoff) {
      firstValidIdx += 1;
    }
    const active = firstValidIdx > 0 ? existing.slice(firstValidIdx) : existing;

    if (active.length >= maxRequests) {
      this.hits.set(key, active);
      const oldest = active[0] ?? now;
      const resetAt = oldest + windowMs;
      return {
        allowed: false,
        count: active.length,
        remaining: 0,
        resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000))
      };
    }

    active.push(now);
    this.hits.set(key, active);
    const oldest = active[0] ?? now;
    const resetAt = oldest + windowMs;

    return {
      allowed: true,
      count: active.length,
      remaining: Math.max(0, maxRequests - active.length),
      resetAt,
      retryAfterSeconds: 0
    };
  }
}

/**
 * Distributed sliding-window rate limit store backed by Upstash Redis REST API.
 * Requires zero external packages (uses Node built-in fetch) and falls back
 * gracefully to in-memory sliding window on transient network errors.
 */
export class UpstashRedisRateLimitStore implements RateLimitStore {
  readonly kind = 'upstash-redis' as const;
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fallback: InMemorySlidingWindowStore;

  constructor(baseUrl: string, token: string, fallback = new InMemorySlidingWindowStore()) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = token;
    this.fallback = fallback;
  }

  async consume(
    key: string,
    windowMs: number,
    maxRequests: number,
    now: number
  ): Promise<RateLimitDecision> {
    const redisKey = `synthia:rl:${key}`;
    const cutoff = now - windowMs;

    try {
      const checkRes = await fetch(`${this.baseUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          ['ZREMRANGEBYSCORE', redisKey, '-inf', String(cutoff)],
          ['ZCARD', redisKey],
          ['ZRANGE', redisKey, '0', '0', 'WITHSCORES']
        ]),
        signal: AbortSignal.timeout(2000)
      });

      if (!checkRes.ok) {
        return this.fallback.consume(key, windowMs, maxRequests, now);
      }

      const results = (await checkRes.json()) as Array<{ result?: unknown }>;
      const count = Number(results[1]?.result ?? 0);
      const oldestRaw = results[2]?.result;
      const oldestScore =
        Array.isArray(oldestRaw) && oldestRaw.length >= 2 ? Number(oldestRaw[1]) : now;

      if (count >= maxRequests) {
        const resetAt = (Number.isFinite(oldestScore) ? oldestScore : now) + windowMs;
        return {
          allowed: false,
          count,
          remaining: 0,
          resetAt,
          retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000))
        };
      }

      const member = `${now}-${randomUUID()}`;
      await fetch(`${this.baseUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          ['ZADD', redisKey, String(now), member],
          ['PEXPIRE', redisKey, String(windowMs + 1000)]
        ]),
        signal: AbortSignal.timeout(2000)
      });

      const nextCount = count + 1;
      const resetAt = (count > 0 && Number.isFinite(oldestScore) ? oldestScore : now) + windowMs;
      return {
        allowed: true,
        count: nextCount,
        remaining: Math.max(0, maxRequests - nextCount),
        resetAt,
        retryAfterSeconds: 0
      };
    } catch {
      return this.fallback.consume(key, windowMs, maxRequests, now);
    }
  }
}

export function createDefaultRateLimitStore(): RateLimitStore {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token) {
    return new UpstashRedisRateLimitStore(url, token);
  }
  return new InMemorySlidingWindowStore();
}

function resolveClientIdentifier(req: Request): string {
  // Only trust X-Client-IP forwarded by an authenticated server-to-server proxy (Next.js BFF)
  if ((req as AuthenticatedRequest).apiKeyAuthenticated) {
    const forwardedClientIp = req.get('x-client-ip')?.trim();
    if (forwardedClientIp && /^[0-9a-fA-F:.]{2,45}$/.test(forwardedClientIp)) {
      return forwardedClientIp;
    }
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Sliding-window rate limiter protecting upstream LLM API quotas.
 * Uses Upstash Redis when configured for distributed multi-instance enforcement,
 * falling back to an exact in-memory sliding-window store.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests, keyPrefix = 'global', store = new InMemorySlidingWindowStore() } =
    options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const now = Date.now();
    const clientIp = resolveClientIdentifier(req);
    const bucketKey = `${keyPrefix}:${clientIp}`;

    const decision = await store.consume(bucketKey, windowMs, maxRequests, now);
    const resetEpochSeconds = Math.ceil(decision.resetAt / 1000);

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(decision.remaining));
    res.setHeader('X-RateLimit-Reset', String(resetEpochSeconds));

    if (!decision.allowed) {
      res.setHeader('Retry-After', String(decision.retryAfterSeconds));
      res.status(429).json({
        success: false,
        error: `Rate limit exceeded. Try again in ${decision.retryAfterSeconds}s.`,
        retryAfterSeconds: decision.retryAfterSeconds
      });
      return;
    }

    next();
  };
}
