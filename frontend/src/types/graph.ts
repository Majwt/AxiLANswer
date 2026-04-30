export type GraphNode = {
  fqdn?: string;
  ip: string;
};

export type GraphEdge = {
  id: string;
  source_ip: string;
  source_port?: number;
  source_fqdn?: string;
  target_ip: string;
  target_port?: number;
  target_fqdn?: string;
  pid?: number;
  process_name?: string;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};
