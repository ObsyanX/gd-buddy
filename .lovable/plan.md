# Bring Your Own API Keys (BYOK) for GD Buddy

## What exists today (verified)

- All text AI (topics, conductor, feedback, drills, detectors, moderation, analytics — 18 functions) already goes through one shared router: Lovable AI -> Groq -> Mistral -> Cerebras, with usage logging, error logging and salvage/retry logic.
- Voice (text-to-speech) uses ElevenLabs first, then the Lovable voice engine, then the browser voice.
- Speech-to-text runs two ways: in the browser (Whisper, no key) and a server function that currently uses an OpenAI key.
- Vision/behaviour analysis uses an external analyzer service plus AI image analysis.
- Keys today are platform-wide (shared by all users), stored as backend secrets. There is no per-user key storage.

## What will be built

### 1. Personal keys, stored safely
A new "AI Providers & API Keys" page in Settings where a signed-in user can add their own keys. Keys are encrypted before being saved, are never sent back to the browser (only the last 4 characters and a status), are never written to logs, and only the owner can see or change them.

Supported to start (matching what GD Buddy actually uses):
- Text AI: Groq, OpenAI, Google Gemini, Mistral, Anthropic, Cerebras
- Voice: ElevenLabs, OpenAI TTS, Google TTS
- Speech-to-text: Groq Whisper, OpenAI Whisper, Deepgram, AssemblyAI
- Vision/image analysis: OpenAI, Gemini

Providers that GD Buddy has no use for will not be added; anything skipped is listed in the final summary with the reason.

### 2. Provider cards
One card per provider showing: logo, category, masked key, show/hide, save, "Test key", enable/disable, model (or voice) picker, remove with confirmation, last validated time, last used time, and a live status badge — Not configured / Validating / Connected / Invalid key / Rate limited / Quota exhausted / Unavailable / Disabled / Fallback active.

### 3. Notifications under each card
When a provider fails, the message appears directly under that provider's card (not just a toast): what happened, when, which provider and model actually served the request instead, plus Retry and Fix key buttons. Repeat failures collapse into one entry; resolved ones can be dismissed.

### 4. Routing and fallback
The existing router is extended (not replaced) so each request tries, in order:
1. the user's preferred provider for that task,
2. their other enabled providers in the order they arranged,
3. GD Buddy's built-in models (only if the user leaves platform fallback on),
4. otherwise a clear error — never a silent switch.

Users can set a preferred provider per category, drag to reorder, toggle platform fallback, and see which provider/model handled each request.

### 5. Failure handling
Errors are classified properly: invalid key, quota exhausted, rate limit (honouring retry headers), server error, timeout, network, unsupported model, bad request, permission, missing key, bad audio, safety refusal. Only transient errors retry; safety refusals are never routed around. Per-user, per-provider circuit breakers pause a failing key briefly and re-test it — one user's exhausted quota never affects anyone else.

### 6. Usage
Where a provider reports real usage/quota, it is fetched on the backend and shown with a sync timestamp. Where it does not, the card says "Quota information unavailable" and shows locally counted requests and errors plus a link to the provider's dashboard. No invented numbers.

## Technical notes

- Tables (all with row-level security limiting rows to `auth.uid()`, plus grants): `user_provider_credentials` (encrypted key, masked tail, category, model, enabled, validation status, timestamps), `user_ai_preferences` (preferred provider per category, priority order, fallback switches), `ai_provider_events` (classified failures, fallback used, correlation id), `ai_usage_events` (outcome + usage, marked reported vs estimated). Retention trim for the two event tables.
- Encryption: AES-256-GCM in the edge functions using a new backend-only encryption secret, generated and stored separately from the database. Plaintext keys exist only for the duration of a single provider call.
- New edge function `ai-keys` handling save / validate / list / update / delete / usage / events / preferences, all JWT-authenticated and ownership-checked.
- New shared modules under `supabase/functions/_shared/ai/`: `credentials`, `adapters` (one per provider, normalising requests, responses, errors, model ids), `router`, `fallback`, `errors`, `health`, `usage`. `callAI` keeps its current signature and delegates to the router, so the 18 existing call sites need no changes beyond passing the caller's user id where available; the voice and transcription functions get the same treatment for TTS/STT.
- Every AI response carries the provider/model actually used so the UI can show it.
- Frontend: new `src/pages/settings/AiProviders.tsx` with provider-card components and a hook for statuses/events, reusing existing design tokens and layout conventions; linked from Settings. No other pages restyled.
- Tests (vitest): encryption round-trip and redaction, ownership enforcement, error classification per status, fallback order including platform-fallback-off, circuit breaker, no-duplicate-output on stream failure, usage recording, plus regression runs of existing suites. Provider failures are mocked; no real quotas burned. Live verification afterwards through the running app for one full discussion flow.

## Rollout order

1. Database tables + encryption secret
2. Credentials + key-management function
3. Provider adapters and router/fallback/health/errors
4. Wire text AI, voice, transcription and vision through the router
5. Settings UI with cards, notifications, usage, priority controls
6. Tests, regression, end-to-end verification, and a written summary of anything not implemented
