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

// ─── Phase 1 lesson content: curated topics, framework breakdowns, scripts, pitfalls, presets ───

export interface BootcampTopic {
  title: string;
  category: 'factual' | 'conceptual' | 'controversial' | 'case-study' | 'current-affairs' | 'abstract';
  difficulty: 'easy' | 'medium' | 'hard';
  whyThisTopic: string;
}

export interface FrameworkStep {
  label: string;
  explanation: string;
  samplePhrase: string;
}

export interface SimulationPreset {
  track: BootcampDay['targetTrack'];
  aiParticipants: number;
  aiAggressiveness: 'gentle' | 'balanced' | 'aggressive';
  /** How often AI participants cut in. Defaults from aiAggressiveness. */
  interruptionLevel: 'low' | 'medium' | 'high';
  durationMinutes: number;
  personaIds: string[];
  focusSkills: string[];
  passScore: number;
}

export interface BootcampLesson {
  curatedTopics: BootcampTopic[];
  frameworkSteps: FrameworkStep[];
  exemplarScript: string;
  commonPitfalls: string[];
  simulationPreset: SimulationPreset;
}

const preset = (
  day: number, aiParticipants: number, aiAggressiveness: SimulationPreset['aiAggressiveness'],
  personaIds: string[], focusSkills: string[],
  interruptionLevel?: SimulationPreset['interruptionLevel'],
): SimulationPreset => {
  const d = BOOTCAMP_DAYS.find(x => x.day === day)!;
  const level = interruptionLevel
    ?? (aiAggressiveness === 'gentle' ? 'low' : aiAggressiveness === 'aggressive' ? 'high' : 'medium');
  return { track: d.targetTrack, aiParticipants, aiAggressiveness, interruptionLevel: level, durationMinutes: d.estimatedMinutes, personaIds, focusSkills, passScore: d.minScoreToPass };
};

