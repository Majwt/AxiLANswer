import type Graph from "graphology";
import type { filter } from "../types/filter";
import { edgeMatchesFilters } from "../filters/matchesFilter";

export function edgeReducer(graph: Graph, edge: string, edgeData: Record<string, unknown>, selectedNodeId: string, selectedEdgeId: string | null, hoveredEdgeId: string | null, filters: filter[]) {

  if (!edgeMatchesFilters(graph, edge, filters)) {
    return { ...edgeData, hidden: true };
  }

  let reducedEdge: Record<string, unknown>;
  if (!selectedNodeId) {
    reducedEdge = { ...edgeData, hidden: false };
  } else {
    const [source, target] = graph.extremities(edge);
    const isConnectedEdge = source === selectedNodeId || target === selectedNodeId;
    reducedEdge = {
      ...edgeData,
      hidden: !isConnectedEdge,
    };
  }

  if (selectedEdgeId && !selectedNodeId) {
    if (edge === selectedEdgeId) {
      reducedEdge = {
        ...reducedEdge,
        color: "#a20167",
        size: Math.max(Number(edgeData.size ?? 1), 1) + 2,
        zIndex: 998,
      };
    } else {
      reducedEdge = {
        ...reducedEdge,
        color: "#2a2f36",
        size: Math.max(Number(edgeData.size ?? 1) * 0.55, 0.8),
        zIndex: 1,
      };
    }
  }

  if (hoveredEdgeId && edge === hoveredEdgeId) {
    return {
      ...reducedEdge,
      color: "#a20167",
      size: Math.max(Number(edgeData.size ?? 1), 1) + 2,
      zIndex: 999,
    };
  }

  return reducedEdge;
}
