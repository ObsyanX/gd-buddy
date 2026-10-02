export interface CompanyTrack {
  id: 'consulting' | 'it_services' | 'bschool' | 'tech_startup' | 'general';
  name: string;
  badge: string;
  description: string;
  evaluationFocus: string[];
  recommendedPersonas: string[];
  interruptionTolerance: 'low' | 'moderate' | 'high';
  conductorPromptModifier: string;
}

export const COMPANY_TRACKS: Record<string, CompanyTrack> = {
  consulting: {
    id: 'consulting',
    name: 'Consulting Case GD',
    badge: 'McKinsey / BCG / Bain / Big 4',
    description: 'Structured, MECE problem solving, quantitative hypotheses, and business framework rigor.',
    evaluationFocus: ['MECE Frameworks', 'Data Backing', 'Logical Structure', 'Hypothesis Testing'],
    recommendedPersonas: ['aditya', 'rohan', 'vikram'],
    interruptionTolerance: 'moderate',
    conductorPromptModifier: 'Company Track: TOP-TIER MANAGEMENT CONSULTING. AI participants should challenge logical fallacies, demand quantitative validation, push for structured frameworks (MECE, 3Cs, 4Ps), and rigorously question unverified assumptions.',
  },
  it_services: {
    id: 'it_services',
    name: 'IT Services & Mass Recruiters',
    badge: 'TCS / Infosys / Wipro / Cognizant',
    description: 'Consensus building, polite turn-taking, cultural fit, and clear articulation on abstract or social topics.',
    evaluationFocus: ['Team Harmony', 'Clarity of Speech', 'Polite Turn-Taking', 'Conclusion Building'],
    recommendedPersonas: ['priya', 'meera', 'aditya'],
    interruptionTolerance: 'low',
    conductorPromptModifier: 'Company Track: IT SERVICES & CORPORATE PLACEMENT. Focus on collaborative problem solving, polite language, team harmony, and synthesis. AI participants should rarely interrupt aggressively and should reward candidates who summarize and build consensus.',
  },
  bschool: {
    id: 'bschool',
    name: 'Top B-School & IIM Policy GD',
    badge: 'IIM A/B/C / XLRI / FMS / SPJIMR',
    description: 'Fast-paced, aggressive, high-stakes macro-economic and ethical debates. Floor competition is intense.',
    evaluationFocus: ['Speed of Entry', 'Economic Depth', 'Handling Aggression', 'Rebuttal Precision'],
    recommendedPersonas: ['rohan', 'aditya', 'vikram', 'meera'],
    interruptionTolerance: 'high',
    conductorPromptModifier: 'Company Track: IIM / TOP B-SCHOOL GD. The room is competitive and dynamic. AI participants should challenge candidates quickly, introduce counter-perspectives, compete for airtime, and simulate real B-school pressure.',
  },
  tech_startup: {
    id: 'tech_startup',
    name: 'Product & High-Growth Startups',
    badge: 'Bangalore Tech / Unicorns / Product Firms',
    description: '0-to-1 tradeoffs, user metrics, execution speed, scalability bottlenecks, and customer-first thinking.',
    evaluationFocus: ['Product Thinking', 'Scalability', 'Tradeoff Analysis', 'Customer Empathy'],
    recommendedPersonas: ['rohan', 'meera', 'aditya'],
    interruptionTolerance: 'moderate',
    conductorPromptModifier: 'Company Track: PRODUCT & TECH STARTUP. Focus on MVP thinking, unit economics (CAC, LTV), scalability limits, and pragmatic execution over pure theory.',
  },
};
