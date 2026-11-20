# SynthiaBio Security Review

**Repository:** `Synthia-Bio`  
**Scope:** `frontend/src/`, `backend/src/`, `docs/`  
**Commit reviewed:** `c808aa9` (HEAD, clean working tree)  
**Review date:** 2026-11-20  
**Reviewer:** Automated security review (source-grounded, no live targets probed)

---

## 1. Executive Summary

SynthiaBio is a hackathon monorepo consisting of a Next.js 16 frontend studio and an Express TypeScript backend (`:5000`) that synthesizes antimicrobial peptide (AMP) sequences via Gemini/Groq AI with deterministic biophysical validation, 3D PDB/mmCIF generation, protease stability scoring, and wet-lab SPPS export.

The most significant security issue is the **complete absence of authentication and authorization**: every API endpoint is reachable by any network caller with no identity check. Secondary issues include a **permissive CORS default**, an **in-memory rate limiter that is bypassable**, **user input embedded in AI prompts**, and a **frontend module that reads `GEMINI_API_KEY` from env**.

No hardcoded secrets, command injection, path traversal, unsafe deserialization, or memory-safety issues were found.

## 2. Threat Model

| Actor | Capability | Goal |
|---|---|---|
| Unauthenticated HTTP caller | Can POST to any `/api/*` endpoint | Consume operator LLM quota, submit arbitrary peptides |
| Any website (cross-origin) | Can cause a visitor's browser to call the API | Exfiltrate nothing (no auth/session), but cause quota drain |
| Frontend bundle reader | Can inspect client-side JS | Potentially read `GEMINI_API_KEY` if imported client-side |

**Protected resources:** Operator's Gemini/Groq LLM API quota (paid). No user data, no tenant isolation, no credentials stored in the repo.

## 3. Findings

### F1 — No authentication or authorization on any API endpoint (HIGH) — FIXED

**Status:** FIXED — backend API key middleware + Next.js server-only BFF proxy (`/api/backend/*`).

**Boundary:** API entry — unauthenticated network caller → backend Express `:5000`  
**Source:**
- `backend/src/middleware/security.ts` (`createApiKeyAuth`, `createApiKeyTagger` using SHA-256 + `crypto.timingSafeEqual`)
- `backend/src/app.ts` (`app.use('/api', apiKeyTagger, generalApiLimiter, apiKeyAuth)`, `/health` exempt)
- `frontend/src/app/api/backend/[...path]/route.ts` (allowlisted same-origin BFF proxy injecting server-only `SYNTHIA_API_KEY`)
- `frontend/src/store/usePeptideStore.ts` (routed through `/api/backend/*` instead of exposing secrets or calling Express cross-origin)

**Fix applied:** Added constant-time `X-API-Key` / `Authorization: Bearer` authentication on all `/api/*` routes. In `NODE_ENV=production`, missing `SYNTHIA_API_KEY` fails closed with `503 Service Unavailable`. Browser requests go exclusively through Next.js same-origin BFF routes (enforcing `Origin` check + route allowlist) which attach `SYNTHIA_API_KEY` server-side so no secret ever ships in client bundles.  
**Severity:** HIGH — resolved.

---

### F2 — CORS allows all origins when `ALLOWED_ORIGINS` is unset (MEDIUM) — FIXED

**Status:** FIXED — fail-closed CORS allowlist.

**Boundary:** CORS — browser origin → backend  
**Source:** `backend/src/middleware/security.ts` (`buildCorsOptions`)  
**Fix applied:** Removed the permissive `{ origin: true }` fallback when `ALLOWED_ORIGINS` is empty. Cross-origin browser requests are now rejected (no `Access-Control-Allow-Origin` header) unless explicitly listed in `ALLOWED_ORIGINS` (trailing slashes normalized). Non-browser / server-to-server calls without an `Origin` header (such as Next.js BFF proxy, `curl`, and healthchecks) remain permitted.  
**Severity:** MEDIUM — resolved.

---

### F3 — In-memory rate limiter is bypassable (MEDIUM) — FIXED

**Status:** FIXED — exact sliding-window rate limiter + pluggable Upstash Redis distributed store + authenticated proxy IP isolation.

