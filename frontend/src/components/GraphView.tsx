
import "./GraphView.css";
import { useEffect, useRef } from "react";
import Sigma from "sigma";
import type { GraphData, NodeDetails } from "../types/graph.ts";
import { createGraph } from "../graph/createGraph.ts";
import ForceSupervisor from "graphology-layout-force/worker";
import type Graph from "graphology";
// import forceAtlas2 from "graphology-layout-forceatlas2";
import type { SigmaNodeEventPayload, MouseCoords } from "sigma/types";
import { setupBackgroundGrid } from "../graph/setupBackgroundGrid.ts";

type props = {
  data: GraphData;
  onSelectNode: (node: string, attrs: NodeDetails | null) => void;
};


/**
 * GraphView component renders an interactive graph visualization using Sigma.js.
 *
 * @param {GraphData} data - The graph data containing nodes and edges to visualize.
 * @param {(node: string, attrs: NodeDetails | null) => void} onSelectNode - Callback function triggered when a node is selected, providing the node ID and its attributes.
 *
 */
export default function GraphView({ data, onSelectNode }: props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);


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
      onSelectNode,
      data,
      {
        text: textColor,
        background: backgroundColor
      });

    const backgroundCleanup = setupBackgroundGrid(renderer, containerRef.current, gridRef);
    // layout
    const layoutCleanup = forceSupervisorLayout(renderer, graph);

    return () => {
      backgroundCleanup();
      layoutCleanup();
      renderer.kill();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, textColor, backgroundColor]);

  return <div ref={containerRef} className="graphview-canvas" />;
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
