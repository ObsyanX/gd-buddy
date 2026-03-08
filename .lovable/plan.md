# GD Buddy — Deep Architecture Analysis and Evolution Plan

## SECTION 1: Current System Overview

**GD Buddy** is an AI-powered Group Discussion practice platform for Indian students preparing for placement interviews. Users simulate GDs with AI participants who have distinct personas, receive voice/video feedback, and track improvement through drills and analytics.

### User Journey

Landing (`/`) → Auth (`/auth`) → Home (`/home`) → Topic Selection (`/home/practice`) → Persona Setup (`/home/practice/setup`) → Live GD Session (`/home/session/:id`) → Report (`/home/session/:id/report`) → Dashboard analytics (`/home/dashboard`). Parallel path: Skill Drills (`/home/drills`) for targeted practice.

### Core Systems

- **AI Discussion**: `gd-conductor` edge function orchestrates AI participant responses using Gemini 2.5 Flash. 20 personas (10 core + 10 extended) with tone/verbosity/interrupt parameters.
- **Voice Pipeline**: Web Speech API (STT) → `transcription-correction` edge function → AI processing → `text-to-speech` edge function (TTS) with browser fallback.
- **Video Analysis**: Webcam frames sent to external Python backend for posture/eye contact/expression scoring.
- **Drills**: 16 built-in drills (4 API types reused) + custom drills (localStorage). Timed recording → `drill-feedback` edge function → score/feedback saved to `skill_drills` table.
- **Multiplayer**: Supabase Realtime for multi-user GD rooms with presence and sync.
- **SEO**: 11 public content pages + 47 programmatic topic pages.

---

## SECTION 2: Current Product Limitations


| Area                 | Limitation                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| **AI Realism**       | No moderator role; AI participants respond reactively without session pacing                          |
| **Feedback Timing**  | Coaching is post-session only; no live signals during speaking                                        |
| **Drill System**     | 16 drills map to only 4 API types (duplicate IDs); custom drills lost on device switch (localStorage) |
| **Skill Tracking**   | No progression system; no skill levels; no personalized recommendations                               |
| **Session Replay**   | No way to review past sessions with timestamped insights                                              |
| **Multiplayer**      | No ranking, no competitive structure, no skill-based matchmaking                                      |
| **State Management** | Scattered useState + localStorage; no global store; no error boundaries                               |
| **Report Depth**     | Reports lack argument structure analysis and comparative benchmarking                                 |
| **Video Coaching**   | Metrics computed but not surfaced as real-time coaching overlay                                       |


---

## SECTION 3: AI Intelligence Upgrades

### 3.1 AI Moderator System

Add a `moderator` role to the `gd-conductor` prompt. The moderator would be a special participant that:

- Opens the discussion with context-setting
- Enforces time allocation per speaker
- Redirects stalled conversations
- Calls for summaries at the end

**Implementation**: Add a `moderator_mode: boolean` field to session config. When enabled, the conductor prompt includes moderator instructions. The moderator participant has `is_moderator: true` in `gd_participants`. Responses include a `moderator_action` field (e.g., `redirect`, `time_warning`, `summarize_request`).

### 3.2 Live Communication Coaching

Surface real-time coaching signals in a floating panel during sessions:

- WPM gauge (already partially built via `WPMDisplay`)
- Filler word counter (already tracked)
- Argument structure indicator (claim → evidence → conclusion detected via AI)
- Confidence score derived from voice metrics + video metrics

**Implementation**: Extend `VoiceMetricsPanel` to show live coaching hints. Add a lightweight edge function call every 30s with the last few utterances to get argument quality signals. Display as toast-style overlays.

### 3.3 Argument Structure Detection

After each user utterance, classify its structure:

- Has claim? Has evidence? Has example? Has conclusion?
- Return a mini-rubric score per turn

**Implementation**: Add a `structure_analysis` field to the `gd-conductor` response schema. The conductor already receives conversation history — add instructions to evaluate the latest user utterance's structure.

### 3.4 Enhanced Persona Behaviors

The persona system already has `interrupt_level`, `agreeability`, `vocab_level`. Enhance by:

- Adding `speaking_frequency` (how often they speak vs stay silent)
- Adding `argument_style` (anecdotal, statistical, emotional, logical)
- Using these in the conductor prompt to create more distinct behaviors

**Implementation**: Extend `PersonaTemplate` interface and the conductor system prompt.

---

## SECTION 4: Learning System Design

### 4.1 Skill Progression

New database table `skill_progress`:

