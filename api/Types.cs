namespace api;

public sealed record Node(
    string Fqdn,
    string Ip
);

public sealed record Edge(
    string Id,
    
    string SourceIp,
    int SourcePort,
    string SourceFqdn,
    
    string TargetIp,
    int TargetPort,
    string TargetFqdn,
    
    int Pid,
    string? ProcessName
);

public sealed record GraphResponse(
    IReadOnlyList<Node> Nodes,
    IReadOnlyList<Edge> Edges
);