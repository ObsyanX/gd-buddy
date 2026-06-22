# Plan: Groq Fallback for Lovable AI

When Lovable AI returns 429/402/5xx or fails, automatically retry the same request against Groq using the existing `GROQ_API_KEY` secret. Behavior stays identical on success — users get the same JSON/tool-call/text responses.

## Approach

Create one shared helper `supabase/functions/_shared/ai-with-fallback.ts` exposing `chatCompletion({ messages, model, temperature, max_tokens, tools, tool_choice, response_format })`. It:

1. Calls Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) with `LOVABLE_API_KEY` and the requested model (default `google/gemini-3-flash-preview`).
2. If response is not ok (429, 402, 5xx) OR the fetch throws, logs and falls back to Groq (`https://api.groq.com/openai/v1/chat/completions`) using `GROQ_API_KEY`.
3. Maps the model name to a Groq equivalent:
  - `google/gemini-*flash*` / default → `llama-3.3-70b-versatile`
  - reasoning/pro tier → `llama-3.3-70b-versatile`
  - (single map, easy to tune later)
4. Forwards `tools` / `tool_choice` / `response_format` unchanged (Groq supports OpenAI-compatible tool calling and JSON mode).
5. Returns the raw OpenAI-format JSON response so existing parsing code works untouched.

## Files to update

Replace direct `fetch('https://ai.gateway.lovable.dev/...')` calls with `chatCompletion(...)` in:

- `supabase/functions/gd-conductor/index.ts`
- `supabase/functions/session-feedback/index.ts` (preserves tool-calling for `provide_feedback`)
- `supabase/functions/drill-feedback/index.ts`
- `supabase/functions/performance-insights/index.ts`
- `supabase/functions/transcription-correction/index.ts`
- `supabase/functions/gd-topics/index.ts`

New file:

- `supabase/functions/_shared/ai-with-fallback.ts`

## Error handling

- Lovable 402/429/5xx or network error → fallback to Groq.
- Lovable 4xx other than 402/429 (bad request) → return error as-is (no point retrying).
- Groq failure after fallback → throw, caller returns existing error response shape.
- Each function logs which provider served the response (`provider: 'lovable' | 'groq'`).
- Use for TTS, STT (separate endpoints) as well if required 
  &nbsp;

## Deployment

Deploy all 6 edited functions after the changes.

## Out of scope

- Streaming responses (none of the current functions stream).
- Image generation, TTS, STT (separate endpoints, not affected).
- Client-side fallback logic (handled entirely server-side, transparent to frontend).