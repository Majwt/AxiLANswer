using Api.Database;
using Api.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace Api.UnitTests.Integration;

public sealed class ApiWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly bool _networkEnabled;

    public ApiWebApplicationFactory()
        : this(networkEnabled: true)
    {
    }

    internal ApiWebApplicationFactory(bool networkEnabled)
    {
        _networkEnabled = networkEnabled;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Modules:Network:Enabled", _networkEnabled.ToString());

        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            var testConfig = new Dictionary<string, string?>
            {
                ["AllowedHosts"] = "*",
                ["Modules:Network:Enabled"] = _networkEnabled.ToString(),
                ["ConnectionStrings:Auth"] = "Server=127.0.0.1,1433;Database=axiauth_test;User Id=test;Password=test;TrustServerCertificate=True;",
                ["ConnectionStrings:GuiTables"] = "Server=127.0.0.1,1433;Database=axiatables_test;User Id=test;Password=test;TrustServerCertificate=True;",
                ["Jwt:SigningKey"] = "0123456789abcdef0123456789abcdef",
                ["Jwt:Issuer"] = "axilanswer-tests",
                ["Jwt:Audience"] = "axilanswer-client",
                ["Jwt:AccessTokenMinutes"] = "30",
                ["Jwt:RefreshTokenDays"] = "7",
                ["Auth:Users:0:Username"] = "test-admin",
                ["Auth:Users:0:Password"] = "test-password",
                ["Auth:Users:0:Role"] = "Admin",
            };

            if (_networkEnabled)
            {
                testConfig["ConnectionStrings:Default"] = "Server=127.0.0.1,1433;Database=axilanswer_test;User Id=test;Password=test;TrustServerCertificate=True;";
                testConfig["Database:EdgeTable"] = "dbo.connection_edge";
                testConfig["Database:EdgeStatsView"] = "dbo.v_connection_stats";
                testConfig["Database:NodeTable"] = "dbo.managed_node";
                testConfig["Database:InterfaceTable"] = "dbo.node_interface";
                testConfig["Database:PortsTable"] = "dbo.ports";
                testConfig["Database:SeenCountThreshold"] = "0";
            }
            else
            {
                testConfig["ConnectionStrings:Default"] = null;
                testConfig["Database:EdgeTable"] = null;
                testConfig["Database:EdgeStatsView"] = null;
                testConfig["Database:NodeTable"] = null;
                testConfig["Database:InterfaceTable"] = null;
                testConfig["Database:PortsTable"] = null;
                testConfig["Database:SeenCountThreshold"] = null;
            }

            configBuilder.AddInMemoryCollection(testConfig);
        });

        builder.ConfigureServices(services =>
        {
            services.PostConfigure<HttpsRedirectionOptions>(options =>
            {
                options.HttpsPort = 443;
            });

            services
                .AddAuthentication("Local")
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Local", _ => { });

            services.RemoveAll<IGraphReadRepository>();
            services.RemoveAll<IDashboardReadRepository>();
            services.RemoveAll<ICustomerReadRepository>();
            services.RemoveAll<IAuthSessionRepository>();

            services.AddSingleton<IGraphReadRepository, FakeGraphReadRepository>();
            services.AddSingleton<IDashboardReadRepository, FakeDashboardReadRepository>();
            services.AddSingleton<ICustomerReadRepository, FakeCustomerReadRepository>();
            services.AddSingleton<IAuthSessionRepository, FakeAuthSessionRepository>();
        });
    }

    private sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public TestAuthHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder)
            : base(options, logger, encoder)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var authHeader = Request.Headers.Authorization.ToString();
            if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                return Task.FromResult(AuthenticateResult.NoResult());
            }

            var token = authHeader["Bearer ".Length..].Trim();
            var claims = new List<Claim>
            {
                new("sid", Guid.NewGuid().ToString()),
                new("name", "integration-test-user"),
            };

            switch (token)
            {
                case "admin":
                    claims.Add(new Claim(ClaimTypes.Role, "Admin"));
                    break;
                case "customer-7":
                    claims.Add(new Claim(ClaimTypes.Role, "Customer"));
                    claims.Add(new Claim("customer_id", "7"));
                    break;
                case "customer-999":
                    claims.Add(new Claim(ClaimTypes.Role, "Customer"));
                    claims.Add(new Claim("customer_id", "999"));
                    break;
                case "customer-no-id":
                    claims.Add(new Claim(ClaimTypes.Role, "Customer"));
                    break;
                default:
                    return Task.FromResult(AuthenticateResult.Fail("Unknown test token."));
            }

            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);
            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }

    private sealed class FakeGraphReadRepository : IGraphReadRepository
    {
        private static readonly DateTime Now = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        public Task<IEnumerable<EdgeEntity>> getEdgesAsync(GraphCursor cursor, GraphQueryParams queryParams)
        {
            var edges = new[]
            {
                new EdgeEntity(
                    Id: 10,
                    EndpointA: "src-a",
                    EndpointB: "dst-a",
                    ServiceFqdn: "svc.local",
                    ServicePort: 443,
                    ServiceName: "https",
                    SourceIp: "10.0.0.1",
                    SourcePort: 50000,
                    SourceFqdn: "node-a.local",
                    SourcePid: 100,
                    SourceProcessName: "proc-a",
                    TargetIp: "10.0.0.2",
                    TargetPort: 443,
                    TargetFqdn: "node-b.local",
                    TargetPid: 200,
                    TargetProcessName: "proc-b",
                    SeenCount: 2,
                    LastSeen: Now,
                    FirstSeen: Now.AddMinutes(-5),
                    EdgeKey: "edge-10")
            };

            return Task.FromResult<IEnumerable<EdgeEntity>>(edges);
        }

        public Task<IEnumerable<EdgeEntity>> getCustomerEdgesAsync(GraphCursor cursor, int customerId, GraphQueryParams queryParams)
            => Task.FromResult<IEnumerable<EdgeEntity>>(Array.Empty<EdgeEntity>());

        public Task<IEnumerable<EdgeEntity>> getDistinctEdgesAsync(GraphCursor cursor, GraphQueryParams queryParams)
            => getEdgesAsync(cursor, queryParams);

        public Task<IEnumerable<EdgeEntity>> getCustomerDistinctEdgesAsync(GraphCursor cursor, int customerId, GraphQueryParams queryParams)
            => Task.FromResult<IEnumerable<EdgeEntity>>(Array.Empty<EdgeEntity>());

        public Task<IEnumerable<NodeSummaryEntity>> getNodeSummariesAsync(GraphCursor cursor, GraphQueryParams queryParams)
        {
            var nodes = new[]
            {
                new NodeSummaryEntity(
                    NodeId: 20,
                    Ciid: "ci-001",
                    Fqdn: "node-a.local",
                    Hostname: "node-a",
                    DistinctEdge: 1,
                    ConnectionCount: 2,
                    LastSeen: Now)
            };

            return Task.FromResult<IEnumerable<NodeSummaryEntity>>(nodes);
        }

        public Task<IEnumerable<NodeSummaryEntity>> getCustomerNodeSummariesAsync(GraphCursor cursor, int customerId, GraphQueryParams queryParams)
            => Task.FromResult<IEnumerable<NodeSummaryEntity>>(Array.Empty<NodeSummaryEntity>());

        public Task<NodeEntity?> getNodeByCiidAsync(string ciid)
            => Task.FromResult<NodeEntity?>(new NodeEntity(
                Id: 30,
                Fqdn: "node-a.local",
                Hostname: "node-a",
                Os: "Linux",
                Client: "MrBig",
                ClientVersion: "1.0",
                Interfaces: Array.Empty<NetInterface>(),
                DistinctEdge: 1,
                ConnectionCount: 2,
                Customer: new Customer("Axians", "cmdb-1", 7),
                FirstSeen: Now.AddDays(-1),
                LastSeen: Now));

        public Task<IEnumerable<string>> filterNodeCiidsAsync(
            string? customer,
            string? ip,
            string? mac,
            DateTime? firstSeenAfter,
            DateTime? firstSeenBefore,
            DateTime? lastSeenAfter,
            DateTime? lastSeenBefore,
            int? scopeCustomerId = null)
            => Task.FromResult<IEnumerable<string>>(new[] { "ci-001" });
    }

    private sealed class FakeDashboardReadRepository : IDashboardReadRepository
    {
        public Task<DashboardMetric> GetDistinctEdgesAsync(int lastDays, int customerId = -1)
            => Task.FromResult(new DashboardMetric("Distinct Connections", 100, "Unique source to destination paths", "Deduplicated edges"));

        public Task<DashboardMetric> GetActiveNodesAsync(int lastDays, int customerId = -1)
            => Task.FromResult(new DashboardMetric("Active Nodes", 25, "Recently active nodes", "Nodes seen in the selected period"));

        public Task<DashboardMetric> GetTotalEventsAsync(int lastDays, int customerId = -1)
            => Task.FromResult(new DashboardMetric("Total events", 1000, "Cumulative traffic reports", "Across all active edges"));

        public Task<DashboardMetric> GetNewConnectionsAsync(int lastDays, int customerId = -1)
            => Task.FromResult(new DashboardMetric("New Connections", 10, "Recently observed connections", "Connections first seen in the selected period"));

        public Task<DashboardStats> GetDashboardStatsAsync(int customerId = -1)
        {
            var stats = customerId == -1
                ? new DashboardStats(100, 25, 1000, 10)
                : new DashboardStats(customerId, 1, 5, 1);
            return Task.FromResult(stats);
        }

        public Task<IEnumerable<ConnectionHistoryPoint>> GetConnectionsHistoryAsync(int days, int customerId = -1)
            => Task.FromResult<IEnumerable<ConnectionHistoryPoint>>(new[]
            {
                new ConnectionHistoryPoint(new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), 10, 5)
            });

        public Task<IEnumerable<ConnectionRow>> GetTopConnectionsAsync(int limit, int customerId = -1)
            => Task.FromResult<IEnumerable<ConnectionRow>>(new[]
            {
                new ConnectionRow("edge-10", "a", "b", "https", 443, "tcp", 2, DateTime.UnixEpoch, DateTime.UnixEpoch)
            });

        public Task<IEnumerable<NodeRow>> GetDashboardNodesAsync(int limit, int customerId = -1)
            => Task.FromResult<IEnumerable<NodeRow>>(new[]
            {
                new NodeRow("ci-001", "node-a.local", "node-a", "Linux", "MrBig", "1.0", 1, 2, DateTime.UnixEpoch, DateTime.UnixEpoch, "group-a")
            });

        public Task<PagedResult<NodeRow>> GetDashboardNodesPageAsync(int page, int pageSize, string? query, int customerId = -1)
            => Task.FromResult(new PagedResult<NodeRow>(
                new[]
                {
                    new NodeRow("ci-001", "node-a.local", "node-a", "Linux", "MrBig", "1.0", 1, 2, DateTime.UnixEpoch, DateTime.UnixEpoch, "group-a")
                },
                TotalCount: 1,
                Page: page,
                PageSize: pageSize));
    }

    private sealed class FakeCustomerReadRepository : ICustomerReadRepository
    {
        private static readonly Customer[] Customers =
        {
            new("Axians", "cmdb-1", 7),
            new("Contoso", "cmdb-2", 8),
        };

        public Task<Customer[]> getAllCustomersAsync()
            => Task.FromResult(Customers);

        public Task<Customer?> GetCustomerByIdAsync(int customerId)
            => Task.FromResult(Customers.SingleOrDefault(customer => customer.Id == customerId));
    }

    private sealed class FakeAuthSessionRepository : IAuthSessionRepository
    {
        public Task<Guid> CreateSessionAsync(string subject, string role, int? customerId)
            => Task.FromResult(Guid.NewGuid());

        public Task CreateRefreshTokenAsync(Guid sessionId, Guid familyId, byte[] tokenHash, DateTime expiresAt)
            => Task.CompletedTask;

        public Task<(AuthSessionInfo Session, bool Compromised)?> RedeemRefreshTokenAsync(byte[] tokenHash)
            => Task.FromResult<(AuthSessionInfo Session, bool Compromised)?>(null);

        public Task RevokeSessionAsync(Guid sessionId, string reason)
            => Task.CompletedTask;
    }
}
