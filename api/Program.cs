using Microsoft.Data.SqlClient;

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

        var cmd = new SqlCommand(
            """
                SELECT host_name, direction, pid, process_name,
                       source_fqdn, source_ip, source_port,
                       target_fqdn, target_ip, target_port
                FROM inventory.connections
            """,
            conn
        );

        var results = new GraphResponse();
        var seenNodes = new HashSet<string>();

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            string? sourceFqdn = reader["source_fqdn"] as string;
            string? sourceIp = reader["source_ip"] as string;

            string? targetFqdn = reader["target_fqdn"] as string;
            string? targetIp = reader["target_ip"] as string;

            if (sourceFqdn is null || sourceIp is null || targetFqdn is null || targetIp is null)
            {
                continue;
            }


            string? processName = reader["process_name"] as string;

            int pid = reader["pid"] == DBNull.Value ? -1 : Convert.ToInt32(reader["pid"]);

            int sourcePort =
                reader["source_port"] == DBNull.Value ? 0 : Convert.ToInt32(reader["source_port"]);

            int targetPort =
                reader["target_port"] == DBNull.Value ? 0 : Convert.ToInt32(reader["target_port"]);

            string sourceNodeId = sourceFqdn;
            string targetNodeId = targetFqdn;

            if (seenNodes.Add(sourceNodeId))
            {
                results.Nodes.Add(new Node { Fqdn = sourceFqdn, Ip = sourceIp });
            }

            if (seenNodes.Add(targetNodeId))
            {
                results.Nodes.Add(new Node { Fqdn = targetFqdn, Ip = targetIp });
            }


            results.Edges.Add(
                new Edge
                {
                    Id = $"{sourceFqdn}:{sourcePort}->{targetFqdn}:{targetPort}",

                    SourceIp = sourceIp,
                    SourcePort = sourcePort,
                    SourceFqdn = sourceFqdn,

                    TargetIp = targetIp,
                    TargetPort = targetPort,
                    TargetFqdn = targetFqdn,

                    Pid = pid,
                    ProcessName = processName,
                }
            );
        }
        return Results.Ok(results);
    }
);


try
{
    app.Run();
}
catch (OperationCanceledException) { }
