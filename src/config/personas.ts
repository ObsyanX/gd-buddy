// Comprehensive participant profiles for GD sessions

export interface PersonaTemplate {
  id: string;
  name: string;
  role: string;
  corePerspective: string;
  tone: string;
  verbosity: 'concise' | 'moderate' | 'elaborate';
  interrupt_level: number;
  agreeability: number;
  vocab_level: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  voice_name: string;
  category: 'core' | 'extended' | 'custom';
}

// Core Team Members
const CORE_PERSONAS: PersonaTemplate[] = [
  {
    id: 'aditya',
    name: 'Aditya',
    role: 'Data Analyst',
    corePerspective: 'Fact-driven, statistics, logic',
    tone: 'analytical',
    verbosity: 'moderate',
    interrupt_level: 0.2,
    agreeability: 0.1,
    vocab_level: 'advanced',
    description: 'Uses data and statistics to support arguments',
    voice_name: 'roger',
    category: 'core'
  },
  {
    id: 'priya',
    name: 'Priya',
    role: 'HR Manager',
    corePerspective: 'Consensus, people-centric',
    tone: 'diplomatic',
    verbosity: 'moderate',
    interrupt_level: 0.15,
    agreeability: 0.5,
    vocab_level: 'intermediate',
    description: 'Seeks consensus and considers human impact',
    voice_name: 'sarah',
    category: 'core'
  },
  {
    id: 'rohan',
    name: 'Rohan',
    role: 'Business Lead',
    corePerspective: 'Decision-making, results',
    tone: 'assertive',
    verbosity: 'concise',
    interrupt_level: 0.5,
    agreeability: -0.2,
    vocab_level: 'advanced',
    description: 'Direct and focused on outcomes',
    voice_name: 'george',
    category: 'core'
  },
  {
    id: 'meera',
    name: 'Meera',
    role: 'Designer',
    corePerspective: 'Creativity, innovation',
    tone: 'enthusiastic',
    verbosity: 'elaborate',
    interrupt_level: 0.3,
    agreeability: 0.3,
    vocab_level: 'intermediate',
    description: 'Brings creative and innovative perspectives',
    voice_name: 'aria',
    category: 'core'
  },
  {
    id: 'vikram',
    name: 'Vikram',
    role: 'Legal Counsel',
    corePerspective: 'Risk, compliance, devil\'s advocate',
    tone: 'critical',
    verbosity: 'moderate',
    interrupt_level: 0.4,
    agreeability: -0.4,
    vocab_level: 'advanced',
    description: 'Challenges ideas and highlights risks',
    voice_name: 'daniel',
    category: 'core'
  },
  {
    id: 'karthik',
    name: 'Karthik',
    role: 'Software Engineer',
    corePerspective: 'Technical feasibility',
    tone: 'technical',
    verbosity: 'concise',
    interrupt_level: 0.25,
    agreeability: 0,
    vocab_level: 'advanced',
    description: 'Focuses on technical implementation',
    voice_name: 'brian',
    category: 'core'
  },
  {
    id: 'ananya',
    name: 'Ananya',
    role: 'Strategy Consultant',
    corePerspective: 'Long-term vision',
    tone: 'strategic',
    verbosity: 'moderate',
    interrupt_level: 0.35,
    agreeability: 0.2,
    vocab_level: 'advanced',
    description: 'Big-picture thinking and future planning',
    voice_name: 'charlotte',
    category: 'core'
  },
  {
    id: 'rahul',
    name: 'Rahul',
    role: 'Team Lead',
    corePerspective: 'Inclusion, facilitation',
    tone: 'supportive',
    verbosity: 'moderate',
    interrupt_level: 0.1,
    agreeability: 0.6,
    vocab_level: 'intermediate',
    description: 'Encourages participation and builds on ideas',
    voice_name: 'callum',
    category: 'core'
  },
  {
    id: 'neha',
    name: 'Neha',
    role: 'Researcher',
    corePerspective: 'Evidence validation',
    tone: 'skeptical',
    verbosity: 'elaborate',
    interrupt_level: 0.3,
    agreeability: -0.3,
    vocab_level: 'advanced',
    description: 'Questions assumptions with evidence',
    voice_name: 'jessica',
    category: 'core'
  },
  {
    id: 'arjun',
    name: 'Arjun',
    role: 'Operations Manager',
    corePerspective: 'Execution & feasibility',
    tone: 'pragmatic',
    verbosity: 'concise',
    interrupt_level: 0.2,
    agreeability: 0.1,
    vocab_level: 'intermediate',
    description: 'Focuses on practical implementation',
    voice_name: 'chris',
    category: 'core'
  }
];

