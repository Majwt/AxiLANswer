import type Graph from "graphology";
import type { filter } from "../types/filter";
import { edgeMatchesFilters } from "../filters/matchesFilter";

export function edgeReducer(graph: Graph, edge: string, edgeData: Record<string, unknown>, selectedNodeId: string, filters: filter[]) {

  if (!edgeMatchesFilters(graph, edge, filters)) {
    return { ...edgeData, hidden: true };
  }

  if (!selectedNodeId) return { ...edgeData, hidden: false };

  const [source, target] = graph.extremities(edge);
  const isConnectedEdge = source === selectedNodeId || target === selectedNodeId;

  return {
    ...edgeData,
    hidden: !isConnectedEdge,
  };
}


