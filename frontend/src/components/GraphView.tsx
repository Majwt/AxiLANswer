import { useEffect, useRef, useState } from "react";
import Sigma from "sigma";
import Graph from "graphology";
import type {
  EdgeDisplayData,
  NodeDisplayData,
} from "sigma/types";

import type { GraphData } from "../types/graph";

type Props = {
  data: GraphData;
};

type SearchState = {
  searchQuery: string;
  selectedNode?: string;
  suggestions?: Set<string>;
};

export default function GraphView({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);

  const [query, setQuery] = useState("");

  const stateRef = useRef<SearchState>({
    searchQuery: "",
  });

  const textColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--text-h")
      .trim();

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = createSigmaGraph(data);
    graphRef.current = graph;

    const renderer = new Sigma(graph, containerRef.current, {
      labelColor: { color: textColor },
    });

    rendererRef.current = renderer;

    //
    // NODE REDUCER
    //
    renderer.setSetting("nodeReducer", (node, data) => {
      const state = stateRef.current;

      const res: Partial<NodeDisplayData> = { ...data };

      if (state.selectedNode === node) {
        res.highlighted = true;
        res.forceLabel = true;
        return res;
      }

      if (state.suggestions) {
        //
        // Is this node a match?
        //
        if (state.suggestions.has(node)) {
          res.forceLabel = true;
          res.highlighted = true;
        } else {
          //
          // Keep neighbors visible
          //
          const connectedToMatch = [...state.suggestions].some((match) =>
              graph.areNeighbors(node, match),
          );

          if (!connectedToMatch) {
            res.label = "";
            res.color = "#e2e2e2";
          }
        }
      }

      return res;
    });

    //
    // EDGE REDUCER
    //
    renderer.setSetting("edgeReducer", (edge, data) => {
      const state = stateRef.current;

      const res: Partial<EdgeDisplayData> = { ...data };

      if (state.suggestions) {
        const source = graph.source(edge);
        const target = graph.target(edge);

        const connectsToMatch =
            state.suggestions.has(source) ||
            state.suggestions.has(target);

        if (!connectsToMatch) {
          res.hidden = true;
        }
      }

      return res;
    });

    return () => {
      renderer.kill();
    };
  }, [data, textColor]);

  //
  // SEARCH HANDLING
  //
  useEffect(() => {
    const graph = graphRef.current;
    const renderer = rendererRef.current;

    if (!graph || !renderer) return;

    const state = stateRef.current;

    state.searchQuery = query;

    if (query) {
      const lcQuery = query.toLowerCase();

      const matches = graph
          .nodes()
          .map((node) => ({
            id: node,
            label: graph.getNodeAttribute(node, "label") as string,
          }))
          .filter(({ label }) =>
              label.toLowerCase().includes(lcQuery),
          );

      //
      // Exact match
      //
      if (
          matches.length === 1 &&
          matches[0].label.toLowerCase() === lcQuery
      ) {
        state.selectedNode = matches[0].id;
        state.suggestions = undefined;

        //
        // Move camera to node
        //
        const nodePosition = renderer.getNodeDisplayData(
            state.selectedNode,
        );

        if (nodePosition) {
          renderer.getCamera().animate(nodePosition, {
            duration: 500,
          });
        }
      } else {
        state.selectedNode = undefined;
        state.suggestions = new Set(matches.map((m) => m.id));
      }
    } else {
      state.selectedNode = undefined;
      state.suggestions = undefined;
    }

    renderer.refresh({
      skipIndexation: true,
    });
  }, [query]);

  return (
      <div className="graph-wrapper">
        <input
            type="text"
            placeholder="Search node..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="graph-search"
        />

        <div
            ref={containerRef}
            className="graphview-canvas"
        />
      </div>
  );
}

function createSigmaGraph(data: GraphData): Graph {
  const graph = new Graph({ multi: true });

  data.nodes.forEach((node, index) => {
    graph.addNode(node.ip, {
      label: node.fqdn ?? node.ip,
      x: Math.cos(index),
      y: Math.sin(index),
      size: 12,
    });
  });

  data.edges.forEach((edge) => {
    if (
        !graph.hasNode(edge.source_ip) ||
        !graph.hasNode(edge.target_ip)
    ) {
      return;
    }

    graph.addEdgeWithKey(
        edge.id,
        edge.source_ip,
        edge.target_ip,
        {
          label: edge.target_port?.toString(),
        },
    );
  });

  return graph;
}