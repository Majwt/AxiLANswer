import Graph from "graphology";
import type { GraphData } from "../types/graph";
import type { NodeDetails } from "../types/graph";
import type { GraphEdge } from "../types/graph";


function getPortTargets(fqdn: string, edges: GraphEdge[]) {
  const seen = new Set<string>();
  const portTargets: NodeDetails["portTargets"] = [];

  edges.forEach((edge) => {
    if (edge.source_fqdn === fqdn && edge.target_port) {
      const pid = edge.pid ?? -1;
      const processName = edge.process_name ?? null;
      const key = `${edge.source_port}->${edge.target_port}->${edge.target_fqdn}->${pid}->${processName ?? ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        portTargets.push({
          port: edge.source_port,
          remote_port: edge.target_port,
          fqdn: edge.target_fqdn,
          pid,
          processName,
        });
      }
    }

    if (edge.target_fqdn === fqdn && edge.target_port) {
      const pid = edge.pid ?? -1;
      const processName = edge.process_name ?? null;
      const key = `${edge.target_port}->${edge.source_port}->${edge.source_fqdn}->${pid}->${processName ?? ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        portTargets.push({
          port: edge.target_port,
          remote_port: edge.source_port,
          fqdn: edge.source_fqdn,
          pid,
          processName,
        });
      }
    }
  });

  return portTargets.sort((a, b) =>
    a.port - b.port
    || a.remote_port - b.remote_port
    || a.fqdn.localeCompare(b.fqdn)
    || a.pid - b.pid
    || (a.processName ?? "").localeCompare(b.processName ?? "")
  );
}

export function addNodes(graph: Graph, data: GraphData) {
  let index = 0;

  const allIds = new Set<string>();

  data.nodes.forEach((n) => allIds.add(n.fqdn));
  data.edges.forEach((e) => {
    allIds.add(e.source_fqdn);
    allIds.add(e.target_fqdn);
  });

  const total = allIds.size;
  const radius = 10;

  function addNodeIfMissing(ip: string, fqdn: string) {
    const id = fqdn; // Using FQDN as the unique identifier for nodes

    if (graph.hasNode(id)) return;

    const angle = (2 * Math.PI * index) / total;
    
    const nodeDetails: NodeDetails = {
      label: fqdn,
      ip,
      fqdn,
      subnet: "192.168.1.0/24",
      portTargets: getPortTargets(fqdn, data.edges),
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
