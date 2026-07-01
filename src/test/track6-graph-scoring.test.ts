import { describe, it, expect } from 'vitest';
import {
  mergeNodes,
  centrality,
  topLoadBearing,
  argumentCoverage,
  type KGNode,
  type KGEdge,
} from '@/lib/graph/knowledge-graph';
import { computeRadarScore } from '@/lib/scoring/radar-score';
import { generateTips } from '@/lib/scoring/coaching-generator';

const nodes: KGNode[] = [
  { id: 'a', label: 'AI displaces jobs', node_type: 'argument', salience: 0.8 },
  { id: 'b', label: 'AI creates jobs', node_type: 'counter', salience: 0.7 },
  { id: 'c', label: 'BLS 2024 report', node_type: 'evidence', salience: 0.6 },
  { id: 'd', label: 'Isolated argument', node_type: 'argument', salience: 0.4 },
];

const edges: KGEdge[] = [
  { from_node: 'c', to_node: 'a', relation: 'supports', strength: 0.9 },
  { from_node: 'b', to_node: 'a', relation: 'contradicts', strength: 0.8 },
  { from_node: 'c', to_node: 'b', relation: 'cites', strength: 0.5 },
];

describe('knowledge-graph', () => {
  it('mergeNodes keeps higher salience by label', () => {
    const merged = mergeNodes(
      [{ id: 'x', label: 'AI displaces jobs', node_type: 'argument', salience: 0.5 }],
      [{ id: 'y', label: 'ai displaces jobs', node_type: 'argument', salience: 0.9 }],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].salience).toBe(0.9);
  });

  it('centrality sums edge strengths per node', () => {
    const c = centrality(nodes, edges);
    expect(c.get('a')).toBeCloseTo(1.7, 5);
    expect(c.get('d')).toBe(0);
  });

  it('topLoadBearing puts most-connected node first', () => {
    const top = topLoadBearing(nodes, edges, 2);
    expect(top[0].id).toBe('a');
  });

  it('argumentCoverage measures linked argument nodes', () => {
    expect(argumentCoverage(nodes, edges)).toBe(0.5); // a linked, d not
  });
});

describe('radar-score', () => {
  it('produces neutral score for empty inputs', () => {
    const s = computeRadarScore({});
    expect(s.overall).toBeGreaterThan(30);
    expect(s.overall).toBeLessThan(70);
  });

  it('rewards balanced participation, high novelty, no fallacies', () => {
    const s = computeRadarScore({
      speaking_seconds: 120,
      fair_share_seconds: 120,
      avg_words_per_turn: 22,
      novelty_avg: 0.85,
      duplicate_flags: 0,
      fallacy_count: 0,
      fact_supported: 4,
      fact_disputed: 0,
      fact_unverifiable: 1,
      positive_ratio: 0.7,
      negative_ratio: 0.1,
      regulated_ratio: 0.85,
      turns_initiated: 4,
      invitations_offered: 3,
    });
    expect(s.reasoning).toBeGreaterThan(70);
    expect(s.collaboration).toBeGreaterThan(70);
    expect(s.overall).toBeGreaterThan(65);
  });

  it('penalizes dominance and fallacies', () => {
    const s = computeRadarScore({
      speaking_seconds: 300,
      fair_share_seconds: 60,
      avg_words_per_turn: 60,
      novelty_avg: 0.2,
      duplicate_flags: 5,
      fallacy_count: 6,
      interruptions_given: 8,
      fact_disputed: 3,
      fact_supported: 0,
      fact_unverifiable: 2,
      positive_ratio: 0.2,
      negative_ratio: 0.7,
      regulated_ratio: 0.2,
    });
    expect(s.collaboration).toBeLessThan(50);
    expect(s.reasoning).toBeLessThan(50);
    expect(s.emotional_intelligence).toBeLessThan(50);
  });
});

describe('coaching-generator', () => {
  it('emits one tip per weak axis, ranked by severity', () => {
    const tips = generateTips({
      clarity: 40, reasoning: 55, collaboration: 30,
      evidence: 90, emotional_intelligence: 80, leadership: 70,
      overall: 60,
    });
    expect(tips[0].priority).toBe(1);
    expect(tips[0].category).toBe('collaboration'); // lowest score
    expect(tips.some((t) => t.category === 'clarity')).toBe(true);
  });

  it('returns a reinforcement tip when everything is strong', () => {
    const tips = generateTips({
      clarity: 80, reasoning: 80, collaboration: 80,
      evidence: 80, emotional_intelligence: 80, leadership: 80,
      overall: 80,
    });
    expect(tips).toHaveLength(1);
    expect(tips[0].category).toBe('reinforce');
  });
});
