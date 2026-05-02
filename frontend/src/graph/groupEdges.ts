import type { CombinedEdge, GraphEdge } from "../types/graph";

export function groupEdges(edges: GraphEdge[]): CombinedEdge[] {
  const map = new Map<string, CombinedEdge>();

  for (const edge of edges) {
    const key = `${edge.source_fqdn}->${edge.target_fqdn}`;

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        source_fqdn: edge.source_fqdn,
        target_fqdn: edge.target_fqdn,
        connections: [],
        ports: [],
        processes: [],
      });
    }

    const group = map.get(key)!;
    group.connections.push(edge);

    if (!group.ports.includes(edge.target_port)) {
      group.ports.push(edge.target_port);
    }

    if (edge.process_name && !group.processes.includes(edge.process_name)) {
      group.processes.push(edge.process_name);
    }
  }

  return Array.from(map.values());
}
