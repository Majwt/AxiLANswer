public class Node
{
    public required string Fqdn { get; set; }
    public required string Ip { get; set; }
}

public class Edge
{
    public required string Id { get; set; }

    public required string SourceIp { get; set; }
    public int SourcePort { get; set; }
    public required string SourceFqdn { get; set; }

    public required string TargetIp { get; set; }
    public int TargetPort { get; set; }
    public required string TargetFqdn { get; set; }

    public int Pid { get; set; }
    public string? ProcessName { get; set; }
}

public class GraphResponse
{
    public List<Node> Nodes { get; set; } = [];
    public List<Edge> Edges { get; set; } = [];
}
