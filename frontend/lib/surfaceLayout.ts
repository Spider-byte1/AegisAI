import type { SurfaceEdge, SurfaceNode } from "@/lib/types";

export interface PositionedNode extends SurfaceNode {
  x: number;
  y: number;
  r: number;
  /** 0 = target, 1 = discovered services/records, 2 = findings attached to a service */
  ring: 0 | 1 | 2;
  angle: number;
}

export interface PositionedEdge {
  id: string;
  source: PositionedNode;
  target: PositionedNode;
}

export interface SurfaceLayout {
  width: number;
  height: number;
  nodes: PositionedNode[];
  edges: PositionedEdge[];
}

/** Radial layout: the target in the centre, services on a ring around it, their CVEs on an outer ring. */
export function layoutSurface(nodes: SurfaceNode[], edges: SurfaceEdge[], width = 760, height = 500): SurfaceLayout {
  const root = nodes.find((n) => n.kind === "target") ?? nodes[0];
  if (!root) return { width, height, nodes: [], edges: [] };

  const cx = width / 2;
  const cy = height / 2;
  const ring1 = { rx: width * 0.26, ry: height * 0.27 };
  const ring2 = { rx: width * 0.42, ry: height * 0.43 };

  const childrenOf = new Map<string, string[]>();
  for (const e of edges) childrenOf.set(e.source, [...(childrenOf.get(e.source) ?? []), e.target]);

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const level1 = nodes.filter((n) => n.id !== root.id && (childrenOf.get(root.id) ?? []).includes(n.id));
  const placed = new Set<string>([root.id, ...level1.map((n) => n.id)]);
  const level2: { node: SurfaceNode; parent: string }[] = [];
  for (const parent of level1) {
    for (const id of childrenOf.get(parent.id) ?? []) {
      const node = byId.get(id);
      if (node && !placed.has(id)) {
        placed.add(id);
        level2.push({ node, parent: parent.id });
      }
    }
  }
  // Anything not connected to the graph still gets drawn, on the first ring.
  const orphans = nodes.filter((n) => !placed.has(n.id));
  const first = [...level1, ...orphans];

  const positioned = new Map<string, PositionedNode>();
  positioned.set(root.id, { ...root, x: cx, y: cy, r: 34, ring: 0, angle: 0 });

  const start = -Math.PI / 2;
  first.forEach((node, i) => {
    const angle = start + (i * 2 * Math.PI) / first.length;
    positioned.set(node.id, {
      ...node, ring: 1, r: 24, angle,
      x: cx + ring1.rx * Math.cos(angle),
      y: cy + ring1.ry * Math.sin(angle),
    });
  });

  const siblings = new Map<string, string[]>();
  for (const { node, parent } of level2) siblings.set(parent, [...(siblings.get(parent) ?? []), node.id]);
  for (const { node, parent } of level2) {
    const group = siblings.get(parent) ?? [];
    const parentAngle = positioned.get(parent)?.angle ?? 0;
    const spread = Math.min(0.32, ((2 * Math.PI) / Math.max(first.length, 1)) * 0.7 / Math.max(group.length, 1));
    const angle = parentAngle + (group.indexOf(node.id) - (group.length - 1) / 2) * spread;
    positioned.set(node.id, {
      ...node, ring: 2, r: 17, angle,
      x: cx + ring2.rx * Math.cos(angle),
      y: cy + ring2.ry * Math.sin(angle),
    });
  }

  const layoutEdges: PositionedEdge[] = [];
  for (const e of edges) {
    const source = positioned.get(e.source);
    const target = positioned.get(e.target);
    if (source && target) layoutEdges.push({ id: `${e.source}->${e.target}`, source, target });
  }
  return { width, height, nodes: [...positioned.values()], edges: layoutEdges };
}