export const BOOTCAMP_LESSONS: Record<number, BootcampLesson> = {
  1: {
    curatedTopics: [
      { title: "Artificial Intelligence: Catalyst for Productivity or Unemployment Threat?", category: "current-affairs", difficulty: "easy", whyThisTopic: "Key terms (AI, productivity, unemployment) beg to be defined before arguing." },
      { title: "Is a College Degree Still Necessary for a Successful Career?", category: "conceptual", difficulty: "easy", whyThisTopic: "'Successful' is vague — perfect for practising boundary-setting." },
      { title: "Digital India: Bridging or Widening the Urban-Rural Divide?", category: "factual", difficulty: "medium", whyThisTopic: "Gives clear dimensions (access, literacy, infrastructure) for an agenda." },
    ],
    frameworkSteps: [
      { label: "Definition", explanation: "Clarify what the key terms mean in this discussion.", samplePhrase: "By AI, let us consider tools that automate cognitive tasks, not just robotics." },
      { label: "Dimension", explanation: "Lay out 2–3 lenses the group can explore.", samplePhrase: "We can look at this economically, socially, and from a policy angle." },
      { label: "Direction", explanation: "Propose where the group should begin.", samplePhrase: "Perhaps we start with the economic impact on jobs." },
    ],
    exemplarScript: "Good morning everyone. Before we take sides, let us define AI here as software that automates cognitive work. I see three dimensions: the economic impact on jobs, the skills shift for workers, and the role of policy. Maybe we begin with jobs, since that is where the fear is strongest.",
    commonPitfalls: ["Opening with 'I think' or a personal stance", "Speaking longer than 60 seconds in the opening", "Listing dimensions but never proposing where to start", "Reciting a memorised quote unrelated to the topic"],
    simulationPreset: preset(1, 3, "gentle", ["priya", "aditya", "meera"], ["Initiation", "Structure", "Clarity"]),
  },
  2: {
    curatedTopics: [
      { title: "Work from Home vs Hybrid: Finding the Ideal Workplace for IT Talents", category: "controversial", difficulty: "easy", whyThisTopic: "Everyone has an opinion — lots of peer points to bridge from." },
      { title: "Should Social Media Be Banned for Children Under 16?", category: "controversial", difficulty: "medium", whyThisTopic: "Strong views on both sides reward acknowledging before pivoting." },
      { title: "Four-Day Work Week: Productivity Boost or Business Risk?", category: "current-affairs", difficulty: "medium", whyThisTopic: "Multiple stakeholders make it easy to add an unexplored dimension." },
    ],
    frameworkSteps: [
      { label: "Anchor", explanation: "Name a peer and restate their point fairly.", samplePhrase: "Rahul rightly pointed out that commuting costs fall with remote work." },
      { label: "Bridge", explanation: "Connect it to a new angle with a linking phrase.", samplePhrase: "Building on that, we must also consider..." },
      { label: "Extend", explanation: "Add a fresh dimension not yet discussed.", samplePhrase: "...the impact on mentoring for freshers who learn by observing seniors." },
    ],
    exemplarScript: "Priya made a strong point about flexibility improving retention. Building on that, we haven't yet discussed freshers — they learn a lot by watching seniors. A hybrid model with fixed team days might keep the flexibility Priya described while protecting that learning.",
    commonPitfalls: ["Saying 'I agree' and then repeating the same point", "Misquoting a peer's argument", "Bridging without adding anything new", "Forgetting to use names"],
    simulationPreset: preset(2, 4, "gentle", ["priya", "meera", "aditya", "rohan"], ["Active Listening", "Building on Points", "Team Harmony"]),
  },
  3: {
    curatedTopics: [
      { title: "Central Bank Digital Currencies (CBDCs): Future of Indian Banking?", category: "current-affairs", difficulty: "medium", whyThisTopic: "Technical debate with clear convergence and divergence points." },
      { title: "Should India Adopt One Nation, One Election?", category: "controversial", difficulty: "hard", whyThisTopic: "Polarising — tests staying neutral while summarising." },
      { title: "Electric Vehicles vs Hydrogen: The Future of Indian Mobility", category: "factual", difficulty: "medium", whyThisTopic: "Multiple valid positions to synthesise into a way forward." },
    ],
    frameworkSteps: [
      { label: "Consensus", explanation: "State what most of the group agreed on.", samplePhrase: "The group broadly agreed that CBDCs can cut transaction costs." },
      { label: "Divergence", explanation: "Name the open disagreements neutrally.", samplePhrase: "Views differed on privacy and the impact on bank deposits." },
      { label: "Way Forward", explanation: "Close with the group's suggested path, not yours.", samplePhrase: "A phased pilot with privacy safeguards emerged as a balanced path." },
    ],
    exemplarScript: "To summarise: we broadly agreed CBDCs could lower costs and improve financial inclusion. Where we differed was privacy and whether banks lose deposits. Aditya and Meera suggested a phased rollout with strict privacy limits, which seemed the group's preferred way forward.",
    commonPitfalls: ["Adding a new argument in the summary", "Taking a personal side", "Summarising only your own points", "Running past 90 seconds"],
    simulationPreset: preset(3, 4, "balanced", ["rohan", "aditya", "meera", "vikram"], ["Summarisation", "Neutrality", "Conciseness"]),
  },
  4: {
    curatedTopics: [
      { title: "Electric Vehicle Transition in India: Infrastructure Realities vs Government Targets", category: "factual", difficulty: "medium", whyThisTopic: "Rich in data — charging stations, subsidies, sales numbers." },
      { title: "Is India Ready for a $5 Trillion Economy?", category: "factual", difficulty: "hard", whyThisTopic: "Every claim needs a metric to be credible." },
      { title: "Should Coal Power Be Phased Out by 2040?", category: "current-affairs", difficulty: "medium", whyThisTopic: "Forces evidence-backed points over emotional ones." },
    ],
    frameworkSteps: [
      { label: "Point", explanation: "One clear claim in one sentence.", samplePhrase: "Charging infrastructure is the main bottleneck." },
      { label: "Evidence", explanation: "Back it with a stat, policy or example.", samplePhrase: "India has roughly one public charger for every 100+ EVs." },
      { label: "Explanation", explanation: "Explain why the evidence matters.", samplePhrase: "Without chargers, range anxiety stops buyers despite subsidies." },
      { label: "Link", explanation: "Tie it back to the topic.", samplePhrase: "So targets will slip unless infrastructure spending comes first." },
    ],
    exemplarScript: "My point is that charging infrastructure, not price, is the real bottleneck. Public chargers are far fewer than EVs on the road, which creates range anxiety even when subsidies make cars affordable. So unless infrastructure leads, the government targets will be hard to meet.",
    commonPitfalls: ["Quoting statistics you cannot defend", "Evidence without explaining why it matters", "Forgetting to link back to the topic", "Stacking three points in one turn"],
    simulationPreset: preset(4, 4, "balanced", ["aditya", "rohan", "vikram", "priya"], ["Evidence", "Logical Structure", "Relevance"]),
  },
  5: {
    curatedTopics: [
      { title: "Privatization of Public Sector Banks: Economic Necessity or Social Risk?", category: "controversial", difficulty: "medium", whyThisTopic: "Dominant AI speakers make you practise claiming the floor." },
      { title: "Should Big Tech Be Broken Up?", category: "controversial", difficulty: "hard", whyThisTopic: "Fast-moving debate with few natural pauses." },
      { title: "Startups vs Corporates: Where Should Freshers Begin?", category: "conceptual", difficulty: "easy", whyThisTopic: "Familiar topic so you can focus on timing, not content." },
    ],
    frameworkSteps: [
      { label: "Wait for the drop", explanation: "Listen for the speaker's pitch falling at a sentence end.", samplePhrase: "(pause as they finish a sentence)" },
      { label: "Polite entry", explanation: "Use a courteous opener.", samplePhrase: "Pardon the interruption, but..." },
      { label: "Redirect", explanation: "Connect their point to your new angle.", samplePhrase: "...taking Rahul's point into the financial realm..." },
    ],
    exemplarScript: "Sorry to cut in, Rohan — taking your point on efficiency into the financial realm, private banks still avoid rural branches because they are less profitable. So privatisation could hurt inclusion unless there are clear service obligations.",
    commonPitfalls: ["Talking over someone mid-sentence", "Waiting so long you never speak", "Apologising too much and losing the floor", "Entering without linking to the previous speaker"],
    simulationPreset: preset(5, 4, "aggressive", ["rohan", "vikram", "aditya", "meera"], ["Floor Claiming", "Timing", "Politeness"]),
  },
  6: {
    curatedTopics: [
      { title: "Gig Economy: Empowerment of Youth or Exploitation without Safety Nets?", category: "controversial", difficulty: "medium", whyThisTopic: "Emotional topic that tends to become a shouting match." },
      { title: "Should Reservations Be Based on Economic Criteria Only?", category: "controversial", difficulty: "hard", whyThisTopic: "Sensitive — rewards calming the room." },
      { title: "Cricket Gets Too Much Attention Compared to Other Sports", category: "conceptual", difficulty: "easy", whyThisTopic: "Passionate but low-stakes chaos to practise on." },
    ],
    frameworkSteps: [
      { label: "Pause the room", explanation: "Calmly name what is happening.", samplePhrase: "Friends, we are speaking over each other." },
      { label: "Give order", explanation: "Allocate the floor fairly.", samplePhrase: "Let us hear Aditya finish, then Priya's counter." },
      { label: "Add value", explanation: "Contribute a point so you're not just a traffic cop.", samplePhrase: "One thing both sides miss is social security for gig workers." },
    ],
    exemplarScript: "Friends, I think we are all speaking at once. Aditya, please finish your point about flexible income, and then Priya can respond on safety nets. One thing both sides may agree on is that gig workers need portable social security.",
    commonPitfalls: ["Raising your voice to restore order", "Policing the room without contributing content", "Taking sides while moderating", "Doing it too often and seeming bossy"],
    simulationPreset: preset(6, 5, "aggressive", ["rohan", "vikram", "aditya", "meera", "priya"], ["Composure", "Leadership", "Group Management"]),
  },
  7: {
    curatedTopics: [
      { title: "Freebies in State Politics: Social Welfare or Fiscal Irresponsibility?", category: "controversial", difficulty: "hard", whyThisTopic: "Common flawed stats on both sides to reframe." },
      { title: "Is Unemployment in India Overstated?", category: "factual", difficulty: "hard", whyThisTopic: "Different surveys give conflicting numbers." },
      { title: "Quick Commerce: Convenience or Unsustainable Burn?", category: "case-study", difficulty: "medium", whyThisTopic: "Short-term growth vs long-term unit economics." },
    ],
    frameworkSteps: [
      { label: "Acknowledge", explanation: "Accept the other metric as partly true.", samplePhrase: "That figure is right for the short term." },
      { label: "Reframe", explanation: "Shift the time horizon or scope.", samplePhrase: "Looking at long-term unit economics, though..." },
      { label: "Counter-evidence", explanation: "Bring your contradictory data.", samplePhrase: "...states with high subsidies show rising debt-to-GDP ratios." },
    ],
    exemplarScript: "Meera's point that free electricity raised household savings is valid in the short run. But if we look at the longer term, several states with large freebies now spend more on interest than on capital projects. So the question is less whether welfare helps, and more how it is funded.",
    commonPitfalls: ["Saying 'you are wrong'", "Dismissing data without offering your own", "Cherry-picking a single statistic", "Getting defensive when challenged back"],
    simulationPreset: preset(7, 4, "aggressive", ["aditya", "rohan", "vikram", "meera"], ["Rebuttal", "Data Use", "Reframing"]),
  },
  8: {
    curatedTopics: [
      { title: "Topic: 'Zero'", category: "abstract", difficulty: "medium", whyThisTopic: "Maths, economics (zero interest), tech (zero-day), philosophy." },
      { title: "Topic: 'Bridges'", category: "abstract", difficulty: "medium", whyThisTopic: "Infrastructure, diplomacy, relationships, technology." },
      { title: "Topic: 'Silence'", category: "abstract", difficulty: "hard", whyThisTopic: "Social, political and psychological readings." },
    ],
    frameworkSteps: [
      { label: "Brainstorm domains", explanation: "List PESTLE lenses quickly.", samplePhrase: "Zero can be seen economically, technologically and philosophically." },
      { label: "Pick 3+", explanation: "Choose unrelated domains.", samplePhrase: "Zero-interest policy, zero-day cyberattacks and India's gift of zero." },
      { label: "Connect", explanation: "Find a common thread.", samplePhrase: "In each, zero marks a turning point, not emptiness." },
    ],
    exemplarScript: "Zero can be read in several ways. Economically, zero-interest rates fuelled asset bubbles. In technology, a zero-day attack shows how unknown risks matter most. And historically, India's invention of zero shows that 'nothing' can be foundational. Common thread: zero is a threshold, not an absence.",
    commonPitfalls: ["Staying in one domain", "Using fancy vocabulary instead of ideas", "Being too literal", "Not connecting interpretations back together"],
    simulationPreset: preset(8, 4, "balanced", ["meera", "aditya", "rohan", "priya"], ["Breadth", "Creativity", "Structure"]),
  },
  9: {
    curatedTopics: [
      { title: "Topic: 'Red is Better Than Blue'", category: "abstract", difficulty: "medium", whyThisTopic: "Classic colour GD translatable into business strategy." },
      { title: "Topic: 'The Elephant and the Ant'", category: "abstract", difficulty: "medium", whyThisTopic: "Corporates vs startups, nations, scale vs agility." },
      { title: "Topic: 'Glass Ceiling or Glass Floor?'", category: "abstract", difficulty: "hard", whyThisTopic: "Metaphor with social and workplace meaning." },
    ],
    frameworkSteps: [
      { label: "Metaphor", explanation: "State the literal image.", samplePhrase: "Red and blue are just colours on the surface." },
      { label: "Symbolism", explanation: "Give what each represents.", samplePhrase: "Red signals urgency and aggression; blue stability and trust." },
      { label: "Context", explanation: "Map it to a real industry or event.", samplePhrase: "Red-ocean startups burn cash; blue-chip firms grow steadily." },
    ],
    exemplarScript: "If red stands for aggression and speed, and blue for stability, then this is really startups versus established corporates. Red strategies win markets fast but often run on debt; blue ones compound slowly. The better colour depends on the stage of the business.",
    commonPitfalls: ["Discussing only literal colours", "Forcing one meaning on the group", "No real-world example", "Ignoring others' interpretations"],
    simulationPreset: preset(9, 4, "balanced", ["meera", "priya", "aditya", "rohan"], ["Lateral Thinking", "Analogy", "Relevance"]),
  },
  10: {
    curatedTopics: [
      { title: "Privacy vs National Security: Where Does the Balance Lie?", category: "controversial", difficulty: "hard", whyThisTopic: "Genuine trade-off with no binary answer." },
      { title: "Growth vs Sustainability: Can Startups Have Both?", category: "case-study", difficulty: "medium", whyThisTopic: "Short-term cost vs long-term equity." },
      { title: "Should AI-Generated Content Be Labelled by Law?", category: "current-affairs", difficulty: "medium", whyThisTopic: "Innovation vs transparency trade-off." },
    ],
    frameworkSteps: [
      { label: "Name both values", explanation: "Show each side's legitimate interest.", samplePhrase: "Both privacy and security protect citizens." },
      { label: "Weigh trade-offs", explanation: "Compare short-term cost and long-term equity.", samplePhrase: "Mass surveillance helps now but erodes trust long term." },
      { label: "Middle path", explanation: "Propose an actionable framework.", samplePhrase: "Targeted access with judicial warrants and audits." },
    ],
    exemplarScript: "Both values protect citizens, so the question is how much of one we give up for the other. Blanket surveillance may stop threats short term but erodes trust and can be misused. A middle path is targeted access with court approval, time limits and an independent audit.",
    commonPitfalls: ["Picking one side absolutely", "Vague 'balance is needed' with no mechanism", "Ignoring the legitimate concerns of the other side", "Over-relying on one country's example"],
    // Balanced tone, but AI participants cut in often so the candidate
    // practises holding a nuanced trade-off under pressure.
    simulationPreset: preset(10, 4, "balanced", ["rohan", "meera", "aditya", "vikram"], ["Trade-off Analysis", "Nuance", "Solutions"], "high"),
  },
  11: {
    curatedTopics: [
      { title: "Speed vs Velocity: Why Indian Startups Are Burning Out Early", category: "case-study", difficulty: "hard", whyThisTopic: "Discussions loop on funding — perfect for a pivot." },
      { title: "Is Hustle Culture Killing Creativity?", category: "conceptual", difficulty: "medium", whyThisTopic: "Psychological angles are often missed." },
      { title: "Fast Fashion: Who Really Pays the Price?", category: "current-affairs", difficulty: "medium", whyThisTopic: "Hidden stakeholders like supply-chain workers." },
    ],
    frameworkSteps: [
      { label: "Spot the loop", explanation: "Notice when points repeat.", samplePhrase: "We seem to be circling around funding." },
      { label: "Unseen stakeholder", explanation: "Bring in someone not discussed.", samplePhrase: "What about the founders' mental health, or delivery partners?" },
      { label: "Re-anchor", explanation: "Tie the new angle to the core question.", samplePhrase: "Sustainable velocity needs people who don't burn out." },
    ],
    exemplarScript: "We keep returning to funding, but there's a stakeholder we haven't discussed — the early employees. Many startups grow fast by overworking a small team, and when they leave, the knowledge goes with them. Velocity means direction plus speed, and that needs a stable team.",
    commonPitfalls: ["Pivoting to something unrelated", "Pivoting too early before the loop exists", "Not explaining why the new angle matters", "Abandoning the pivot when challenged"],
    simulationPreset: preset(11, 4, "balanced", ["rohan", "aditya", "vikram", "meera"], ["Lateral Thinking", "Originality", "Re-energising"]),
  },
  12: {
    curatedTopics: [
      { title: "Upskilling and Reskilling in the Era of Generative AI: Individual Responsibility or Corporate Duty?", category: "current-affairs", difficulty: "medium", whyThisTopic: "Typical IT campus round theme." },
      { title: "Is Moonlighting Ethical for IT Employees?", category: "controversial", difficulty: "medium", whyThisTopic: "Recent industry debate; consensus-friendly." },
      { title: "Teamwork vs Individual Brilliance: What Matters More?", category: "conceptual", difficulty: "easy", whyThisTopic: "Classic mass-recruiter GD." },
    ],
    frameworkSteps: [
      { label: "Support", explanation: "Credit good peer points.", samplePhrase: "I'd like to support Meera's idea of learning budgets." },
      { label: "Mid-summary", explanation: "Summarise halfway to keep the group aligned.", samplePhrase: "So far we agree both sides share responsibility." },
      { label: "Steady delivery", explanation: "Speak clearly at 130–150 words per minute.", samplePhrase: "(calm, clear pace, no fillers)" },
    ],
    exemplarScript: "I'd like to build on Meera's idea. Companies benefit directly from skilled staff, so funding courses makes sense, but individuals must also put in the time. To summarise where we are: most of us see this as a shared responsibility, with companies providing resources and employees committing to learn.",
    commonPitfalls: ["Fillers like 'um', 'like', 'basically'", "Aggressive interruptions", "Fewer than 3 interactions with peers", "No mid-discussion summary"],
    simulationPreset: preset(12, 5, "gentle", ["priya", "meera", "aditya", "rohan", "vikram"], ["Clarity", "Consensus", "Turn-Taking"]),
  },
  13: {
    curatedTopics: [
      { title: "Universal Basic Income: Feasible Safety Net or Fiscal Disaster for Emerging Markets?", category: "controversial", difficulty: "hard", whyThisTopic: "Standard IIM policy GD." },
      { title: "Should India Prioritise Manufacturing Over Services?", category: "factual", difficulty: "hard", whyThisTopic: "Needs economic depth and fast rebuttals." },
      { title: "Is Inflation Targeting Still Relevant for the RBI?", category: "current-affairs", difficulty: "hard", whyThisTopic: "Policy awareness under pressure." },
    ],
    frameworkSteps: [
      { label: "Quantify", explanation: "Frame with numbers early.", samplePhrase: "A UBI of ₹1,000 a month for 50 crore people costs about 3% of GDP." },
      { label: "Categorise (MECE)", explanation: "Split cleanly: cost, impact, implementation.", samplePhrase: "Let's look at affordability, labour incentives and delivery." },
      { label: "Defend calmly", explanation: "Absorb counters without losing composure.", samplePhrase: "Fair challenge — that's why I suggest a targeted pilot." },
    ],
    exemplarScript: "Let's quantify first: even a modest UBI for half the population would cost roughly 3% of GDP. I'd split this into affordability, effect on work, and delivery. Vikram's concern about work incentives is fair — evidence from pilots is mixed — which is why a targeted version replacing existing subsidies looks more feasible.",
    commonPitfalls: ["Getting rattled by aggressive personas", "Numbers without sources or logic", "Overlapping categories", "Losing the floor after one turn"],
    simulationPreset: preset(13, 5, "aggressive", ["rohan", "aditya", "vikram", "meera", "priya"], ["Economic Depth", "Rebuttal", "Composure"]),
  },
  14: {
    curatedTopics: [
      { title: "Reviving a Struggling Indian E-Commerce Brand against Global Giants: A Strategic Roadmap", category: "case-study", difficulty: "hard", whyThisTopic: "Full consulting-style case GD." },
      { title: "A Regional Airline Is Losing Money: Fix It in 12 Months", category: "case-study", difficulty: "hard", whyThisTopic: "Profitability tree in action." },
      { title: "Should a Legacy FMCG Brand Launch a D2C Channel?", category: "case-study", difficulty: "hard", whyThisTopic: "Market entry and channel conflict." },
    ],
    frameworkSteps: [
      { label: "Problem statement", explanation: "Restate the goal and constraints.", samplePhrase: "The goal is profitable growth in 18 months against Amazon and Flipkart." },
      { label: "Market factors", explanation: "Customers, competitors, capabilities.", samplePhrase: "Our edge is regional assortment and vernacular reach." },
      { label: "Profitability", explanation: "Revenue levers vs cost levers.", samplePhrase: "Raise repeat rate; cut logistics cost per order." },
      { label: "Recommendations", explanation: "3 actions with KPIs.", samplePhrase: "Target 35% repeat rate, ₹40 lower cost per order, 2 new regions." },
    ],
    exemplarScript: "Let me restate the goal: profitable growth within 18 months against global giants. Our edge is regional assortment and vernacular reach. On profitability, revenue depends on repeat customers and cost on logistics. So three recommendations: a loyalty programme targeting 35% repeat rate, regional warehouses to cut per-order cost, and expansion into two tier-2 regions.",
    commonPitfalls: ["Jumping to solutions without a problem statement", "Recommendations without measurable KPIs", "Overlapping, non-MECE buckets", "Ignoring competitors' response"],
    simulationPreset: preset(14, 5, "aggressive", ["aditya", "rohan", "vikram", "meera", "priya"], ["MECE", "Hypothesis", "Recommendations"]),
  },
};

export const getBootcampLesson = (day: number): BootcampLesson | undefined => BOOTCAMP_LESSONS[day];

/** Topic object in the shape the practice setup expects, so bootcamp launches never bounce to the catalogue. */
export const toPracticeTopic = (dayItem: BootcampDay, topic?: BootcampTopic) => {
  const t = topic ?? BOOTCAMP_LESSONS[dayItem.day]?.curatedTopics[0];
  return {
    title: t?.title ?? dayItem.suggestedTopic,
    category: t?.category ?? 'conceptual',
    difficulty: t?.difficulty ?? 'medium',
    tags: ['bootcamp', `day-${dayItem.day}`, dayItem.targetTrack],
    prompts: [dayItem.objective, dayItem.keyRule],
    bootcampDay: dayItem.day,
    track: dayItem.targetTrack,
  };
};
