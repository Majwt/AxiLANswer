import {
  DEFAULT_EDGE_CURVATURE,
  indexParallelEdgesIndex,
} from "@sigma/edge-curve";
import { MultiGraph } from "graphology";

function getCurvature(index: number, maxIndex: number): number {
  if (maxIndex <= 0) throw new Error("Invalid maxIndex");
  if (index < 0) return -getCurvature(-index, maxIndex);

  const amplitude = 3.5;
  const maxCurvature =
    amplitude *
    (1 - Math.exp(-maxIndex / amplitude)) *
    DEFAULT_EDGE_CURVATURE;

  return (maxCurvature * index) / maxIndex;
}

/**
 *
 * setupCurvedEdges analyzes the graph to identify parallel edges (edges with the same source and target) and assigns curvature attributes to them. It uses the indexParallelEdgesIndex function from the @sigma/edge-curve package to compute the parallel edge indices and then calculates the curvature for each edge based on its position among parallel edges.
 *
 * @param graph - The graph to set up curved edges for.
 *
 */
export function setupCurvedEdges(graph: MultiGraph) {
  indexParallelEdgesIndex(graph, {
    edgeIndexAttribute: "parallelIndex",
    edgeMinIndexAttribute: "parallelMinIndex",
    edgeMaxIndexAttribute: "parallelMaxIndex",
  });

  graph.forEachEdge(
    (
      edge,
      {
        parallelIndex,
        parallelMinIndex,
        parallelMaxIndex,
      }:
        | {
            parallelIndex: number;
            parallelMinIndex?: number;
            parallelMaxIndex: number;
          }
        | {
            parallelIndex?: null;
            parallelMinIndex?: null;
            parallelMaxIndex?: null;
          },
    ) => {
      if (typeof parallelMinIndex === "number") {
        graph.mergeEdgeAttributes(edge, {
          type: parallelIndex ? "curved" : "straight",
          curvature: getCurvature(parallelIndex, parallelMaxIndex),
        });
      } else if (typeof parallelIndex === "number") {
        graph.mergeEdgeAttributes(edge, {
          type: "curved",
          curvature: getCurvature(parallelIndex, parallelMaxIndex),
        });
      } else {
        graph.setEdgeAttribute(edge, "type", "straight");
      }
    },
  );
}
