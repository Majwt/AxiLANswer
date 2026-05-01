import Graph from "graphology";
import type { GraphData } from "../types/graph";
import type { NodeDetails } from "../types/graph";

function getNodeId(ip: string, fqdn: string) {
  return fqdn;
}

export function addNodes(graph: Graph, data: GraphData) {
  let index = 0;

  const allIds = new Set<string>();

  data.nodes.forEach((n) => allIds.add(getNodeId(n.ip, n.fqdn)));
  data.edges.forEach((e) => {
    allIds.add(getNodeId(e.source_ip, e.source_fqdn));
    allIds.add(getNodeId(e.target_ip, e.target_fqdn));
  });

  const total = allIds.size;
  const radius = 10;

  function addNodeIfMissing(ip: string, fqdn: string) {
    const id = getNodeId(ip, fqdn);

    if (graph.hasNode(id)) return;

    const angle = (2 * Math.PI * index) / total;
    
    const nodeDetails: NodeDetails = {
      label: fqdn,
      ip,
      fqdn,
      subnet: "192.168.1.0/24",
      pids: [],
      ports: [],
      size: 12,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,

    }

    graph.addNode(id, nodeDetails);

    index++;
  }

  data.nodes.forEach((node) => {
    addNodeIfMissing(node.ip, node.fqdn);
  });

  data.edges.forEach((edge) => {
    addNodeIfMissing(edge.source_ip, edge.source_fqdn);
    addNodeIfMissing(edge.target_ip, edge.target_fqdn);
  });
}