**Boundary:** Rate limiting — client IP → backend AI endpoints  
**Source:** `backend/src/middleware/security.ts` (`InMemorySlidingWindowStore`, `UpstashRedisRateLimitStore`, `createDefaultRateLimitStore`, `createRateLimiter`), `backend/src/app.ts` (`TRUST_PROXY_HOPS`)  
**Fix applied:**
- Replaced fixed-window counting with an exact **sliding-window timestamp algorithm** (`InMemorySlidingWindowStore`) eliminating window-boundary burst exploits.
- Added zero-dependency distributed **`UpstashRedisRateLimitStore`** (activated automatically when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are configured, with graceful fallback to in-memory sliding window on transient network failure).
- Added configurable `TRUST_PROXY_HOPS` and authenticated BFF `X-Client-IP` forwarding (honored only when `apiKeyAuthenticated === true`, preventing unauthenticated IP spoofing while keeping per-end-user rate limiting behind the Next.js proxy).
- Placed `generalApiLimiter` ahead of auth rejection so invalid-key brute-force attempts are also rate-limited (`429`).

**Severity:** MEDIUM — resolved.

---

### F4 — User input embedded in AI prompts (LOW) — FIXED

**Status:** FIXED on branch `fix/random-peptide-ids` (commit `9507136`).

**Boundary:** LLM prompt construction — user-controlled `pathogenId`, `customPathogenName`, `safetyThreshold`, `poreMechanism`, `sequenceLength` → prompt sent to Gemini/Groq  
**Source:** `backend/src/ai/prompt-utils.ts:27-46` (`buildPeptidePrompt` + new `sanitizeForPrompt`)  
**Fix applied:** Added `sanitizeForPrompt()` which strips quote/backslash/newline/backtick characters, collapses whitespace, trims, and limits to 200 chars. Applied to `pathogen.name`, `pathogen.scientificName`, and `pathogen.membraneCharacteristics.barrierDescription` in `buildPeptidePrompt`. These are the only user-controllable string fields (via `customPathogenName`); enum-like fields (`gramType`, `whoPriority`, `poreMechanism`, `safetyThreshold`) and numbers are not interpolated raw.  
**Severity:** LOW — resolved.

**Verification:** `tsc --noEmit` clean; all 18 backend tests pass.

---

### F5 — Frontend `GoogleGenAI` client reads `GEMINI_API_KEY` from env (LOW) — FIXED

**Status:** FIXED on branch `fix/random-peptide-ids` (commit `9507136`).

**Boundary:** API key material — server env → frontend bundle  
**Source:** `frontend/src/app/api/generate/route.ts` (moved from `frontend/src/lib/gemini.ts`)  
**Fix applied:** Moved `generatePeptideWithGemini` (which calls `new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })`) out of shared `lib/gemini.ts` into the server-only Next.js API route `route.ts`. `lib/gemini.ts` now exports only `generateHeuristicPeptide` — a pure function with no API key, safe to import from client components.  
**Severity:** LOW — resolved.

**Verification:** `tsc --noEmit` clean (frontend + backend); all 18 backend tests pass.

---

### F6 — Predictable peptide IDs (LOW) — FIXED

**Status:** FIXED on branch `fix/random-peptide-ids` (commit `c94834e`).

**Boundary:** ID generation — backend response  
**Source:** `backend/src/ai/peptide-assembler.ts:51` — now uses `crypto.randomUUID()` instead of `Date.now().toString(36)`.  
**Severity:** LOW — informational only, now resolved.

**Fix applied:** Replaced timestamp-based peptide ID generation with `crypto.randomUUID()` from Node's `crypto` module. IDs are now cryptographically random and unpredictable.

**Verification:** `tsc --noEmit` clean; all 18 backend tests pass.

---

### F7 — Missing defense-in-depth headers (LOW) — FIXED

**Status:** FIXED on branch `fix/security-headers-csp-hsts` (commit `e1baa79`).

**Boundary:** HTTP response — backend → browser  
**Source:** `backend/src/middleware/security.ts:18-29` — now sets `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` and `Strict-Transport-Security: max-age=31536000; includeSubDomains` (over HTTPS only), in addition to existing `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`.  
**Severity:** LOW — defense-in-depth gap, now resolved.

