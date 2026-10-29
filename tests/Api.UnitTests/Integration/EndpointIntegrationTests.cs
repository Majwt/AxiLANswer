using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Api.UnitTests.Integration;

public sealed class EndpointIntegrationTests : IClassFixture<ApiWebApplicationFactory>
{
    [Theory]
    [InlineData("/api/gui/tables", false)]
    [InlineData("/api/gui/tables/dbo/servers/query", true)]
    [InlineData("/api/gui/tables/dbo/servers/write", true)]
    [InlineData("/api/gui/tables/dbo/servers/metadata", false)]
    public async Task GuiEndpoints_RequireAdmin(string path, bool post)
    {
        using var client = CreateHttpsClient();
        var anonymous = post ? await client.PostAsJsonAsync(path, new { }) : await client.GetAsync(path);
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "customer-7");
        var customer = post ? await client.PostAsJsonAsync(path, new { }) : await client.GetAsync(path);
        Assert.Equal(HttpStatusCode.Forbidden, customer.StatusCode);
    }

    [Theory]
    [InlineData(0, 100)]
    [InlineData(1, 0)]
    [InlineData(1, 501)]
    public async Task GuiQuery_InvalidPaging_ReturnsBadRequest(int page, int pageSize)
    {
        using var client = CreateHttpsClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "admin");
        var response = await client.PostAsJsonAsync("/api/gui/tables/dbo/servers/query", new { page, page_size = pageSize });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private readonly ApiWebApplicationFactory _factory;

    public EndpointIntegrationTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GraphEndpoint_WithAdminToken_ReturnsOk_NotUnsupportedMediaType()
    {
        using var client = CreateHttpsClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "admin");

        var response = await client.GetAsync("/api/graph?excludeIsolated=true");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"upsert_nodes\"", body);
        Assert.Contains("\"cursor\"", body);
    }

    [Fact]
    public async Task GraphEndpoint_WithoutToken_ReturnsUnauthorized()
    {
        using var client = CreateHttpsClient();

        var response = await client.GetAsync("/api/graph");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GraphEndpoint_CustomerWithoutCustomerId_ReturnsForbidden()
    {
        using var client = CreateHttpsClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "customer-no-id");

        var response = await client.GetAsync("/api/graph");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DashboardStats_WithAdminToken_ReturnsGlobalStats()
    {
        using var client = CreateHttpsClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "admin");

        var response = await client.GetAsync("/api/dashboard/stats");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"total_edges\":100", body);
    }

    [Fact]
    public async Task DashboardStats_WithCustomerToken_UsesScopedStats()
    {
        using var client = CreateHttpsClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "customer-7");

        var response = await client.GetAsync("/api/dashboard/stats");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"total_edges\":7", body);
    }

    [Fact]
    public async Task CustomerDashboardStats_WithAdminToken_ReturnsScopedStats()
    {
        using var client = CreateHttpsClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "admin");

        var response = await client.GetAsync("/api/customer/7/dashboard/stats");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"total_edges\":7", body);
    }

    [Fact]
    public async Task CustomerDashboardStats_WithCustomerToken_ReturnsForbidden()
    {
        using var client = CreateHttpsClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "customer-7");

        var response = await client.GetAsync("/api/customer/7/dashboard/stats");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CustomerDashboardStats_WithoutToken_ReturnsUnauthorized()
    {
        using var client = CreateHttpsClient();

        var response = await client.GetAsync("/api/customer/7/dashboard/stats");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CurrentCustomer_WithCustomerToken_ReturnsOwnCustomer()
    {
        using var client = CreateHttpsClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "customer-7");

        var response = await client.GetAsync("/api/customers/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"name\":\"Axians\"", body);
        Assert.Contains("\"id\":7", body);
        Assert.DoesNotContain("Contoso", body);
    }

    [Theory]
    [InlineData("admin")]
    [InlineData("customer-no-id")]
    public async Task CurrentCustomer_WithoutCustomerClaim_ReturnsForbidden(string token)
    {
        using var client = CreateHttpsClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync("/api/customers/me");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CurrentCustomer_WithUnknownCustomerClaim_ReturnsNotFound()
    {
        using var client = CreateHttpsClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "customer-999");

        var response = await client.GetAsync("/api/customers/me");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Customers_WithCustomerToken_ReturnsForbidden()
    {
        using var client = CreateHttpsClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "customer-7");

        var response = await client.GetAsync("/api/customers");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AuthRefresh_WithoutCookie_ReturnsUnauthorized()
    {
        using var client = CreateHttpsClient();

        var response = await client.PostAsync("/api/auth/refresh", content: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AuthLogin_UsesAxiAnswerRefreshCookie()
    {
        using var client = CreateHttpsClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            username = "test-admin",
            password = "test-password",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.TryGetValues("Set-Cookie", out var cookies));
        Assert.Contains(cookies!, cookie => cookie.StartsWith("axianswer_rt=", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task AuthRefresh_WithLegacyCookie_RejectsAndExpiresIt()
    {
        using var client = CreateHttpsClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        request.Headers.TryAddWithoutValidation("Cookie", "axilanswer_rt=legacy-token");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.True(response.Headers.TryGetValues("Set-Cookie", out var cookies));
        Assert.Contains(cookies!, cookie => cookie.StartsWith("axilanswer_rt=", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task AuthLogout_WithToken_ReturnsOk()
    {
        using var client = CreateHttpsClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "admin");

        var response = await client.PostAsync("/api/auth/logout", content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task NetworkDisabled_StartsWithoutNetworkConfiguration()
    {
        using var factory = new ApiWebApplicationFactory(networkEnabled: false);
        using var client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
        });
        var configuration = factory.Services.GetRequiredService<IConfiguration>();

        Assert.Null(configuration.GetConnectionString("Default"));
        Assert.Null(configuration["Database:EdgeTable"]);

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/healthz")).StatusCode);
        var authConfigResponse = await client.GetAsync("/api/auth/config");
        Assert.Equal(HttpStatusCode.OK, authConfigResponse.StatusCode);
        using var authConfig = JsonDocument.Parse(await authConfigResponse.Content.ReadAsStringAsync());
        Assert.False(authConfig.RootElement.GetProperty("network_enabled").GetBoolean());
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/graph")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/dashboard/stats")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/customers")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/gui/tables")).StatusCode);

        var login = await client.PostAsJsonAsync("/api/auth/login", new
        {
            username = "test-admin",
            password = "test-password",
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    private HttpClient CreateHttpsClient()
    {
        return _factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
        });
    }
}
