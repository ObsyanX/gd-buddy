export interface BootcampDay {
  day: number;
  phaseId: 1 | 2 | 3 | 4;
  phaseName: string;
  title: string;
  tagline: string;
  targetTrack: 'general' | 'consulting' | 'it_services' | 'bschool' | 'tech_startup';
  estimatedMinutes: number;
  objective: string;
  framework: string;
  suggestedTopic: string;
  keyRule: string;
  minScoreToPass: number;
}

export const BOOTCAMP_PHASES = [
  {
    id: 1,
    name: "Phase 1: Opening & Closing Foundations",
    days: "Days 1–3",
    description: "Master the art of initiating with authority, capturing the moderator's eye in the first 60 seconds, and crisp summarization."
  },
  {
    id: 2,
    name: "Phase 2: Argumentation & Floor Stealing",
    days: "Days 4–7",
    description: "Learn the PEEL method, counter aggressive speakers respectfully, and claim the floor during high-competition rounds."
  },
  {
    id: 3,
    name: "Phase 3: Abstract & Lateral Thinking",
    days: "Days 8–11",
    description: "Deconstruct abstract and philosophical GD topics into structured socio-economic and business frameworks."
  },
  {
    id: 4,
    name: "Phase 4: Placement Proctored Mock Drives",
    days: "Days 12–14",
    description: "Full-length simulations evaluated strictly against Consulting (MECE), IT Services (Consensus), and B-School rubrics."
  }
];

