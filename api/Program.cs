using Api.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddApiJson()
    .AddApiCore(builder.Configuration)
    .AddNetworkModule(builder.Configuration)
    .AddApiAuthentication(builder.Configuration);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

var app = builder.Build();

app.UseResponseCompression();
if (!app.Environment.IsEnvironment("Testing"))
{
    app.UseHttpsRedirection();
}
app.UseAuthentication();
app.UseAuthorization();
app.Logger.LogInformation("Starting API v{0}", typeof(Program).Assembly.GetName().Version);

app.MapHealthChecks("/api/healthz");
app.MapHealthChecks("/");

app.MapControllers();

try
{
    app.Run();
}
catch (OperationCanceledException) { }

public partial class Program { }