```sql
CREATE TABLE skill_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skill_name TEXT NOT NULL, -- clarity, confidence, rebuttal, structure, listening
  current_score NUMERIC DEFAULT 0,
  level TEXT DEFAULT 'beginner', -- beginner, intermediate, advanced, expert
  total_practice_minutes INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, skill_name)
);
```

**Level thresholds**: Beginner (0-40), Intermediate (41-65), Advanced (66-85), Expert (86-100). Scores computed as weighted rolling average from drill scores and session metrics.

### 4.2 Personalized Recommendations

After each session/drill, update `skill_progress`. On the dashboard/drills page, query lowest-scoring skills and recommend matching drills.

**Logic**: Map drill types to skills (rebuttal drills → rebuttal skill, opening statement → clarity + structure). Surface "Recommended for you" section on drills page.

### 4.3 Skill Metrics

Track 5 core skills:

- **Clarity**: Derived from WPM range, filler rate, AI feedback
- **Argument Strength**: From structure analysis scores
- **Listening**: From response relevance (does user address previous points?)
- **Rebuttal Quality**: From rebuttal drill scores + in-session counterpoint quality
- **Confidence**: From video metrics (eye contact, posture) + voice metrics (pace consistency)

---

## SECTION 5: Multiplayer Evolution

### Ranked System

New table `user_rankings`:

```sql
CREATE TABLE user_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  elo_rating INTEGER DEFAULT 1000,
  tier TEXT DEFAULT 'bronze', -- bronze, silver, gold, platinum
  wins INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

After multiplayer sessions, both users rate each other (or AI judges). ELO-style rating adjustment. Tiers unlock harder topics and more aggressive AI opponents.

---

## SECTION 6: Topic Intelligence

Extend `gd-topics` edge function to accept `difficulty_level` parameter. Use the prompt to generate topics calibrated to:

- **Beginner**: Clear, familiar topics (social media, education)
- **Intermediate**: Nuanced policy topics requiring balanced arguments
- **Advanced**: Multi-stakeholder economic/ethical dilemmas

Store generated topics with difficulty metadata in `gd_sessions.topic_difficulty`.

---

## SECTION 7: Enhanced Report System

Extend `SessionReport` to show:

1. **Per-turn analysis**: Each user message scored for structure, relevance, originality
2. **Comparative radar**: User scores vs session average vs platform average
3. **Argument timeline**: Visual showing when user made claims, evidence, rebuttals
4. **Top strength + biggest weakness** with drill recommendations

**Implementation**: Enhance `post_session_report` request type in `gd-conductor` to include per-turn scoring. Store in `gd_feedback` with `feedback_type = 'turn_analysis'`.

---

## SECTION 8: Session Replay

### Design

Store timestamps on all messages (already exists: `start_ts` on `gd_messages`). Build a replay component that:

1. Plays messages chronologically with timing
2. Overlays coaching annotations (interruption markers, filler word highlights, structure scores)
3. Shows video metrics timeline if camera was used

**Implementation**: New `SessionReplay` component that fetches `gd_messages` ordered by `start_ts`, renders them on a timeline with playback controls. Annotations stored in `gd_feedback` with `message_id` references.

---

## SECTION 9: Drill System Upgrade

### Scenario-Based Drills

Add a `scenario` field to drills:

```
Scenario: A colleague presents a flawed argument with incorrect statistics.
Your task: Politely correct them while maintaining team rapport.
Time: 45 seconds.
```

**Implementation**: Add `scenario_prompt` field to `DrillType`. The `drill-feedback` edge function receives the scenario context and evaluates response appropriateness. Generate scenarios dynamically via AI based on user's weakest skills.

### Database Persistence for Custom Drills

Migrate from localStorage to a new table:

```sql
CREATE TABLE custom_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT,
  time_limit INTEGER DEFAULT 60,
  difficulty TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## SECTION 10: Video Coaching UI

Surface video metrics as real-time overlays during sessions:

- Small floating indicators near webcam feed: eye contact status, posture alert, expression feedback
- Color-coded: green (good), yellow (warning), red (needs attention)
- Aggregate into a "Body Language Score" shown in the metrics panel

**Implementation**: The `VideoMonitor` component already computes metrics. Add a coaching overlay layer that maps scores to actionable text hints.

---

## SECTION 11: Technical Architecture Improvements

### 11.1 Global State (Zustand)

Replace scattered localStorage + useState with Zustand stores:

- `useSessionStore`: Active session state, messages, participants
- `useDrillStore`: Selected drill, timer, custom drills
- `useVoiceStore`: TTS/STT settings, voice selection
- `useUserStore`: Profile, skill progress, rankings

