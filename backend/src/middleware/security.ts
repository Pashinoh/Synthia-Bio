import { NextFunction, Request, Response } from 'express';
import { CorsOptions } from 'cors';

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

/**
 * Sets baseline HTTP hardening headers for JSON API responses.
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

/**
 * Parses comma-separated ALLOWED_ORIGINS into a CORS config.
 * When unset/empty, allows local & preview requests seamlessly for development.
 */
export function buildCorsOptions(explicitOrigins?: string[]): CorsOptions {
  const envOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const origins = explicitOrigins ?? envOrigins;
  if (origins.length === 0) {
    return {
      origin: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    };
  }

  const allowedSet = new Set(origins);
  return {
    origin: (origin, callback) => {
      // Allow non-browser clients (curl, healthchecks, server-to-server) without Origin header
      if (!origin || allowedSet.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
}

/**
 * Lightweight fixed-window in-memory rate limiter keyed by client IP.
 * Protects upstream LLM API quotas without external dependencies.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests, keyPrefix = 'global' } = options;
  const buckets = new Map<string, RateBucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();

    // Opportunistic sweep to bound memory under many distinct client IPs
    if (buckets.size > 1000) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) {
          buckets.delete(key);
        }
      }
    }

    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const bucketKey = `${keyPrefix}:${clientIp}`;
    const existing = buckets.get(bucketKey);

    const bucket: RateBucket =
      !existing || existing.resetAt <= now
        ? { count: 0, resetAt: now + windowMs }
        : existing;

    bucket.count += 1;
    buckets.set(bucketKey, bucket);

    const remaining = Math.max(0, maxRequests - bucket.count);
    const resetEpochSeconds = Math.ceil(bucket.resetAt / 1000);

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetEpochSeconds));

    if (bucket.count > maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        success: false,
        error: `Rate limit exceeded. Try again in ${retryAfterSeconds}s.`,
        retryAfterSeconds
      });
      return;
    }

    next();
  };
}
