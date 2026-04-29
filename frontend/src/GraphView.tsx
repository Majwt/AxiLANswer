
import { useEffect, useRef } from "react";
import Sigma from "sigma";
import Graph from "graphology";

export default function GraphView() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = new Graph();

    graph.addNode("server1", {
      x: 0,
      y: 0,
      size: 15,
      label: "Server 1",
    });

    graph.addNode("server2", {
      x: 1,
      y: 1,
      size: 15,
      label: "Server 2",
    });

    graph.addEdge("server1", "server2");

    const renderer = new Sigma(graph, containerRef.current);

    return () => renderer.kill();
  }, []);

  return <div ref={containerRef} className="graphview-canvas" />;
}
