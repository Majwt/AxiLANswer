
import "./GraphView.css";
import { useEffect, useRef, useState } from "react";
import Sigma from "sigma";
import type { GraphData, NodeDetails } from "../types/graph.ts";
import { createGraph } from "../graph/createGraph.ts";
import ForceSupervisor from "graphology-layout-force/worker";
import type Graph from "graphology";
import type { filter } from "../types/filter.ts";
// import forceAtlas2 from "graphology-layout-forceatlas2";
import type { SigmaNodeEventPayload, MouseCoords } from "sigma/types";
import { setupBackgroundGrid } from "../graph/setupBackgroundGrid.ts";
import { nodeReducer } from "../graph/nodeReducer.ts";
import { edgeReducer } from "../graph/edgeReducer.ts";

type props = {
  data: GraphData;
  filters: filter[];
  onSelectNode: (node: string, attrs: NodeDetails | null) => void;
  searchQuery: string;
};


/**
 * GraphView component renders an interactive graph visualization using Sigma.js.
 *
 * @param {GraphData} data - The graph data containing nodes and edges to visualize.
 * @param {(node: string, attrs: NodeDetails | null) => void} onSelectNode - Callback function triggered when a node is selected, providing the node ID and its attributes.
 * @param {filter[]} filters - An array of filter objects to apply to the graph visualization, allowing dynamic styling and visibility based on node and edge attributes.
 * @param {string} searchQuery - The current search query string used to filter nodes and edges in the graph visualization.
 * @returns {JSX.Element} The rendered GraphView component containing the graph visualization.
 *
 */
export default function GraphView({ data, filters, onSelectNode, searchQuery }: props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);


  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectedNodeIds, setConnectedNodeIds] = useState<Set<string>>(new Set());


  const textColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--text-h")
    .trim();
  const backgroundColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--bg")
    .trim();

  useEffect(() => {
    if (!containerRef.current) return;

    const [renderer, graph] = createGraph(
      containerRef.current,
      data,
      {
        text: textColor,
        background: backgroundColor
      });
    rendererRef.current = renderer;
    graphRef.current = graph;

    setupGraphEvents(renderer, graph, setSelectedNodeId, setConnectedNodeIds, onSelectNode);


    const backgroundCleanup = setupBackgroundGrid(renderer, containerRef.current, gridRef);
    // layout
    const layoutCleanup = forceSupervisorLayout(renderer, graph);

    return () => {
      backgroundCleanup();
      layoutCleanup();
      renderer.kill();
      rendererRef.current = null;
      graphRef.current = null;
    }

  }, [data, textColor, backgroundColor, onSelectNode]);

  useEffect(() => {
    if (!rendererRef.current || !graphRef.current) return;
    setupReducers(rendererRef.current, graphRef.current, selectedNodeId, connectedNodeIds, filters, searchQuery);
  }, [selectedNodeId, connectedNodeIds, filters, searchQuery]);

  return <div ref={containerRef} className="graphview-canvas" />;
}


function setupReducers(renderer: Sigma, graph: Graph, selectedNodeId: string | null, connectedNodeIds: Set<string>, filters: filter[], searchQuery: string) {
  const searchFilter: filter = {
    id: "__search__",
    type: "fqdn",
    operation: "include",
    value: searchQuery,
  };
  const effectiveFilters = searchQuery.trim()
    ? [...filters, searchFilter]
    : filters;
  renderer.setSetting("nodeReducer", (node, data) => nodeReducer(node, graph, connectedNodeIds, selectedNodeId, data, effectiveFilters));
  renderer.setSetting("edgeReducer", (edge, data) => edgeReducer(graph, edge, data, selectedNodeId || "", effectiveFilters));
  renderer.refresh();

}

function setupGraphEvents(renderer: Sigma, graph: Graph, setSelectedNodeId: (nodeId: string | null) => void, setConnectedNodeIds: (nodeIds: Set<string>) => void, onSelectNode: (node: string, attrs: NodeDetails | null) => void) {

  renderer.on("clickNode", ({ node }) => {
    const connectedNodeIds = new Set([node]);
    graph.forEachNeighbor(node, (neighbor) => connectedNodeIds.add(neighbor));
    setSelectedNodeId(node);
    setConnectedNodeIds(connectedNodeIds);
    renderer.refresh();
    const attrs = graph.getNodeAttributes(node) as NodeDetails;
    onSelectNode(node, attrs);

  });

  renderer.on("clickStage", () => {
    setSelectedNodeId(null);
    setConnectedNodeIds(new Set());
    renderer.refresh();
    onSelectNode("", null);
  });

}

// function forceAtlas2Layout(graph: Graph) {
//   forceAtlas2.assign(graph, {
//     iterations: 100,
//     settings: {
//       gravity: 2.5,
//       scalingRatio: 2,
//       strongGravityMode: false,
//     },
//   });
//
//   return () => { };
// }



function forceSupervisorLayout(renderer: Sigma, graph: Graph) {

  const layout = new ForceSupervisor(graph, {
    isNodeFixed: (_, attr) => attr.fixed, settings: {
      attraction: 0.0005,
      repulsion: 1,
    },
  });

  const cleanup_drag = enableNodeDragging(renderer, graph, layout);
  layout.start();
  return () => {
    cleanup_drag();
    layout.stop();
    layout.kill();
  }
}


function enableNodeDragging(
  renderer: Sigma,
  graph: Graph,
  supervisor?: ForceSupervisor
) {
  let draggedNode: string | null = null;
  let isDragging = false;

  const onDownNode = (e: SigmaNodeEventPayload) => {
    isDragging = true;
    draggedNode = e.node;

    graph.setNodeAttribute(draggedNode, "fixed", true);
    renderer.getCamera().disable();

    // supervisor?.stop(); // optional
  };

  const onMouseMove = (e: MouseCoords) => {
    if (!isDragging || !draggedNode) return;

    const pos = renderer.viewportToGraph(e);

    graph.setNodeAttribute(draggedNode, "x", pos.x);
    graph.setNodeAttribute(draggedNode, "y", pos.y);

    e.preventSigmaDefault();
    e.original.preventDefault();
    e.original.stopPropagation();
  };

  const onMouseUp = () => {
    if (draggedNode) {
      graph.removeNodeAttribute(draggedNode, "fixed");
    }

    isDragging = false;
    draggedNode = null;

    renderer.getCamera().enable();
    supervisor?.start(); // optional
  };

  renderer.on("downNode", onDownNode);
  renderer.getMouseCaptor().on("mousemovebody", onMouseMove);
  renderer.getMouseCaptor().on("mouseup", onMouseUp);

  // cleanup function
  return () => {
    renderer.removeListener("downNode", onDownNode);
    renderer.getMouseCaptor().removeListener("mousemovebody", onMouseMove);
    renderer.getMouseCaptor().removeListener("mouseup", onMouseUp);
  };
}
