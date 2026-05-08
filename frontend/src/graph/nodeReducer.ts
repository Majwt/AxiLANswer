import type Graph from "graphology";
import type { filter } from "../types/filter";
import { edgeMatchesFilters } from "../filters/matchesFilter";
import brand from "../config/brand";

export function nodeReducer(node: string, graph: Graph, connectedNodeIds: Set<string>, selectedNodeId: string | null, selectedEdgeId: string | null, nodeData: Record<string, unknown>, filters: filter[]) {
  if (!nodeHasVisibleEdge(node, graph, filters)) {
    return { ...nodeData, hidden: true };
  }

  if (!selectedNodeId && !selectedEdgeId) return { ...nodeData };

  const nodeSize = typeof nodeData.size === "number" ? nodeData.size : 6;
  const isConnected = connectedNodeIds.has(node);

  if (!isConnected) {
    return {
      ...nodeData,
      color: brand.colors.reduceColor,
      highlighted: false,
      forceLabel: false,
      zIndex: 1,
      size: Math.max(nodeSize * 0.9, 6),
    };
  }

  if (selectedNodeId && node === selectedNodeId) {
    return {
      ...nodeData,
      color: brand.colors.accentColor,
      highlighted: true,
      forceLabel: true,
      zIndex: 10,
      size: nodeSize * 1.3,
    };
  }

  return {
    ...nodeData,
    highlighted: true,
    forceLabel: true,
    zIndex: 9,
  };

}

function nodeHasVisibleEdge(node: string, graph: Graph, filters: filter[]) {
  return graph.edges(node).some((edge) => edgeMatchesFilters(graph, edge, filters));
}
