using System.Text.Json.Serialization;

namespace Api.Models;

public sealed record GuiTableInfo(string Schema, string Table, string? Kind = null, string? ServerColumn = null, string? KeyColumn = null);

public sealed record GuiColumnInfo(string ColumnName, string DataType, bool IsNullable, bool IsReadOnly);

public sealed record GuiTableWriteRequest(string Action, string? Key, Dictionary<string, string?> Values, Dictionary<string, string?> Original);

public sealed record GuiTableFilter(
    [property: JsonPropertyName("column")] string Column,
    [property: JsonPropertyName("operator")] string Operator,
    [property: JsonPropertyName("value")] string? Value,
    [property: JsonPropertyName("second_value")] string? SecondValue = null);

public sealed record GuiTableSort(
    [property: JsonPropertyName("column")] string Column,
    [property: JsonPropertyName("descending")] bool Descending);

public sealed record GuiTableQueryRequest(
    [property: JsonPropertyName("top")] int? Top,
    [property: JsonPropertyName("filters")] List<GuiTableFilter>? Filters,
    [property: JsonPropertyName("sort")] GuiTableSort? Sort,
    [property: JsonPropertyName("page")] int Page = 1,
    [property: JsonPropertyName("page_size")] int PageSize = 100,
    [property: JsonPropertyName("search")] string? Search = null,
    [property: JsonPropertyName("match")] string Match = "all");

public sealed record GuiTableQueryResult(
    IReadOnlyList<string> Columns,
    IReadOnlyList<object?[]> Rows,
    long TotalCount = 0,
    int Page = 1,
    int PageSize = 100);

public sealed class GuiTableQueryException(string message) : Exception(message);
