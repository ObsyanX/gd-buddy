

## Reviewing what's done vs remaining

### ✅ Completed
1. Zustand global state stores
2. Expand SEO to 200+ topics
3. Error monitoring service
4. A/B testing framework
5. Enterprise instructor dashboard

### Remaining
6. **Event-driven architecture / background job queue** — async task processing
7. **AI task queue for async report generation** — not implemented
8. **AI data pipeline** — training data aggregation from sessions
9. **Deeper cost optimization** — token budgeting and edge caching

Items 6 & 7 can be combined into a single background job queue system. Item 8 (AI data pipeline) aggregates session data for insights. Item 9 (cost optimization) involves caching and token tracking.

### Implementation Plan
1. **Background job queue** — Create a `background_jobs` table + edge function that processes async tasks (report generation, data aggregation)
2. **AI data pipeline** — Create a `training_data` table that aggregates session transcripts and metrics for analysis
3. **Cost optimization** — Add token usage tracking table and implement response caching in edge functions

