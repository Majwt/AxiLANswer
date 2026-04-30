from app.models.graph import Node, Edge, GraphResponse

def get_graph_data() -> GraphResponse:
    # Because run_datetime contains a space, parse manually
    with open("data.in", 'r', encoding='utf-8') as f:
        raw_data = f.read()
    lines = raw_data.strip().splitlines()
    rows = []
    
    for line in lines[1:]:
        parts = line.split()
    
        rows.append({
            "run_datetime": f"{parts[0]} {parts[1]}",
            "host_name": parts[2],
            "direction": parts[3],
            "source_fqdn": parts[4],
            "source_ip": parts[5],
            "source_port": int(parts[6]),
            "target_fqdn": parts[7],
            "target_ip": parts[8],
            "target_port": int(parts[9]),
        })
    
    
    nodes_by_ip: dict[str, Node] = {}
    edges: list[Edge] = []
    
    for i, row in enumerate(rows, start=1):
        nodes_by_ip[row["source_ip"]] = Node(
            fqdn=row["source_fqdn"],
            ip=row["source_ip"],
        )
    
        nodes_by_ip[row["target_ip"]] = Node(
            fqdn=row["target_fqdn"],
            ip=row["target_ip"],
        )
    
        edges.append(Edge(
            id=f"edge-{i}",
            source_ip=row["source_ip"],
            source_port=row["source_port"],
            source_fqdn=row["source_fqdn"],
            target_ip=row["target_ip"],
            target_port=row["target_port"],
            target_fqdn=row["target_fqdn"],
        ))
    
    
    nodes = list(nodes_by_ip.values())

    return GraphResponse(nodes=nodes, edges=edges)
