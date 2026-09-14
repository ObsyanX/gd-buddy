// Curated offline topic bank used when every AI provider is unavailable
// (credits depleted, quota exhausted, or unparsable output).

export interface FallbackTopic {
  title: string;
  category: string;
  difficulty: string;
  prompts: string[];
  tags: string[];
}

const BANK: Record<string, string[]> = {
  factual: [
    "India's renewable energy targets: progress versus promise",
    "Does higher GDP growth translate into better living standards?",
    "Electric vehicle adoption in India: infrastructure before incentives",
    "Digital payments boom: what the data actually shows",
    "Is India's startup funding winter over?",
    "Literacy rates versus employability: the skills gap",
  ],
  conceptual: [
    "Can creativity be taught, or is it innate?",
    "Does absolute freedom lead to absolute chaos?",
    "Is failure a better teacher than success?",
    "Should intent matter more than outcome?",
    "Is privacy a right or a privilege in the digital age?",
    "Does technology make us more connected or more alone?",
  ],
  controversial: [
    "Should social media platforms be regulated like publishers?",
    "Is reservation still the right tool for social equity?",
    "Should work from home be a legal right?",
    "Is capital punishment justified in any society?",
    "Should political advertising be banned online?",
    "Are influencers responsible for the products they promote?",
  ],
  "case-study": [
    "A startup must choose between profitability and rapid growth",
    "A manager discovers a top performer breaking company policy",
    "A firm faces a product recall days before its IPO",
    "A team misses a client deadline due to internal conflict",
    "A company must decide between layoffs and pay cuts",
    "An employee reports unethical billing by a senior leader",
  ],
  "current-affairs": [
    "AI regulation: should governments slow down innovation?",
    "Global supply chains after repeated disruptions",
    "Climate finance: who should pay for the transition?",
    "Remote work and the future of urban economies",
    "Semiconductor self-reliance as national strategy",
    "Space exploration spending versus social welfare",
  ],
  opinion: [
    "Is chasing passion better than chasing stability?",
    "Should college degrees still decide hiring?",
    "Money or meaning: what should drive a career?",
    "Is competition healthier than collaboration at work?",
    "Should everyone learn to code?",
    "Is social media a net positive for young people?",
  ],
};

const GENERIC_PROMPTS = (title: string) => [
  `What is the strongest argument in favour of this position on "${title}"?`,
  "What evidence or example best challenges that view?",
  "What practical trade-off would you accept to move forward?",
];

export function buildFallbackTopics(
  category: string,
  categoryName: string,
  difficulty: string,
  count: number,
): FallbackTopic[] {
  const pool = BANK[category] ?? Object.values(BANK).flat();
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const n = Math.max(1, Math.min(count || 5, shuffled.length));
  return shuffled.slice(0, n).map((title) => ({
    title,
    category: categoryName,
    difficulty,
    prompts: GENERIC_PROMPTS(title),
    tags: [category, difficulty, "group-discussion"],
  }));
}