export const BOOTCAMP_DAYS: BootcampDay[] = [
  // Phase 1: Opening & Closing Foundations
  {
    day: 1,
    phaseId: 1,
    phaseName: "Phase 1: Opening & Closing Foundations",
    title: "Initiating with Definitions & Quotes",
    tagline: "Never start with 'I think' — start with context and boundaries.",
    targetTrack: "general",
    estimatedMinutes: 12,
    objective: "Initiate the discussion in the first 45 seconds by defining the core scope and laying down a 3-part discussion agenda.",
    framework: "The 3D Formula: Definition + Dimension + Direction",
    suggestedTopic: "Artificial Intelligence: Catalyst for Productivity or Unemployment Threat?",
    keyRule: "Do not jump straight into conclusions. Define what the terms mean first.",
    minScoreToPass: 60
  },
  {
    day: 2,
    phaseId: 1,
    phaseName: "Phase 1: Opening & Closing Foundations",
    title: "Active Listening & The Anchor Bridge",
    tagline: "High scorers don't just speak; they build on others' points.",
    targetTrack: "it_services",
    estimatedMinutes: 15,
    objective: "Acknowledge a previous participant's point and seamlessly steer it into a fresh, unexplored dimension.",
    framework: "Anchor Bridge: 'Rahul rightly pointed out X; building on that, we must also consider Y.'",
    suggestedTopic: "Work from Home vs Hybrid: Finding the Ideal Workplace for IT Talents",
    keyRule: "Mention at least one peer by name before presenting your counter-argument.",
    minScoreToPass: 65
  },
  {
    day: 3,
    phaseId: 1,
    phaseName: "Phase 1: Opening & Closing Foundations",
    title: "The 90-Second Structured Conclusion",
    tagline: "A summary is not your opinion; it is the group's consensus.",
    targetTrack: "bschool",
    estimatedMinutes: 15,
    objective: "Synthesize disparate viewpoints into major convergence points without introducing new arguments.",
    framework: "The Synthesis Pyramid: Consensus Points + Divergences + Group Way Forward",
    suggestedTopic: "Central Bank Digital Currencies (CBDCs): Future of Indian Banking?",
    keyRule: "Never take a personal side in the summary; remain an objective narrator of the group's debate.",
    minScoreToPass: 68
  },

  // Phase 2: Argumentation & Floor Stealing
  {
    day: 4,
    phaseId: 2,
    phaseName: "Phase 2: Argumentation & Floor Stealing",
    title: "The PEEL Argumentation Model",
    tagline: "Unsubstantiated opinions get zero points in placement rounds.",
    targetTrack: "consulting",
    estimatedMinutes: 15,
    objective: "Deliver every contribution using Point, Evidence, Explanation, and Link to the topic.",
    framework: "PEEL: Point (Core claim) + Evidence (Fact/Stat) + Explanation (Why it matters) + Link (Relevance)",
    suggestedTopic: "Electric Vehicle Transition in India: Infrastructure Realities vs Government Targets",
    keyRule: "Every argument must cite at least one metric, policy, or real-world example.",
    minScoreToPass: 70
  },
  {
    day: 5,
    phaseId: 2,
    phaseName: "Phase 2: Argumentation & Floor Stealing",
    title: "Respectful Interjections & Floor Stealing",
    tagline: "Don't shout over people — use tactical pauses to claim the mic.",
    targetTrack: "consulting",
    estimatedMinutes: 15,
    objective: "Successfully claim the floor when competitors are dominating by using polite floor-stealing phrases.",
    framework: "The Interjection Triptych: 'Pardon the interruption, but taking Rahul's point into the financial realm...'",
    suggestedTopic: "Privatization of Public Sector Banks: Economic Necessity or Social Risk?",
    keyRule: "Wait for the speaker's vocal cadence drop before launching your interjection.",
    minScoreToPass: 72
  },
  {
    day: 6,
    phaseId: 2,
    phaseName: "Phase 2: Argumentation & Floor Stealing",
    title: "Handling Aggressive Debaters & Fish Markets",
    tagline: "When everyone is shouting, the person who restores order wins the moderator's nod.",
    targetTrack: "bschool",
    estimatedMinutes: 18,
    objective: "Act as the group stabilizer when multiple participants speak simultaneously.",
    framework: "The Moderator Pivot: 'Friends, we are speaking over each other. Let us hear Aditya finish for 30 seconds, then discuss Priya's counter.'",
    suggestedTopic: "Gig Economy: Empowerment of Youth or Exploitation without Safety Nets?",
    keyRule: "Lower your pitch and maintain steady eye contact to calm the group down.",
    minScoreToPass: 70
  },
  {
    day: 7,
    phaseId: 2,
    phaseName: "Phase 2: Argumentation & Floor Stealing",
    title: "Data-Driven Rebuttals & Reframing",
    tagline: "Don't say 'You are wrong' — present conflicting data.",
    targetTrack: "consulting",
    estimatedMinutes: 18,
    objective: "Deconstruct flawed statistical reasoning using polite reframing.",
    framework: "The Reframe: 'While that metric holds true in the short term, looking at long-term unit economics reveals...'",
    suggestedTopic: "Freebies in State Politics: Social Welfare or Fiscal Irresponsibility?",
    keyRule: "Always acknowledge the counter-metric before supplying your contradictory evidence.",
    minScoreToPass: 74
  },

  // Phase 3: Abstract & Lateral Thinking
  {
    day: 8,
    phaseId: 3,
    phaseName: "Phase 3: Abstract & Lateral Thinking",
    title: "Deconstructing Single-Word Abstract Topics",
    tagline: "Abstract topics test your breadth of perspective, not your vocabulary.",
    targetTrack: "bschool",
    estimatedMinutes: 15,
    objective: "Break down a one-word abstract topic into 4 distinct societal domains (Economic, Philosophical, Tech, Social).",
    framework: "PESTLE Domain Mapping: Political, Economic, Social, Tech, Legal, Environmental",
    suggestedTopic: "Topic: 'Zero'",
    keyRule: "Deliver interpretations across at least 3 unrelated disciplines.",
    minScoreToPass: 72
  },
  {
    day: 9,
    phaseId: 3,
    phaseName: "Phase 3: Abstract & Lateral Thinking",
    title: "Color & Metaphorical GDs",
    tagline: "Metaphors are analogies waiting to be connected to current affairs.",
    targetTrack: "general",
    estimatedMinutes: 15,
    objective: "Connect an abstract color/symbol to real-world corporate strategy or global affairs.",
    framework: "Symbolic Bridging: Metaphor -> Symbolism -> Current Industrial Context",
    suggestedTopic: "Topic: 'Red is Better Than Blue'",
    keyRule: "Translate 'Red' (Aggression/Startups/Debt) vs 'Blue' (Stability/Corporates/Consensus) into business realities.",
    minScoreToPass: 70
  },
  {
    day: 10,
    phaseId: 3,
    phaseName: "Phase 3: Abstract & Lateral Thinking",
    title: "Paradoxical & Dilemma Topics",
    tagline: "There is no right answer; the value is in how you weigh the trade-offs.",
    targetTrack: "tech_startup",
    estimatedMinutes: 18,
    objective: "Analyze a business or ethical dilemma without adopting a simplistic binary viewpoint.",
    framework: "Trade-off Matrix: Short-term Cost vs Long-term Equity",
    suggestedTopic: "Privacy vs National Security: Where Does the Balance Lie?",
    keyRule: "Propose an actionable middle-ground regulatory framework.",
    minScoreToPass: 75
  },
  {
    day: 11,
    phaseId: 3,
    phaseName: "Phase 3: Abstract & Lateral Thinking",
    title: "The Lateral Pivot",
    tagline: "When a discussion goes circular, introduce an unexpected angle.",
    targetTrack: "bschool",
    estimatedMinutes: 18,
    objective: "Re-energize a stagnant discussion with a creative economic or psychological viewpoint.",
    framework: "The Unseen Stakeholder: 'We have analyzed the customer and company, but what about the supply chain worker?'",
    suggestedTopic: "Speed vs Velocity: Why Indian Startups Are Burning Out Early",
    keyRule: "Focus on sustainable growth over vanity metrics.",
    minScoreToPass: 75
  },

  // Phase 4: Placement Proctored Mock Drives
  {
    day: 12,
    phaseId: 4,
    phaseName: "Phase 4: Placement Proctored Mock Drives",
    title: "Mock Drive: IT Services & Mass Recruiter Track",
    tagline: "TCS / Infosys / Wipro style: Moderation, consensus, and clear articulation.",
    targetTrack: "it_services",
    estimatedMinutes: 20,
    objective: "Clear a 15-minute simulated IT campus round with high clarity, collaborative tone, and flawless turn-taking.",
    framework: "Collaborative Leadership: Support peers, summarize mid-points, speak with steady 130–150 WPM.",
    suggestedTopic: "Upskilling and Reskilling in the Era of Generative AI: Individual Responsibility or Corporate Duty?",
    keyRule: "Zero filler words, warm demeanor, and at least 3 constructive interactions.",
    minScoreToPass: 75
  },
  {
    day: 13,
    phaseId: 4,
    phaseName: "Phase 4: Placement Proctored Mock Drives",
    title: "Mock Drive: Management & B-School Track",
    tagline: "IIM / XLRI style: Fast counterpoints, policy awareness, and high-frequency debate.",
    targetTrack: "bschool",
    estimatedMinutes: 20,
    objective: "Compete against aggressive personas with structured economic reasoning and swift rebuttal handling.",
    framework: "Competitive Rigor: High substance density, quantitative framing, MECE categorization.",
    suggestedTopic: "Universal Basic Income: Feasible Safety Net or Fiscal Disaster for Emerging Markets?",
    keyRule: "Defend against counter-arguments without losing composure.",
    minScoreToPass: 80
  },
  {
    day: 14,
    phaseId: 4,
    phaseName: "Phase 4: Placement Proctored Mock Drives",
    title: "Grand Mock: Tier-1 Consulting Simulation",
    tagline: "McKinsey / BCG style: Hypothesis testing, MECE breakdowns, zero fluff.",
    targetTrack: "consulting",
    estimatedMinutes: 25,
    objective: "Execute a full-length case GD with hypothesis-driven frameworks and definitive business recommendations.",
    framework: "Case GD Framework: Problem Statement -> Market Factors -> Profitability -> Recommendations",
    suggestedTopic: "Reviving a Struggling Indian E-Commerce Brand against Global Giants: A Strategic Roadmap",
    keyRule: "Deliver structured 3-point recommendations with measurable KPIs.",
    minScoreToPass: 82
  }
];
