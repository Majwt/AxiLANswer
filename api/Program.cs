using api;
using Microsoft.Data.SqlClient;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = System
        .Text
        .Json
        .JsonNamingPolicy
        .SnakeCaseLower;
});
builder.Configuration.AddEnvironmentVariables();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.Logger.LogInformation("Starting API v{0}", typeof(Program).Assembly.GetName().Version);

var configuredTableName =
    builder.Configuration["database:table_name"]
    ?? throw new InvalidOperationException(
        "Database table name is not configured! Change the 'database:table_name' setting in appsettings.json or set the environment variable 'DATABASE__TABLE_NAME'."
    );
var safeTableName = QuoteMultipartIdentifier(configuredTableName);

var getConnectionsSql = $"""
    SELECT endpoint_a, endpoint_b, service_port,
        host_name, pid, process_name, seen_count,
        source_fqdn, source_ip, source_port,
        source_pid, source_process_name,
        target_fqdn, target_ip, target_port,
        target_pid, target_process_name
    FROM {safeTableName}
    """;

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
            if (
                reader["source_fqdn"] is not string sourceFqdn
                || reader["source_ip"] is not string sourceIp
                || reader["target_fqdn"] is not string targetFqdn
                || reader["target_ip"] is not string targetIp
            )
            {
                continue;
            }

            var processName = reader["process_name"] as string;

            var pid = reader["pid"] == DBNull.Value ? -1 : Convert.ToInt32(reader["pid"]);

            var sourcePort =
                reader["source_port"] == DBNull.Value ? 0 : Convert.ToInt32(reader["source_port"]);

            var targetPort =
                reader["target_port"] == DBNull.Value ? 0 : Convert.ToInt32(reader["target_port"]);

            var seenCount =
                reader["seen_count"] == DBNull.Value ? 1 : Convert.ToInt64(reader["seen_count"]);

            var sourcePid =
                reader["source_pid"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["source_pid"]);

            var sourceProcessName = reader["source_process_name"] as string;

            var targetPid =
                reader["target_pid"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["target_pid"]);

            var targetProcessName = reader["target_process_name"] as string;

            var endpointA = reader["endpoint_a"] as string;
            var endpointB = reader["endpoint_b"] as string;
            var servicePort = reader["service_port"] == DBNull.Value
                ? "0"
                : Convert.ToInt32(reader["service_port"]).ToString();
            var stableEdgeId = endpointA is null || endpointB is null
                ? $"{sourceFqdn}:{sourcePort}->{targetFqdn}:{targetPort}"
                : $"{endpointA}|{endpointB}|{servicePort}";

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
                    Id: stableEdgeId,
                    SourceIp: sourceIp,
                    SourcePort: sourcePort,
                    SourceFqdn: sourceFqdn,
                    TargetIp: targetIp,
                    TargetPort: targetPort,
                    TargetFqdn: targetFqdn,
                    Pid: pid,
                    ProcessName: processName,
                    SeenCount: seenCount,
                    SourcePid: sourcePid,
                    SourceProcessName: sourceProcessName,
                    TargetPid: targetPid,
                    TargetProcessName: targetProcessName
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

static string QuoteMultipartIdentifier(string configuredIdentifier)
{
    var parts = configuredIdentifier.Split('.', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
    if (parts.Length is < 1 or > 3)
    {
        throw new InvalidOperationException(
            "Database table name is invalid. Use SQL identifiers in the format 'table', 'schema.table', or 'database.schema.table'."
        );
    }

    var quotedParts = new string[parts.Length];
    for (var i = 0; i < parts.Length; i++)
    {
        if (!IsSafeIdentifierPart(parts[i]))
        {
            throw new InvalidOperationException(
                $"Database table name contains an unsafe identifier part: '{parts[i]}'."
            );
        }

        quotedParts[i] = $"[{parts[i]}]";
    }

    return string.Join('.', quotedParts);
}

static bool IsSafeIdentifierPart(string value)
{
    if (value.Length is 0 or > 128)
    {
        return false;
    }

    if (!(char.IsLetter(value[0]) || value[0] == '_'))
    {
        return false;
    }

    for (var i = 1; i < value.Length; i++)
    {
        if (!(char.IsLetterOrDigit(value[i]) || value[i] == '_'))
        {
            return false;
        }
    }

    return true;
}
