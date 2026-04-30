
import { useEffect, useRef } from "react";
import Sigma from "sigma";
import type { GraphData } from "../types/graph.ts";
import { createGraph } from "../graph/createGraph.ts";

type props = {
  data: GraphData;
};

export default function GraphView({ data }: props) {
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

    return () => renderer.kill();
  }, [data]);

  return <div ref={containerRef} className="graphview-canvas" />;
}