### 11.2 Error Boundaries

Add React error boundaries around:

- `DiscussionRoom` (most complex component, 1291 lines)
- `SessionReport` (1189 lines)
- Route-level boundaries in `App.tsx`

### 11.3 Component Decomposition

Break down `DiscussionRoom.tsx` (1291 lines) into:

- `SessionHeader`
- `MessageList`
- `MessageInput`
- `CoachingOverlay`
- `SessionControls`

### 11.4 Fix Duplicate Drill IDs

Assign unique IDs to all 16 built-in drills. Update `drill-feedback` edge function to handle the expanded set.

---

## SECTION 12: Target Architecture

### Database Schema (New/Modified Tables)

```text
profiles ─────────── skill_progress (1:N by user_id)
    │                     
    ├── user_rankings (1:1)
    ├── custom_drills (1:N)
    ├── custom_personas (1:N) [exists]
    │
    ├── gd_sessions (1:N)
    │       ├── gd_participants (1:N)
    │       ├── gd_messages (1:N)
    │       │       └── gd_feedback (1:N by message_id)
    │       ├── gd_metrics (1:1)
    │       └── gd_feedback (1:N by session_id)
    │
    └── skill_drills (1:N) [exists]
```

### AI Orchestration Pipeline

```text
User Speech
    │
    ▼
Web Speech API (STT)
    │
    ▼
transcription-correction (edge fn)
    │
    ▼
gd-conductor (edge fn)
    ├── Persona Manager (select responders)
    ├── Moderator AI (if enabled)
    ├── Argument Analyzer (structure detection)
    └── Coaching Signal Generator
    │
    ▼
Response JSON
    │
    ├── AI text → text-to-speech (edge fn) → Audio playback
    ├── Coaching hints → UI overlay
    └── Turn analysis → gd_feedback storage
```

### Session Lifecycle

```text
Setup → Active → [Live coaching loop] → End → Report Generation → Replay Available
  │                    │                           │
  │              Each user turn:                   │
  │              STT → Correction →                │
  │              Conductor → TTS →                 │
  │              Metrics update →                  │
  │              Coaching signal                   │
  │                                                │
  └── Participants, topic, config          Post-session: AI report,
      stored in DB                         skill_progress update,
                                           ranking adjustment (MP)
```

---

## SECTION 13: Growth Strategy

### Programmatic SEO Expansion

Current: 47 topics in `gd-topics.ts`. Scale to 200+ with:

- AI-generated topic pages (batch generate via edge function)
- Each page: overview, pros/cons, sample opening, related topics, practice CTA
- Target long-tail: "group discussion on [topic] for placement"

### Content Flywheel

User sessions generate anonymized data → aggregate into "How students discuss [topic]" insights → publish as content → drives SEO → attracts new users.

---

## SECTION 14: High-Impact Prioritization


| Priority | Feature                      | Impact                                           | Effort                           |
| -------- | ---------------------------- | ------------------------------------------------ | -------------------------------- |
| 1        | **AI Moderator**             | Transforms realism of sessions                   | Medium — prompt engineering + UI |
| 2        | **Skill Progression System** | Creates retention loop; users return to level up | Medium — new table + dashboard   |
| 3        | **Custom Drills to DB**      | Fixes data loss; enables cross-device            | Low — migration + CRUD           |
| 4        | **Live Coaching Overlay**    | Differentiation; real-time value                 | Medium — extend existing metrics |
| 5        | **Error Boundaries**         | Prevents blank screens (current crash issue)     | Low — wrap components            |
| 6        | **Session Replay**           | Powerful learning tool; timestamps already exist | Medium — new component           |
| 7        | **Unique Drill IDs**         | Fixes feedback accuracy for 16 drills            | Low — config + edge function     |
| 8        | **Ranked Multiplayer**       | Engagement + competitive motivation              | High — new system                |
| 9        | **Component Decomposition**  | Maintainability of 1291-line DiscussionRoom      | Medium — refactor                |
| 10       | **Scenario Drills**          | Deeper practice; AI-generated scenarios          | Medium — prompt + UI             |


## SECTION 15: Infrastructure Scalability and Reliability

To support future growth and large user bases, GD Buddy should evolve toward a more scalable infrastructure model.

### 15.1 Event-Driven Architecture

Introduce an event-based system to decouple frontend interactions from AI processing.

Example event flow:

