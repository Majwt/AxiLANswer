
import { useEffect, useRef } from "react";
import Sigma from "sigma";
import type { GraphData, NodeDetails } from "../types/graph.ts";
import { createGraph } from "../graph/createGraph.ts";
import ForceSupervisor from "graphology-layout-force/worker";
import type Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";

type props = {
  data: GraphData;
  onSelectNode: (node: string, attrs: NodeDetails | null) => void;
};

export default function GraphView({ data, onSelectNode }: props) {
  const containerRef = useRef<HTMLDivElement>(null);


  const textColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--text-h")
    .trim();

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = createGraph(data);



    const renderer = new Sigma(graph, containerRef.current, {
      labelColor: { color: textColor },
    });

    renderer.on("clickNode", ({ node }) => {
      const attrs = graph.getNodeAttributes(node) as NodeDetails;
      onSelectNode(node, attrs);
    });

    renderer.on("clickStage", () => {
      onSelectNode("", null);
    });

    const useForceAtlas2 = false; // toggle between ForceAtlas2 and ForceSupervisor
    if (useForceAtlas2) {

      // Force Layout
      forceAtlas2.assign(graph, {
        iterations: 100,
        settings: {
          gravity: 2.5,
          scalingRatio: 2,
          strongGravityMode: false,
        },
      });

    }
    else {
      // -- Enable force layout with fixed nodes --
      const layout = new ForceSupervisor(graph, {
        isNodeFixed: (_, attr) => attr.highlighted, settings: {
          attraction: 0.0005,
          repulsion: 0.2,
        },
      });
      layout.start();
      // enable moving with mouse
      enableNodeDragging(renderer, graph, layout);
      // -- 

    }

    return () => {
      renderer.kill();
      // layout?.stop();
    }
  }, [data]);

  return <div ref={containerRef} className="graphview-canvas" />;
}

function enableNodeDragging(
  renderer: Sigma,
  graph: Graph,
  supervisor?: ForceSupervisor
) {
  let draggedNode: string | null = null;
  let isDragging = false;

  const onDownNode = (e: any) => {
    isDragging = true;
    draggedNode = e.node;

    graph.setNodeAttribute(draggedNode, "fixed", true);
    renderer.getCamera().disable();

    supervisor?.stop(); // optional
  };

  const onMouseMove = (e: any) => {
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