// Extended Team Members
const EXTENDED_PERSONAS: PersonaTemplate[] = [
  {
    id: 'sneha',
    name: 'Sneha',
    role: 'Economist',
    corePerspective: 'Macro economy, policy impact',
    tone: 'rational',
    verbosity: 'moderate',
    interrupt_level: 0.25,
    agreeability: 0.1,
    vocab_level: 'advanced',
    description: 'Analyzes economic implications and policy',
    voice_name: 'alice',
    category: 'extended'
  },
  {
    id: 'aman',
    name: 'Aman',
    role: 'Startup Founder',
    corePerspective: 'Risk, innovation, speed',
    tone: 'energetic',
    verbosity: 'concise',
    interrupt_level: 0.45,
    agreeability: 0.2,
    vocab_level: 'intermediate',
    description: 'Brings entrepreneurial mindset and urgency',
    voice_name: 'eric',
    category: 'extended'
  },
  {
    id: 'pooja',
    name: 'Pooja',
    role: 'Social Activist',
    corePerspective: 'Ethics, inclusivity',
    tone: 'passionate',
    verbosity: 'elaborate',
    interrupt_level: 0.35,
    agreeability: 0.3,
    vocab_level: 'intermediate',
    description: 'Advocates for social responsibility',
    voice_name: 'matilda',
    category: 'extended'
  },
  {
    id: 'nikhil',
    name: 'Nikhil',
    role: 'Financial Analyst',
    corePerspective: 'ROI, cost-benefit',
    tone: 'analytical',
    verbosity: 'concise',
    interrupt_level: 0.2,
    agreeability: -0.1,
    vocab_level: 'advanced',
    description: 'Evaluates financial viability and returns',
    voice_name: 'liam',
    category: 'extended'
  },
  {
    id: 'ishita',
    name: 'Ishita',
    role: 'Psychologist',
    corePerspective: 'Human behavior',
    tone: 'empathetic',
    verbosity: 'moderate',
    interrupt_level: 0.15,
    agreeability: 0.4,
    vocab_level: 'advanced',
    description: 'Understands behavioral and emotional aspects',
    voice_name: 'lily',
    category: 'extended'
  },
  {
    id: 'suresh',
    name: 'Suresh',
    role: 'Policy Advisor',
    corePerspective: 'Governance & regulation',
    tone: 'formal',
    verbosity: 'elaborate',
    interrupt_level: 0.2,
    agreeability: 0,
    vocab_level: 'advanced',
    description: 'Expert in policy and regulatory frameworks',
    voice_name: 'bill',
    category: 'extended'
  },
  {
    id: 'kabir',
    name: 'Kabir',
    role: 'Media Expert',
    corePerspective: 'Public perception',
    tone: 'persuasive',
    verbosity: 'moderate',
    interrupt_level: 0.4,
    agreeability: 0.2,
    vocab_level: 'intermediate',
    description: 'Understands media dynamics and public opinion',
    voice_name: 'charlie',
    category: 'extended'
  },
  {
    id: 'ritika',
    name: 'Ritika',
    role: 'Sustainability Expert',
    corePerspective: 'ESG, environment',
    tone: 'thoughtful',
    verbosity: 'moderate',
    interrupt_level: 0.25,
    agreeability: 0.3,
    vocab_level: 'advanced',
    description: 'Focuses on environmental and social governance',
    voice_name: 'freya',
    category: 'extended'
  },
  {
    id: 'dev',
    name: 'Dev',
    role: 'Cybersecurity Expert',
    corePerspective: 'Digital risk & privacy',
    tone: 'cautious',
    verbosity: 'concise',
    interrupt_level: 0.3,
    agreeability: -0.2,
    vocab_level: 'advanced',
    description: 'Highlights digital security and privacy concerns',
    voice_name: 'michael',
    category: 'extended'
  },
  {
    id: 'monika',
    name: 'Monika',
    role: 'Student Representative',
    corePerspective: 'Youth perspective',
    tone: 'curious',
    verbosity: 'moderate',
    interrupt_level: 0.15,
    agreeability: 0.5,
    vocab_level: 'beginner',
    description: 'Brings fresh, young perspective to discussions',
    voice_name: 'glinda',
    category: 'extended'
  }
];

