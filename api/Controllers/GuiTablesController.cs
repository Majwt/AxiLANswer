using Api.Database;
using Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace Api.Controllers;

[ApiController]
[Route("api/gui/tables")]
[Authorize(Policy = "AdminOnly")]
public class GuiTablesController : ControllerBase
{
    [HttpGet]
    public async Task<IResult> GetTables([FromServices] GuiTableRepository repository)
    {
        return Results.Ok(await repository.GetTablesAsync());
    }

    [HttpGet("{schema}/{table}/columns")]
    public async Task<IResult> GetColumns(
        string schema,
        string table,
        [FromServices] GuiTableRepository repository)
    {
        var columns = await repository.GetColumnsAsync(schema, table);
        return columns is null ? Results.NotFound() : Results.Ok(columns);
    }

    [HttpPost("{schema}/{table}/query")]
    public async Task<IResult> Query(
        string schema,
        string table,
        [FromBody] GuiTableQueryRequest request,
        [FromServices] GuiTableRepository repository,
        CancellationToken cancellationToken)
    {
        try
        {
            if (request.Page < 1 || request.PageSize is < 1 or > 500 || request.Match is not ("all" or "any") ||
                request.Search?.Length > 500 || (request.Filters?.Count ?? 0) > 50)
            {
                return Results.BadRequest(new { error = "Invalid paging or filter options." });
            }
            var result = await repository.QueryAsync(schema, table, request, cancellationToken);
            return result is null ? Results.NotFound() : Results.Ok(result);
        }
        catch (GuiTableQueryException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{schema}/{table}/metadata")]
    public async Task<IResult> Metadata(string schema, string table, [FromServices] GuiTableRepository repository, CancellationToken cancellationToken)
    {
        if (!(await repository.GetTablesAsync()).Any(entry => entry.Schema == schema && entry.Table == table)) return Results.NotFound();
        return Results.Ok(await repository.GetColumnInfoAsync(schema, table, cancellationToken));
    }

    [HttpPost("{schema}/{table}/write")]
    public async Task<IResult> Write(string schema, string table, [FromBody] GuiTableWriteRequest request,
        [FromServices] GuiTableRepository repository, CancellationToken cancellationToken)
    {
        if (!(await repository.GetTablesAsync()).Any(entry => entry.Schema == schema && entry.Table == table && entry.Kind == "server_config")) return Results.Forbid();
        if (request.Action is not ("insert" or "update" or "delete") || request.Values is null || request.Original is null) return Results.BadRequest();
        try
        {
            await repository.WriteAsync(schema, table, request, cancellationToken);
            return Results.Ok(new { saved = true });
        }
        catch (SqlException exception) when (exception.Number == 50001)
        {
            return Results.Conflict(new { error = "This row changed. Refresh and reopen the editor before retrying." });
        }
        catch (SqlException exception) when (exception.Number is 50000 or 245 or 8114 or 241 or 242 or 8115 or 515 or 2627 or 2601 or 547 or 2628 or 8152)
        {
            return Results.BadRequest(new { error = "The values could not be saved. Check required fields, types, lengths and uniqueness." });
        }
    }
}