```
User speech submitted
        │
        ▼
Session Event Queue
        │
        ├── AI Response Generation
        ├── Coaching Signal Analysis
        ├── Metrics Aggregation
        └── Replay Annotation

```

This prevents blocking user interactions while AI analysis runs.

Possible technologies:

• Supabase Realtime events  
• Redis streams  
• Kafka (future scale)  
• background workers.

---

### 15.2 AI Task Queue

AI operations such as report generation and replay analysis can be heavy.

Move them into background jobs.

Example:

```
Session ends
   │
   ▼
enqueue job → generate session report
enqueue job → compute skill metrics
enqueue job → generate replay annotations

```

This allows the session to end instantly while analytics complete asynchronously.

---

### 15.3 Horizontal AI Scaling

Separate AI workloads into different services:

```
AI Discussion Engine
AI Feedback Engine
AI Video Analysis
AI Topic Generation

```

Each can scale independently depending on demand.

---

## SECTION 16: Observability and Monitoring

Introduce observability to detect failures and performance issues.

### 16.1 Error Monitoring

Integrate error tracking:

• Sentry  
• LogRocket  
• Datadog

Track:

• frontend runtime errors  
• edge function failures  
• AI API errors.

---

### 16.2 Performance Monitoring

Track metrics such as:

• session startup latency  
• STT processing time  
• AI response time  
• TTS generation latency.

Store metrics for dashboard monitoring.

---

### 16.3 Structured Logging

Add structured logging to edge functions.

Example log format:

```
{
  "event": "ai_response_generated",
  "session_id": "...",
  "participant": "Data Analyst",
  "latency_ms": 820
}

```

Logs enable debugging and usage analysis.

---

## SECTION 17: AI Data Pipeline

GD Buddy generates extremely valuable training data.

Design a pipeline to learn from user sessions.

### Data Sources

• session transcripts  
• argument structures  
• drill responses  
• user performance metrics.

---

### Pipeline Flow

```
Session Data
    │
    ▼
Analytics Storage
    │
    ▼
Training Dataset
    │
    ▼
Fine-tuned Coaching Models

```

Over time this allows:

• better feedback models  
• stronger argument analysis  
• improved persona realism.

---

## SECTION 18: Safety and Moderation

Because users generate speech and text content, safety controls should exist.

### Moderation Layer

Detect:

• offensive language  
• harassment  
• hate speech.

If detected:

• warn the user  
• remove offensive messages  
• optionally pause the session.

AI moderation can be added to the `gd-conductor` pipeline.

---

## SECTION 19: Experimentation and Product Optimization

Introduce an experimentation framework.

### A/B Testing

Test variations such as:

• different AI personas  
• coaching feedback frequency  
• drill difficulty progression.

Store experiment results and measure engagement.

---

### Engagement Metrics

Track:

• session completion rate  
• average speaking time  
• drill repeat rate  
• improvement in skill scores.

These metrics guide product improvements.

---

## SECTION 20: Cost Optimization Strategy

AI features can become expensive at scale.

Introduce optimization strategies.

### Model Routing

Use cheaper models when possible.

Example:

```
Lightweight feedback → Gemini Flash
Session reasoning → stronger model

```

---

### Token Budgeting

Limit conversation history size sent to the AI.

Summarize earlier discussion turns when context grows too large.

---

### Edge Caching

Cache generated GD topics and personas to avoid repeated AI calls.

---

## SECTION 21: Enterprise and Institutional Features

Future growth may include partnerships with universities or training institutes.

Possible features:

• instructor dashboards  
• classroom session analytics  
• cohort leaderboards  
• institution-level reports.

Example database addition:

```
institutions
cohorts
cohort_members

```

This opens B2B opportunities.

---

## SECTION 22: Long-Term Vision

The long-term evolution of GD Buddy should position it as:

**An AI Communication Coaching Platform**

Not just a GD simulator.

Potential expansion areas:

• interview preparation  
• leadership communication training  
• debate training  
• presentation coaching.

The core platform architecture should support these future extensions.

&nbsp;

**Recommended Phase 1 (immediate): Items 3, 5, 7, 11.2, 15.2 (low effort, high reliability and stability impact)**

**Recommended Phase 2 (next sprint): Items 1, 2, 4, 4.2, 9.2 (core product differentiation and user learning loop)**

**Recommended Phase 3 (growth): Items 6, 8, 9, 10, 13, 15.1, 17, 19 (engagement, scalability, data-driven improvement)**

**Recommended Phase 4 (scale): Items 15.3, 16, 18, 20, 21 (infrastructure scaling, monitoring, safety, cost optimization, enterprise readiness)**