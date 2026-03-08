---
title: I Built an AI Group Discussion Simulator to Help Students Crack Placement GD Rounds
published: false
description: How I built GD Buddy — a free AI-powered group discussion practice platform using React, Supabase, and AI models. Here's the story, architecture, and what I learned.
tags: webdev, ai, react, opensource
cover_image: https://gd-buddy.vercel.app/og-image.png
canonical_url: https://gd-buddy.vercel.app
---

## The Problem

If you've ever prepared for campus placements in India, you know the drill — aptitude tests, coding rounds, and then... **the group discussion**.

GD rounds are stressful because:
- You can't practice alone
- Coordinating with friends is hard
- There's no objective feedback on your performance
- Most students walk in unprepared and hope for the best

I was in the same situation. I wanted to practice, but I couldn't always find people to discuss with. So I thought — **what if AI could be my practice group?**

That's how [GD Buddy](https://gd-buddy.vercel.app) was born.

---

## What is GD Buddy?

[**GD Buddy**](https://gd-buddy.vercel.app) is a free, AI-powered **group discussion practice platform** where you can:

- Simulate realistic GD rounds with **2–6 AI participants**
- Each AI has a unique personality — aggressive debater, logical thinker, devil's advocate, etc.
- **Speak using your microphone** and AI responds with realistic voices
- Get **detailed post-session reports** on content quality, fluency, filler words, speaking pace, body language, and more
- Practice specific skills with **targeted drills** (opening statements, rebuttals, STAR responses)
- Practice with friends in **multiplayer mode**

**→ Try it free: [gd-buddy.vercel.app](https://gd-buddy.vercel.app)**

---

## The Tech Stack

Here's what powers GD Buddy:

### Frontend
- **React + TypeScript + Vite** — fast, type-safe, modern
- **Tailwind CSS + shadcn/ui** — clean, consistent UI with design tokens
- **Zustand** — lightweight state management
- **TanStack Query** — data fetching and caching

### Backend
- **Supabase** — authentication, PostgreSQL database, Edge Functions, and Realtime
- Row-Level Security (RLS) for data protection
- Edge Functions for AI orchestration

### AI & Speech
- **Google Gemini & OpenAI models** — for generating realistic AI participant responses
- **Web Speech API** — browser-native speech recognition
- **Text-to-Speech** — AI participants speak back with distinct voices

### Video Analysis
- **MediaPipe** — real-time body language analysis via webcam
- Tracks eye contact, posture, facial expressions
- Provides objective feedback on non-verbal communication

---

## How the AI Discussion Works

The core challenge was making AI participants feel **realistic**. Here's the approach:

### 1. Persona System

Each AI participant has configurable traits:

```typescript
{
  name: "Priya",
  role: "Devil's Advocate",
  tone: "assertive",
  verbosity: "concise",
  agreeability: 0.3,  // low = more argumentative
  interrupt_level: 0.6,
  vocab_level: "advanced"
}
```

### 2. Turn-Taking Engine

A "GD Conductor" Edge Function manages the discussion flow:
- Decides which AI participant speaks next based on context
- Determines the **intent** (agree, contradict, elaborate, ask question, summarize)
- Generates contextually appropriate responses
- Handles natural interruptions and follow-ups

### 3. Real-Time Feedback

During the session, the system tracks:
- **Words per minute** — are you speaking too fast or too slow?
- **Filler words** — "um", "uh", "like", "basically"
- **Pause duration** — long pauses between points
- **Body language** — via webcam analysis (optional)

---

## The SEO Content Strategy

Since GD Buddy is a free tool, organic search is the primary growth channel. I built a **hub-and-spoke SEO architecture**:

**Hub (Pillar Page):**
- [Group Discussion Preparation Guide](https://gd-buddy.vercel.app/group-discussion-preparation-guide) — 2000+ word comprehensive guide

**Spoke Pages:**
- [GD Topics for Placements 2025](https://gd-buddy.vercel.app/gd-topics-for-placements) — 50+ topics with arguments
- [How to Crack Group Discussion](https://gd-buddy.vercel.app/how-to-crack-group-discussion)
- [Common GD Mistakes to Avoid](https://gd-buddy.vercel.app/common-gd-mistakes)
- [Communication Skills for GD](https://gd-buddy.vercel.app/communication-skills-for-gd)
- [Body Language Tips for GD](https://gd-buddy.vercel.app/body-language-tips-for-gd)
- [How to Start a Group Discussion](https://gd-buddy.vercel.app/how-to-start-group-discussion)
- [How to Speak Confidently in GD](https://gd-buddy.vercel.app/how-to-speak-confidently-in-group-discussion)

Each page has:
- **FAQ structured data** for Google rich snippets
- **Breadcrumb schema** for navigation context
- **Internal links** connecting back to the hub and the practice tool
- **LLM-friendly semantic blocks** (Quick Summary, Key Takeaways)

**Programmatic SEO:** 50+ individual topic pages generated from structured data, each with unique canonical tags and detailed content (overview, arguments for/against, opening statements).

---

## Challenges & Learnings

### 1. Making AI Feel Natural
The biggest challenge was avoiding the "chatbot feel." AI participants needed to:
- Reference what the user actually said
- Build on previous AI participants' points
- Occasionally disagree with each other (not just the user)
- Know when to interrupt vs. when to let the user finish

### 2. Speech Recognition Accuracy
Browser-based speech recognition isn't perfect. I added:
- A transcription correction Edge Function
- Visual feedback so users can see what was captured
- Manual text input as a fallback

### 3. Video Analysis Performance
Running MediaPipe in the browser alongside speech recognition and AI responses is CPU-intensive. I optimized by:
- Analyzing frames at reduced frequency (every 2-3 seconds)
- Using Web Workers where possible
- Making video analysis optional (not required for practice)

### 4. Multiplayer Sync
Real-time multiplayer GD uses Supabase Realtime for:
- Participant presence tracking
- Message synchronization
- Turn-taking coordination between human and AI participants

---

## What's Next

- **More topics** — expanding to 100+ topics with community contributions
- **Detailed body language coaching** — frame-by-frame analysis with improvement suggestions
- **Practice streaks & gamification** — daily goals, leaderboards, skill progression
- **Mobile optimization** — better voice input on mobile browsers

---

## Try It Out

**[GD Buddy](https://gd-buddy.vercel.app)** is completely free. If you're preparing for campus placements or just want to improve your group discussion skills, give it a try.

- 🌐 **Website**: [gd-buddy.vercel.app](https://gd-buddy.vercel.app)
- 📋 **GD Topics**: [gd-buddy.vercel.app/gd-topics-for-placements](https://gd-buddy.vercel.app/gd-topics-for-placements)
- 🤖 **AI Simulator**: [gd-buddy.vercel.app/ai-gd-simulator](https://gd-buddy.vercel.app/ai-gd-simulator)
- 💻 **GitHub**: [github.com/ObsyanX/gd-buddy](https://github.com/ObsyanX/gd-buddy)

If you found this useful, drop a ⭐ on GitHub or share it with someone preparing for placements!

---

*Built with React, Supabase, and a lot of mock GD sessions. 🎙️*
