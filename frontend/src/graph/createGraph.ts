import Graph from "graphology";
import type { GraphData } from "../types/graph";
import { groupEdges } from "./groupEdges";
import { addNodes } from "./addNodes";

export function createGraph(data: GraphData) {
  const graph = new Graph({
    multi: true,
    type: "directed",
  });

  addNodes(graph, data);

  const groupedEdges = groupEdges(data.edges);

  groupedEdges.forEach((edge) => {
    if (!graph.hasNode(edge.source_fqdn) || !graph.hasNode(edge.target_fqdn)) {
      console.log("edge skipped due to missing node:", edge);
      return;
    }

    graph.addEdgeWithKey(edge.id, edge.source_fqdn, edge.target_fqdn, {
      label: `${edge.connections.length}`,
      size: Math.min(1 + edge.connections.length, 8),
      connections: edge.connections,
      ports: edge.ports,
      processes: edge.processes,
      type: "arrow",
    });
  });


  return graph;
}