// All personas combined
export const PERSONA_TEMPLATES: PersonaTemplate[] = [...CORE_PERSONAS, ...EXTENDED_PERSONAS];

// Topic-based recommended combinations
export const TOPIC_COMBINATIONS = {
  'technology': ['karthik', 'aditya', 'dev', 'ishita', 'ananya', 'priya'],
  'business': ['aman', 'rohan', 'nikhil', 'sneha', 'arjun', 'neha'],
  'social': ['pooja', 'vikram', 'kabir', 'ishita', 'rahul', 'suresh'],
  'education': ['monika', 'priya', 'ishita', 'ananya', 'meera', 'sneha'],
  'environment': ['ritika', 'sneha', 'arjun', 'rohan', 'pooja', 'vikram'],
  'case-study': ['dev', 'kabir', 'vikram', 'priya', 'rohan', 'rahul'],
  'abstract': ['meera', 'aman', 'neha', 'ishita', 'ananya', 'rahul'],
};

// Get personas by category
export const getCorePersonas = () => CORE_PERSONAS;
export const getExtendedPersonas = () => EXTENDED_PERSONAS;

// Get recommended personas for a topic category
export const getRecommendedPersonas = (topicCategory: keyof typeof TOPIC_COMBINATIONS) => {
  const recommendedIds = TOPIC_COMBINATIONS[topicCategory] || [];
  return PERSONA_TEMPLATES.filter(p => recommendedIds.includes(p.id));
};

// Get recommended persona IDs for a topic category
export const getRecommendedPersonaIds = (topicCategory: keyof typeof TOPIC_COMBINATIONS): string[] => {
  return TOPIC_COMBINATIONS[topicCategory] || [];
};

// Detect topic category from topic text/category
export const detectTopicCategory = (topicText: string, category?: string): keyof typeof TOPIC_COMBINATIONS | null => {
  const text = `${topicText} ${category || ''}`.toLowerCase();
  
  // Technology & AI
  if (text.match(/\b(ai|artificial intelligence|technology|tech|software|digital|cyber|machine learning|automation|robot|internet|data|algorithm)\b/)) {
    return 'technology';
  }
  
  // Business & Startup
  if (text.match(/\b(business|startup|entrepreneur|market|economy|finance|investment|corporate|company|profit|revenue|stock|valuation)\b/)) {
    return 'business';
  }
  
  // Social & Ethical
  if (text.match(/\b(social|society|ethics|moral|media|culture|rights|justice|equality|discrimination|privacy|regulation)\b/)) {
    return 'social';
  }
  
  // Education & Youth
  if (text.match(/\b(education|school|university|student|learning|teaching|youth|skill|training|curriculum|exam)\b/)) {
    return 'education';
  }
  
  // Environmental & Sustainability
  if (text.match(/\b(environment|climate|sustainability|green|pollution|energy|carbon|ecology|nature|conservation)\b/)) {
    return 'environment';
  }
  
  // Case Study / Problem-Solving
  if (text.match(/\b(case|crisis|problem|solve|scenario|breach|backlash|decision|strategy|handling)\b/)) {
    return 'case-study';
  }
  
  // Abstract / Conceptual
  if (text.match(/\b(innovation|failure|success|creativity|change|future|philosophy|concept|idea|abstract)\b/)) {
    return 'abstract';
  }
  
  return null;
};

// Get topic category display info
export const TOPIC_CATEGORY_INFO: Record<keyof typeof TOPIC_COMBINATIONS, { label: string; description: string }> = {
  'technology': { label: 'Technology & AI', description: 'Tech, AI, digital transformation topics' },
  'business': { label: 'Business & Startup', description: 'Markets, finance, entrepreneurship topics' },
  'social': { label: 'Social & Ethical', description: 'Society, ethics, media topics' },
  'education': { label: 'Education & Youth', description: 'Learning, skills, youth topics' },
  'environment': { label: 'Environmental', description: 'Climate, sustainability topics' },
  'case-study': { label: 'Case Study', description: 'Crisis handling, problem-solving' },
  'abstract': { label: 'Abstract', description: 'Conceptual, philosophical topics' },
};