**Fix applied:** Added CSP and HSTS headers to `securityHeaders` middleware. HSTS is only set when `req.secure` or `x-forwarded-proto: https`, so local HTTP dev is unaffected.

**Verification:** `tsc --noEmit` clean; all 18 backend tests pass.

---

## 4. Considered and Excluded

| Item | Reason excluded |
|---|---|
| Command injection (`exec`, `child_process`) | None found in source |
| Path traversal | No filesystem access from user input |
| Unsafe deserialization | Only `JSON.parse`, no `eval`/`vm`/`import()` with dynamic input |
| Hardcoded secrets | None found; keys are env vars only |
| SQL injection | No database |
| Memory safety bugs | TypeScript/JavaScript, no native code |
| Multi-tenant data isolation | No tenant model exists (single-tenant by design) |
| CSRF | No authenticated session exists to forge (moot until F1 is fixed) |

---

## 5. Needs Validation (Deployment Facts, Not Source-Visible)

| # | Missing fact | Safe check to resolve |
|---|---|---|
| N1 | Is `ALLOWED_ORIGINS` set in production deployment? | Check deployment env; if unset, F2 is live |
| N2 | Is the backend behind a reverse proxy with its own rate limiting? | Check deployment config; if yes, F3 impact is reduced |
| N3 | Is `GEMINI_API_KEY`/`GROQ_API_KEY` present in production env? | Check deployment; absent keys → heuristic fallback (already tested offline) |

---

## 6. Recommended Fix Priority

**All findings (F1–F7) are now resolved in source:**

- **Done:** **Add API authentication + Next.js server-only BFF proxy** (F1)
- **Done:** **Fail-closed CORS when `ALLOWED_ORIGINS` is unset** (F2)
- **Done:** **Sliding-window rate limiting + pluggable Upstash Redis distributed store + proxy IP isolation** (F3)
- **Done:** **Sanitize user input in AI prompts** (F4) — fixed in PR #16 (`9507136`).
- **Done:** **Move frontend Gemini client to server-only** (F5) — fixed in PR #16 (`9507136`).
- **Done:** **Use random UUID peptide IDs** (F6) — fixed in PR #16 (`c94834e`) & Next.js fallback route.
- **Done:** **Add CSP/HSTS headers** (F7) — fixed in PR #15 (`e1baa79`).

---

## 7. Files Reviewed

- `backend/src/app.ts` — Express app factory, all routes
- `backend/src/middleware/security.ts` — CORS, rate limit, security headers
- `backend/src/gemini.ts` — AI router, provider fallback
- `backend/src/ai/prompt-utils.ts` — prompt construction, output normalization
- `backend/src/ai/peptide-assembler.ts` — response assembly, ID generation
- `backend/src/ai/groq-client.ts` — Groq API client
- `backend/src/bio-engine/calculators.ts` — biophysical metrics
- `backend/src/validators/protease-shield.ts` — protease stability
- `backend/tests/http.test.ts` — HTTP integration tests
- `frontend/src/app/api/generate/route.ts` — Next.js generate proxy/fallback
- `frontend/src/store/usePeptideStore.ts` — Zustand store, HTTP client
- `frontend/src/lib/gemini.ts` — frontend Gemini client
- `frontend/src/lib/bio-engine/calculators.ts` — client-side biophysical metrics
- `frontend/src/lib/bio-engine/pdb-generator.ts` — client-side PDB generation
- `frontend/src/components/dashboard/Header.tsx` — theme toggle UI
- `frontend/src/components/canvas3d/MoleculeViewer.tsx` — 3D viewer
- `docs/API_CONTRACT.md` — REST API contract v1.0
- `backend/.env.example` — environment variable template
- `backend/Dockerfile` — container build

---

## 8. Methodology Notes

This review is source-grounded only: no live endpoints, provider APIs, registries, identity systems, or shared services were probed. Every finding names a trust boundary, a lower-trust principal, an intended control, and a concrete observed result based on repository source. Severity is calibrated to demonstrated impact, not speculation.
