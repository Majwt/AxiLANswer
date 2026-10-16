using System.Data;
using System.Globalization;
using System.Text.Json;
using Api.Models;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Caching.Memory;

namespace Api.Database;

public class GuiTableRepository
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    private readonly string _connectionString;
    private readonly IMemoryCache _cache;

    public GuiTableRepository(IConfiguration configuration, IMemoryCache cache)
    {
        _connectionString = configuration.GetConnectionString("GuiTables") ?? configuration.GetConnectionString(Config.CONNECTION_STRING_NAME)
            ?? throw new InvalidOperationException("Missing connection string.");
        _cache = cache;
    }

    public async Task<IReadOnlyList<GuiTableInfo>> GetTablesAsync()
    {
        var tables = await _cache.GetOrCreateAsync("gui:tables", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheTtl;
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();
            await using var command = new SqlCommand("dbo.sp_AxiGuiTables", connection) { CommandType = CommandType.StoredProcedure };
            await using var reader = await command.ExecuteReaderAsync();
            var schemaOrdinal = reader.GetOrdinal("SchemaName");
            var tableOrdinal = reader.GetOrdinal("TableName");
            var result = new List<GuiTableInfo>();
            while (await reader.ReadAsync())
            {
                result.Add(new GuiTableInfo(reader.GetString(schemaOrdinal), reader.GetString(tableOrdinal),
                    reader["Kind"] as string, reader["ServerColumn"] as string, reader["KeyColumn"] as string));
            }
            return (IReadOnlyList<GuiTableInfo>)result;
        });
        return tables ?? [];
    }

    public async Task<IReadOnlyList<string>?> GetColumnsAsync(string schema, string table)
    {
        var tables = await GetTablesAsync();
        if (!tables.Any(t => t.Schema == schema && t.Table == table))
        {
            return null;
        }

        return await _cache.GetOrCreateAsync($"gui:columns:{schema}.{table}", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheTtl;
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();
            await using var command = new SqlCommand("dbo.sp_AxiGuiColumns", connection)
            {
                CommandType = CommandType.StoredProcedure,
            };
            command.Parameters.AddWithValue("@SchemaName", schema);
            command.Parameters.AddWithValue("@TableName", table);
            await using var reader = await command.ExecuteReaderAsync();
            var ordinal = reader.GetOrdinal("ColumnName");
            var result = new List<string>();
            while (await reader.ReadAsync())
            {
                result.Add(reader.GetString(ordinal));
            }
            return (IReadOnlyList<string>)result;
        });
    }

    public async Task<GuiTableQueryResult?> QueryAsync(string schema, string table, GuiTableQueryRequest request, CancellationToken cancellationToken = default)
    {
        var columns = await GetColumnsAsync(schema, table);
        if (columns is null)
        {
            return null;
        }

        if (request.Page < 1 || request.PageSize < 1 || request.PageSize > 500 ||
            request.Match is not ("all" or "any") || (request.Filters?.Count ?? 0) > 50 ||
            request.Search?.Length > 500)
        {
            throw new GuiTableQueryException("Invalid paging or filter options.");
        }
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand("dbo.sp_AxiGuiQuery", connection)
        {
            CommandType = CommandType.StoredProcedure,
            CommandTimeout = 30,
        };
        command.Parameters.AddWithValue("@SchemaName", schema);
        command.Parameters.AddWithValue("@TableName", table);
        command.Parameters.AddWithValue("@Page", request.Page);
        command.Parameters.AddWithValue("@PageSize", request.PageSize);
        command.Parameters.AddWithValue("@Filters", JsonSerializer.Serialize(request.Filters ?? []));
        command.Parameters.AddWithValue("@Match", request.Match);
        command.Parameters.AddWithValue("@Search", request.Search ?? "");
        command.Parameters.AddWithValue("@SortColumn", request.Sort?.Column ?? "");
        command.Parameters.AddWithValue("@Descending", request.Sort?.Descending ?? false);

        try
        {
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            await reader.ReadAsync(cancellationToken);
            var totalCount = reader.GetInt64(0);
            await reader.NextResultAsync(cancellationToken);
            var names = Enumerable.Range(0, reader.FieldCount).Select(reader.GetName).ToList();
            var rows = new List<object?[]>();
            while (await reader.ReadAsync(cancellationToken))
            {
                var row = new object?[reader.FieldCount];
                for (var i = 0; i < row.Length; i++)
                {
                    row[i] = reader.IsDBNull(i) ? null : Normalize(reader.GetValue(i));
                }
                rows.Add(row);
            }
            return new GuiTableQueryResult(names, rows, totalCount, request.Page, request.PageSize);
        }
        catch (SqlException ex) when (ex.Number is 245 or 8114 or 241 or 242 or 8115 or 102 or 50000)
        {
            // Value could not be converted to the column's type.
            throw new GuiTableQueryException("The filter value is not valid for the column.");
        }
    }

    public async Task<IReadOnlyList<GuiColumnInfo>> GetColumnInfoAsync(string schema, string table, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand("dbo.sp_AxiGuiColumns", connection) { CommandType = CommandType.StoredProcedure };
        command.Parameters.AddWithValue("@SchemaName", schema);
        command.Parameters.AddWithValue("@TableName", table);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var columns = new List<GuiColumnInfo>();
        while (await reader.ReadAsync(cancellationToken))
        {
            columns.Add(new GuiColumnInfo(reader.GetString(0), reader.GetString(1), reader.GetBoolean(2), reader.GetBoolean(3)));
        }
        return columns;
    }

    public async Task WriteAsync(string schema, string table, GuiTableWriteRequest request, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand("dbo.sp_AxiGuiWrite", connection) { CommandType = CommandType.StoredProcedure };
        command.Parameters.AddWithValue("@SchemaName", schema);
        command.Parameters.AddWithValue("@TableName", table);
        command.Parameters.AddWithValue("@Action", request.Action);
        command.Parameters.AddWithValue("@Key", (object?)request.Key ?? DBNull.Value);
        command.Parameters.AddWithValue("@Values", JsonSerializer.Serialize(request.Values));
        command.Parameters.AddWithValue("@Original", JsonSerializer.Serialize(request.Original));
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static object Normalize(object value) => value switch
    {
        long number => number.ToString(CultureInfo.InvariantCulture),
        decimal number => number.ToString(CultureInfo.InvariantCulture),
        DateTimeOffset dto => dto.UtcDateTime,
        TimeSpan ts => ts.ToString(),
        _ => value,
    };
}
