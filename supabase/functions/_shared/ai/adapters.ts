// One adapter per provider GD Buddy actually uses. Adapters normalise the
// request shape, the auth header, the default models and the validation call.

export type Category = "text" | "voice" | "stt" | "vision";

export interface ProviderAdapter {
  id: string;
  label: string;
  category: Category;
  /** Chat-completions style endpoint (text + vision providers). */
  chatUrl?: string;
  /** Model ids offered in the settings picker, best first. */
  models: string[];
  /** Build auth headers for this provider. */
  headers: (key: string) => Record<string, string>;
  /** Cheap authenticated request used by "Test key". */
  validate: (key: string) => Promise<Response>;
  /** Link shown when the provider exposes no quota API. */
  dashboardUrl: string;
  /** True when the provider reports usage/quota we can read back. */
  reportsQuota: boolean;
}

const openAiHeaders = (key: string) => ({
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
});

export const ADAPTERS: Record<string, ProviderAdapter> = {
  // ---------- Text ----------
  groq: {
    id: "groq",
    label: "Groq",
    category: "text",
    chatUrl: "https://api.groq.com/openai/v1/chat/completions",
    models: ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"],
    headers: openAiHeaders,
    validate: (k) =>
      fetch("https://api.groq.com/openai/v1/models", { headers: openAiHeaders(k) }),
    dashboardUrl: "https://console.groq.com/settings/billing",
    reportsQuota: false,
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    category: "text",
    chatUrl: "https://api.openai.com/v1/chat/completions",
    models: ["gpt-4o-mini", "gpt-4o"],
    headers: openAiHeaders,
    validate: (k) => fetch("https://api.openai.com/v1/models", { headers: openAiHeaders(k) }),
    dashboardUrl: "https://platform.openai.com/usage",
    reportsQuota: false,
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    category: "text",
    chatUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    models: ["gemini-2.5-flash", "gemini-2.5-pro"],
    headers: openAiHeaders,
    validate: (k) =>
      fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(k)}`),
    dashboardUrl: "https://aistudio.google.com/app/apikey",
    reportsQuota: false,
  },
  mistral: {
    id: "mistral",
    label: "Mistral",
    category: "text",
    chatUrl: "https://api.mistral.ai/v1/chat/completions",
    models: ["mistral-medium-latest", "mistral-small-latest", "ministral-8b-latest"],
    headers: openAiHeaders,
    validate: (k) => fetch("https://api.mistral.ai/v1/models", { headers: openAiHeaders(k) }),
    dashboardUrl: "https://console.mistral.ai/usage",
    reportsQuota: false,
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    category: "text",
    chatUrl: "https://api.anthropic.com/v1/chat/completions",
    models: ["claude-sonnet-4-5", "claude-haiku-4-5"],
    headers: (k) => ({
      "x-api-key": k,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    }),
    validate: (k) =>
      fetch("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": k, "anthropic-version": "2023-06-01" },
      }),
    dashboardUrl: "https://console.anthropic.com/settings/usage",
    reportsQuota: false,
  },
  cerebras: {
    id: "cerebras",
    label: "Cerebras",
    category: "text",
    chatUrl: "https://api.cerebras.ai/v1/chat/completions",
    models: ["gpt-oss-120b", "gemma-4-31b"],
    headers: openAiHeaders,
    validate: (k) => fetch("https://api.cerebras.ai/v1/models", { headers: openAiHeaders(k) }),
    dashboardUrl: "https://cloud.cerebras.ai",
    reportsQuota: false,
  },

  // ---------- Voice (text-to-speech) ----------
  elevenlabs: {
    id: "elevenlabs",
    label: "ElevenLabs",
    category: "voice",
    models: ["eleven_turbo_v2_5", "eleven_multilingual_v2"],
    headers: (k) => ({ "xi-api-key": k, "Content-Type": "application/json" }),
    validate: (k) =>
      fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": k } }),
    dashboardUrl: "https://elevenlabs.io/app/usage",
    reportsQuota: true,
  },
  openai_tts: {
    id: "openai_tts",
    label: "OpenAI TTS",
    category: "voice",
    models: ["gpt-4o-mini-tts", "tts-1"],
    headers: openAiHeaders,
    validate: (k) => fetch("https://api.openai.com/v1/models", { headers: openAiHeaders(k) }),
    dashboardUrl: "https://platform.openai.com/usage",
    reportsQuota: false,
  },
  google_tts: {
    id: "google_tts",
    label: "Google TTS",
    category: "voice",
    models: ["en-US-Neural2-F", "en-IN-Neural2-A"],
    headers: openAiHeaders,
    validate: (k) =>
      fetch(`https://texttospeech.googleapis.com/v1/voices?key=${encodeURIComponent(k)}`),
    dashboardUrl: "https://console.cloud.google.com/billing",
    reportsQuota: false,
  },

  // ---------- Speech-to-text ----------
  groq_whisper: {
    id: "groq_whisper",
    label: "Groq Whisper",
    category: "stt",
    models: ["whisper-large-v3-turbo", "whisper-large-v3"],
    headers: (k) => ({ Authorization: `Bearer ${k}` }),
    validate: (k) =>
      fetch("https://api.groq.com/openai/v1/models", { headers: openAiHeaders(k) }),
    dashboardUrl: "https://console.groq.com/settings/billing",
    reportsQuota: false,
  },
  openai_whisper: {
    id: "openai_whisper",
    label: "OpenAI Whisper",
    category: "stt",
    models: ["whisper-1", "gpt-4o-mini-transcribe"],
    headers: (k) => ({ Authorization: `Bearer ${k}` }),
    validate: (k) => fetch("https://api.openai.com/v1/models", { headers: openAiHeaders(k) }),
    dashboardUrl: "https://platform.openai.com/usage",
    reportsQuota: false,
  },
  deepgram: {
    id: "deepgram",
    label: "Deepgram",
    category: "stt",
    models: ["nova-3", "nova-2"],
    headers: (k) => ({ Authorization: `Token ${k}` }),
    validate: (k) =>
      fetch("https://api.deepgram.com/v1/projects", { headers: { Authorization: `Token ${k}` } }),
    dashboardUrl: "https://console.deepgram.com",
    reportsQuota: false,
  },
  assemblyai: {
    id: "assemblyai",
    label: "AssemblyAI",
    category: "stt",
    models: ["best", "nano"],
    headers: (k) => ({ authorization: k, "Content-Type": "application/json" }),
    validate: (k) =>
      fetch("https://api.assemblyai.com/v2/transcript?limit=1", { headers: { authorization: k } }),
    dashboardUrl: "https://www.assemblyai.com/app/usage",
    reportsQuota: false,
  },

  // ---------- Vision ----------
  openai_vision: {
    id: "openai_vision",
    label: "OpenAI Vision",
    category: "vision",
    chatUrl: "https://api.openai.com/v1/chat/completions",
    models: ["gpt-4o-mini", "gpt-4o"],
    headers: openAiHeaders,
    validate: (k) => fetch("https://api.openai.com/v1/models", { headers: openAiHeaders(k) }),
    dashboardUrl: "https://platform.openai.com/usage",
    reportsQuota: false,
  },
  gemini_vision: {
    id: "gemini_vision",
    label: "Gemini Vision",
    category: "vision",
    chatUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    models: ["gemini-2.5-flash"],
    headers: openAiHeaders,
    validate: (k) =>
      fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(k)}`),
    dashboardUrl: "https://aistudio.google.com/app/apikey",
    reportsQuota: false,
  },
};

export function adaptersFor(category: Category): ProviderAdapter[] {
  return Object.values(ADAPTERS).filter((a) => a.category === category);
}
