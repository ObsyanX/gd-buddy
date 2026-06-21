## Problem

Right now AI participants in GD sessions often paraphrase or mildly agree with whatever the user just said. They don't introduce new angles, data, counterpoints, or lived-experience perspectives. The conductor prompt asks for "intent variety" but never forces *novelty*, never tracks what's already been said, and never anchors each persona to a distinct lens. Result: discussion feels like an echo chamber.

## Root causes (from the current code)

1. `**gd-conductor` system prompt** has no "originality" or "no-echo" rule. It only caps length and lists intents.
2. **Persona definitions** carry a `corePerspective` string (e.g. "Fact-driven, statistics") but it's not aggressively injected per-turn — the prompt only sends `tone` + `verbosity` for each participant.
3. **No "covered points" memory.** The conductor sees raw conversation history but isn't told *what angles are already exhausted*, so the LLM defaults to safe restatement.
4. **Temperature 0.8 + 40-word cap** pushes the model toward short, generic agreement.
5. **Intent distribution isn't enforced.** `agree` is just as likely as `contradict` / `counterpoint` / `example`.

## Plan

### 1. Rewrite the GD-Conductor system prompt (core fix)

File: `supabase/functions/gd-conductor/index.ts`

Add a dedicated **"Originality Engine"** section that mandates:

- **No-echo rule:** an AI reply must not restate the user's point. If it agrees, it must add a *new* sub-point, data point, example, or caveat the user did NOT mention.
- **Fresh-angle quota:** across the 1–2 AI responses per turn, at least one must use intent `counterpoint`, `contradict`, `example`, `ask_question`, or `elaborate-with-new-evidence`. Plain `agree` is allowed only if paired with a new dimension.
- **Persona lens lock:** each AI must argue *from their `corePerspective*` — Aditya cites a statistic or study, Vikram raises a legal/risk angle, Meera proposes a creative reframing, Vikrant (economist) brings a macro number, the student rep brings ground-level experience, etc. Inject `corePerspective` + `role` + `description` into the per-participant block of the user message (not just tone/verbosity).
- **Angle diversity across turns:** the two chosen AIs in one turn must use *different* intents and *different* lenses (no two analysts back-to-back unless contradicting each other).

### 2. Add a "covered ground" tracker

Same file, inside the user message we build for the LLM:

- Derive a short bulleted list of **angles already raised** from `conversation_history` (the conductor LLM does this itself — we just ask for it in the prompt: "Before responding, internally list angles already covered; do NOT repeat them").
- Add an explicit instruction: *"Forbidden: paraphrasing, generic agreement, restating the topic, hedging without a new claim."*

### 3. Strengthen per-participant injection

Replace the current line:

```
- {id} (AI): {name} - {tone} tone, {verbosity} verbosity
```

with a richer block that includes `role`, `corePerspective`, `description`, `vocab_level`, `agreeability`, and a **"must-bring" instruction** derived from the persona (e.g. analyst → "must cite a number, stat, or trend"; legal → "must raise a risk, regulation, or precedent"; designer → "must propose a creative reframe or user-experience angle"; student rep → "must give a ground-level/lived example").

### 4. Add intent weighting + reply-shape guidance

In the prompt rules:

- Bias intent selection: roughly 40% counterpoint/contradict, 30% elaborate-with-new-evidence/example, 20% ask_question, 10% agree-with-addition. Pure `agree` is disallowed.
- Allow replies up to **55 words** (was 40) so there's room for a new claim + brief support.
- Keep temperature 0.8 but add `top_p: 0.95` and a small `presence_penalty`-style instruction in the prompt ("avoid vocabulary and phrasing already used in conversation_history").

### 5. Optional: a lightweight "novelty self-check"

Ask the conductor to include, per response, a `novelty_note` field summarizing the new angle in <=8 words. We don't render it in the UI; it forces the model to commit to bringing something new. Drop responses whose `novelty_note` is empty or restates the user.

### 6. Persona file touch-up (small)

File: `src/config/personas.ts`

- Add an optional `mustBring: string` field to `PersonaTemplate` (e.g. Aditya: "a statistic or trend"; Vikram: "a legal/compliance risk"; Karthik: "a technical constraint or implementation reality"; Neha (researcher): "a study or framework"; student rep: "a campus/ground-level example").
- The conductor reads `mustBring` and injects it into the per-participant block.
- Backward compatible: personas without `mustBring` fall back to a default derived from `corePerspective`.

### 7. No UI changes required

This is a behavior change in the conductor edge function + persona metadata. The DiscussionRoom UI, TTS pipeline, and turn-taking logic stay the same.

## Files touched

- `supabase/functions/gd-conductor/index.ts` — rewrite system prompt + user-message participant block, add originality rules, intent weighting, novelty self-check, bump word cap to ~55.
- `src/config/personas.ts` — add optional `mustBring` field + populate for the 20 built-in personas.

## Expected result

- AI participants stop paraphrasing the user.
- Each AI argument is anchored to its persona's lens (data / law / design / ops / research / student voice / economics / policy / etc.).
- Within a single turn, the 2 AI responses cover *different* angles with *different* intents.
- The discussion feels like a real GD: people disagree, add evidence, raise risks, and reframe — instead of nodding along.

## Try to include 

- Retrieval-augmented "real" facts/citations (would need a search tool wired into the conductor).
- Persona long-term memory across sessions.
- Per-persona separate LLM calls (current single-call orchestration is preserved for cost/latency).
- Retraining the model based on the data given everytime based on the data given , found or calculated  or searched, i wanted automatic retraining.
-   
