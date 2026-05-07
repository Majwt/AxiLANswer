export type GraphNode = {
  fqdn: string;
  ip: string;
};

export type GraphEdge = {
  id: string;
  source_ip: string;
  source_port: number;
  source_fqdn: string;
  target_ip: string;
  target_port: number;
  target_fqdn: string;
  pid?: number;
  process_name?: string;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type NodePortTarget = {
  port: number;
  remote_port: number;
  fqdn: string;
  ip: string;
  direction: "incoming" | "outgoing";
  pid: number;
  processName: string | null;
};


export type CombinedEdge = {
  id: string;
  source_fqdn: string;
  target_fqdn: string;
  connections: GraphEdge[];
  ports: number[];
  processes: string[];
};


export type NodeDetails = {
  label: string;
  ip: string;
  fqdn: string;
  color: string;
  subnet: string;
  portTargets: NodePortTarget[];
  size: number;
  x: number;
  y: number;
}
