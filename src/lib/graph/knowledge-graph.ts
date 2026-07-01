/**
 * Knowledge-graph construction utilities.
 *
 * The graph-builder edge function turns AI-extracted arguments/evidence into
 * `knowledge_nodes` + `knowledge_edges`. These pure helpers do the local math
 * (dedup, centrality, salience) so we can render, score, and unit-test the graph
 * without any DB round-trips.
 */

export type NodeType = 'concept' | 'argument' | 'evidence' | 'counter' | 'question';
export type Relation = 'supports' | 'contradicts' | 'elaborates' | 'questions' | 'cites';

export interface KGNode {
  id: string;
  label: string;
  node_type: NodeType;
  salience: number;
}

export interface KGEdge {
  from_node: string;
  to_node: string;
  relation: Relation;
  strength: number;
}

/** Merge two node lists by case-insensitive label, keeping the higher salience. */
export function mergeNodes(existing: KGNode[], incoming: KGNode[]): KGNode[] {
  const map = new Map<string, KGNode>();
  for (const n of [...existing, ...incoming]) {
    const key = n.label.trim().toLowerCase();
    const prev = map.get(key);
    if (!prev || n.salience > prev.salience) map.set(key, n);
  }
  return [...map.values()];
}

/**
 * Degree centrality per node. Nodes with the highest centrality are the
 * "load-bearing" ideas of the discussion.
 */
export function centrality(nodes: KGNode[], edges: KGEdge[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const n of nodes) out.set(n.id, 0);
  for (const e of edges) {
    out.set(e.from_node, (out.get(e.from_node) ?? 0) + e.strength);
    out.set(e.to_node, (out.get(e.to_node) ?? 0) + e.strength);
  }
  return out;
}

/** Top-K load-bearing nodes by centrality (ties broken by salience). */
export function topLoadBearing(
  nodes: KGNode[],
  edges: KGEdge[],
  k = 5,
): KGNode[] {
  const cen = centrality(nodes, edges);
  return [...nodes]
    .sort((a, b) => {
      const dc = (cen.get(b.id) ?? 0) - (cen.get(a.id) ?? 0);
      return dc !== 0 ? dc : b.salience - a.salience;
    })
    .slice(0, k);
}

/** Argumentation coverage: fraction of arguments that have at least one edge. */
export function argumentCoverage(nodes: KGNode[], edges: KGEdge[]): number {
  const args = nodes.filter((n) => n.node_type === 'argument');
  if (!args.length) return 0;
  const linked = new Set<string>();
  for (const e of edges) {
    linked.add(e.from_node);
    linked.add(e.to_node);
  }
  const covered = args.filter((a) => linked.has(a.id)).length;
  return Number((covered / args.length).toFixed(2));
}
