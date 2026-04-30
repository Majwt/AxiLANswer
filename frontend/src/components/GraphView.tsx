
import { useEffect, useRef, useState } from "react";
import Sigma from "sigma";
import Graph from "graphology";
import type { GraphData } from "../types/graph.ts";

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

    const graph = createSigmaGraph(data);



    const renderer = new Sigma(graph, containerRef.current, {
      labelColor: { color: textColor },
    });

    return () => renderer.kill();
  }, [data]);

  return <div ref={containerRef} className="graphview-canvas" />;
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
    // Only add edge if both nodes exist
    if (!graph.hasNode(edge.source_ip) || !graph.hasNode(edge.target_ip)) {
      return;
    }

    graph.addEdgeWithKey(edge.id, edge.source_ip, edge.target_ip, {
      label: edge.target_port?.toString(),
      source_port: edge.source_port,
      target_port: edge.target_port,
      process_name: edge.process_name,
      pid: edge.pid,
    });
  });

  return graph;
}
