import {
  Target, Clock, CheckCircle2, XCircle, ShieldCheck,
  ListOrdered, MessageSquareReply, Users, RefreshCw,
  Lightbulb, HelpCircle, Handshake
} from "lucide-react";

export interface DrillType {
  id: string;
  name: string;
  description: string;
  timeLimit: number;
  icon: any;
  type?: "builtin" | "custom";
  prompt?: string;
  difficulty?: string;
}

export const BUILT_IN_DRILLS: DrillType[] = [
  {
    id: 'opening_statement',
    name: 'Opening Statement',
    description: 'Deliver a strong 30-60 second opening to establish your position',
    timeLimit: 60,
    icon: Target,
    type: 'builtin',
  },
  {
    id: 'star_response',
    name: 'STAR Response',
    description: 'Structure your answer using Situation-Task-Action-Result framework',
    timeLimit: 120,
    icon: CheckCircle2,
    type: 'builtin',
  },
  {
    id: 'rebuttal',
    name: 'Rebuttal & Counterpoint',
    description: 'Practice disagreeing professionally and building counterarguments',
    timeLimit: 45,
    icon: XCircle,
    type: 'builtin',
  },
  {
    id: 'time_boxed',
    name: 'Time-Boxed Speaking',
    description: 'Practice speaking concisely within strict time limits',
    timeLimit: 30,
    icon: Clock,
    type: 'builtin',
  },
  {
    id: 'opening_statement',
    name: 'Elevator Pitch',
    description: 'Sell yourself or an idea in 60 seconds or less',
    timeLimit: 60,
    icon: Target,
    type: 'builtin',
  },
  {
    id: 'star_response',
    name: 'Problem-Solution',
    description: 'Identify a problem and present a clear solution with evidence',
    timeLimit: 90,
    icon: CheckCircle2,
    type: 'builtin',
  },
  {
    id: 'rebuttal',
    name: "Devil's Advocate",
    description: 'Argue the opposite side of a position you might normally support',
    timeLimit: 60,
    icon: XCircle,
    type: 'builtin',
  },
  {
    id: 'time_boxed',
    name: 'Quick Summary',
    description: 'Summarize a complex topic in exactly 20 seconds',
    timeLimit: 20,
    icon: Clock,
    type: 'builtin',
  },
  // New drills
  {
    id: 'opening_statement',
    name: 'Evidence Support',
    description: 'Support your argument using examples, data, or real-world evidence.',
    timeLimit: 60,
    icon: ShieldCheck,
    type: 'builtin',
  },
  {
    id: 'star_response',
    name: 'Structured Opinion',
    description: 'Present a clear opinion with reasoning and one supporting example.',
    timeLimit: 60,
    icon: ListOrdered,
    type: 'builtin',
  },
  {
    id: 'rebuttal',
    name: 'Counter Argument Builder',
    description: 'Respond to an opposing viewpoint with a logical counterargument.',
    timeLimit: 90,
    icon: MessageSquareReply,
    type: 'builtin',
  },
  {
    id: 'time_boxed',
    name: 'Moderator Simulation',
    description: 'Practice guiding a discussion and encouraging participation.',
    timeLimit: 60,
    icon: Users,
    type: 'builtin',
  },
  {
    id: 'rebuttal',
    name: 'Perspective Shift',
    description: 'Argue from a viewpoint different from your own.',
    timeLimit: 45,
    icon: RefreshCw,
    type: 'builtin',
  },
  {
    id: 'opening_statement',
    name: 'Idea Expansion',
    description: 'Expand a simple idea into a structured argument.',
    timeLimit: 60,
    icon: Lightbulb,
    type: 'builtin',
  },
  {
    id: 'time_boxed',
    name: 'Clarification Drill',
    description: 'Practice asking thoughtful clarification questions.',
    timeLimit: 30,
    icon: HelpCircle,
    type: 'builtin',
  },
  {
    id: 'star_response',
    name: 'Consensus Builder',
    description: 'Summarize viewpoints and propose a balanced conclusion.',
    timeLimit: 90,
    icon: Handshake,
    type: 'builtin',
  },
];

export const SAMPLE_TOPICS = [
  "Remote work vs office work for productivity",
  "Impact of social media on mental health",
  "Should companies prioritize diversity hiring",
  "Is AI replacing human jobs a concern",
  "Benefits of work-life balance policies",
  "The future of electric vehicles in urban transportation",
  "Should coding be taught in elementary schools",
  "The role of influencers in modern marketing",
  "Privacy vs security in the digital age",
  "Benefits of a four-day work week",
  "The impact of streaming on traditional cinema",
  "Should universities require standardized testing",
];

const CUSTOM_DRILLS_KEY = 'gd-buddy-custom-drills';

export function getCustomDrills(): DrillType[] {
  try {
    const stored = localStorage.getItem(CUSTOM_DRILLS_KEY);
    if (!stored) return [];
    const drills = JSON.parse(stored) as DrillType[];
    return drills.map(d => ({ ...d, icon: Target, type: 'custom' as const }));
  } catch {
    return [];
  }
}

export function saveCustomDrill(drill: Omit<DrillType, 'icon' | 'type'>): DrillType {
  const customs = getCustomDrills();
  const newDrill: DrillType = { ...drill, icon: Target, type: 'custom' };
  customs.push(newDrill);
  const toStore = customs.map(({ icon, ...rest }) => rest);
  localStorage.setItem(CUSTOM_DRILLS_KEY, JSON.stringify(toStore));
  return newDrill;
}

export function deleteCustomDrill(drillId: string): void {
  const customs = getCustomDrills().filter(d => d.id !== drillId);
  const toStore = customs.map(({ icon, ...rest }) => rest);
  localStorage.setItem(CUSTOM_DRILLS_KEY, JSON.stringify(toStore));
}
