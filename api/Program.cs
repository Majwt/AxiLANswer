using api;
using Microsoft.Data.SqlClient;

const string getConnectionsSql = 
    """
    SELECT host_name, direction, pid, process_name,
        source_fqdn, source_ip, source_port,
        target_fqdn, target_ip, target_port
    FROM inventory.connections
    """;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower;
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.Logger.LogInformation("Starting API...");

app.MapGet("/", () => Results.Ok(new { status = "ok" }));

app.MapGet(
    "/api/graph",
    async () =>
    {
        var connectionString = builder.Configuration.GetConnectionString("Default");

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
    
        var cmd = new SqlCommand(getConnectionsSql, conn);

        var nodes = new List<Node>();
        var edges = new List<Edge>();
        var seenNodes = new HashSet<string>();

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            if (reader["source_fqdn"] is not string sourceFqdn || reader["source_ip"] is not string sourceIp || 
                reader["target_fqdn"] is not string targetFqdn || reader["target_ip"] is not string targetIp)
            {
                continue;
            }


            var processName = reader["process_name"] as string;

            var pid = reader["pid"] == DBNull.Value ? -1 : Convert.ToInt32(reader["pid"]);

            var sourcePort =
                reader["source_port"] == DBNull.Value ? 0 : Convert.ToInt32(reader["source_port"]);

            var targetPort =
                reader["target_port"] == DBNull.Value ? 0 : Convert.ToInt32(reader["target_port"]);
            
            if (seenNodes.Add(sourceFqdn))
            {
                nodes.Add(new Node(sourceFqdn, sourceIp));
            }
            
            if (seenNodes.Add(targetFqdn))
            {
                nodes.Add(new Node(targetFqdn, targetIp));
            }


            edges.Add(
                new Edge(
                    Id: $"{sourceFqdn}:{sourcePort}->{targetFqdn}:{targetPort}",
                    SourceIp: sourceIp,
                    SourcePort: sourcePort,
                    SourceFqdn: sourceFqdn,
                    TargetIp: targetIp,
                    TargetPort: targetPort,
                    TargetFqdn: targetFqdn,
                    Pid: pid,
                    ProcessName: processName
                )
            );
        }
        return Results.Ok(new GraphResponse(nodes, edges));
    }
);


try
{
    app.Run();
}
catch (OperationCanceledException) { }
