IF OBJECT_ID(N'dbo.AxiGuiTable', N'U') IS NULL
CREATE TABLE dbo.AxiGuiTable (
    SchemaName sysname NOT NULL,
    TableName sysname NOT NULL,
    KeyColumn sysname NOT NULL,
    Kind varchar(20) NOT NULL DEFAULT 'data',
    ServerColumn sysname NULL,
    CONSTRAINT PK_AxiGuiTable PRIMARY KEY (SchemaName, TableName),
    CONSTRAINT CK_AxiGuiTable_Kind CHECK (Kind IN ('data', 'server_config', 'server_errors'))
);
GO
IF DATABASE_PRINCIPAL_ID(N'AxiGuiExecutor') IS NULL
CREATE ROLE AxiGuiExecutor;
GO
IF DATABASE_PRINCIPAL_ID(N'db_AxiAnswer_GUI') IS NULL
CREATE ROLE db_AxiAnswer_GUI;
GO
CREATE TABLE #GuiSourceTables (SchemaName sysname, TableName sysname);

IF OBJECT_ID(N'dbo.sp_GuiTablesGet', N'P') IS NOT NULL
    INSERT #GuiSourceTables EXEC dbo.sp_GuiTablesGet;
ELSE
    INSERT #GuiSourceTables
    SELECT s.name, t.name
    FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE t.is_ms_shipped = 0 AND s.name <> N'Azure'
        AND t.name NOT IN (N'AutoCaseExclude', N'Database_EOL', N'DatabaseDocumentationExtendedProperties',
            N'DatabaseManagementScriptInfo', N'DatabaseManagementScriptInUse', N'DbmOptions', N'deltasConfig',
            N'ErrorLog', N'Files', N'ScheduledCategories', N'Schedules', N'SSMSVersions', N'SSRSVersions',
            N'sysdiagrams', N'LoginInfo', N'SecurityAuditBasic', N'SqlAccounts', N'SqlAccountsVersion2',
            N'SqlSpValidatelogins', N'Logins', N'TblPermissions')
        AND t.name NOT LIKE N'%_delta' AND t.name NOT LIKE N'%_DEV'
        AND t.name NOT LIKE N'%_OLD_DELETE%' AND t.name NOT LIKE N'%_Config%';

INSERT #GuiSourceTables
SELECT s.name, t.name
FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE (s.name = N'Svr' AND t.name = N'ServerList') OR (s.name = N'dbo' AND t.name = N'ErrorLog');

INSERT dbo.AxiGuiTable (SchemaName, TableName, KeyColumn, Kind, ServerColumn)
SELECT DISTINCT source.SchemaName, source.TableName, paging_key.ColumnName,
    CASE WHEN source.SchemaName = N'Svr' AND source.TableName = N'ServerList' THEN 'server_config'
        WHEN source.SchemaName = N'dbo' AND source.TableName = N'ErrorLog' THEN 'server_errors'
        ELSE 'data' END,
    server_column.ColumnName
FROM #GuiSourceTables source
JOIN sys.schemas s ON s.name = source.SchemaName
JOIN sys.tables t ON t.schema_id = s.schema_id AND t.name = source.TableName
CROSS APPLY (
    SELECT TOP (1) c.name AS ColumnName
    FROM sys.indexes i
    JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.object_id = t.object_id AND i.is_unique = 1 AND i.has_filter = 0 AND i.is_disabled = 0
        AND ic.key_ordinal = 1 AND c.is_nullable = 0
        AND c.name NOT IN (N'ApiKey', N'Password', N'Token', N'Secret')
        AND TYPE_NAME(c.system_type_id) NOT IN ('image', 'binary', 'varbinary', 'timestamp', 'rowversion',
            'geography', 'geometry', 'hierarchyid', 'sql_variant')
        AND NOT EXISTS (SELECT 1 FROM sys.index_columns other WHERE other.object_id = i.object_id
            AND other.index_id = i.index_id AND other.key_ordinal > 1)
    ORDER BY i.is_primary_key DESC, CASE WHEN c.name = N'ID' THEN 0 ELSE 1 END, i.index_id
) paging_key
OUTER APPLY (
    SELECT TOP (1) c.name AS ColumnName
    FROM sys.columns c
    WHERE c.object_id = t.object_id AND c.name IN (N'ServerName', N'MachineName', N'ComputerName')
    ORDER BY CASE c.name WHEN N'ServerName' THEN 0 WHEN N'MachineName' THEN 1 ELSE 2 END
) server_column
WHERE source.TableName NOT IN (N'AxiGuiTable', N'auth_session', N'auth_refresh_token')
    AND NOT EXISTS (SELECT 1 FROM dbo.AxiGuiTable registered
        WHERE registered.SchemaName = source.SchemaName AND registered.TableName = source.TableName);

SELECT DISTINCT source.SchemaName AS SkippedSchema, source.TableName AS SkippedTable,
    N'No visible, non-null, single-column unique key. Not registered for paging.' AS Reason
FROM #GuiSourceTables source
WHERE source.TableName NOT IN (N'AxiGuiTable', N'auth_session', N'auth_refresh_token')
    AND NOT EXISTS (SELECT 1 FROM dbo.AxiGuiTable registered
        WHERE registered.SchemaName = source.SchemaName AND registered.TableName = source.TableName);

DROP TABLE #GuiSourceTables;
GO
CREATE OR ALTER PROCEDURE dbo.sp_AxiGuiTables
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT SchemaName, TableName, Kind, ServerColumn, KeyColumn FROM dbo.AxiGuiTable
    ORDER BY SchemaName, TableName;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_AxiGuiColumns
    @SchemaName sysname, @TableName sysname
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.AxiGuiTable WHERE SchemaName = @SchemaName AND TableName = @TableName)
        THROW 50000, 'Table is not registered.', 1;
    SELECT ColumnName = c.name, DataType = TYPE_NAME(c.system_type_id),
        IsNullable = c.is_nullable, IsReadOnly = CONVERT(bit, CASE WHEN c.is_identity = 1 OR c.is_computed = 1
            OR TYPE_NAME(c.system_type_id) IN ('timestamp', 'rowversion') THEN 1 ELSE 0 END)
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(QUOTENAME(@SchemaName) + '.' + QUOTENAME(@TableName))
        AND c.name NOT IN ('ApiKey', 'Password', 'Token', 'Secret')
        AND TYPE_NAME(c.system_type_id) NOT IN ('image', 'binary', 'varbinary', 'timestamp', 'rowversion', 'geography', 'geometry', 'hierarchyid', 'sql_variant')
    ORDER BY c.column_id;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_AxiGuiQuery
    @SchemaName sysname, @TableName sysname,
    @Page int = 1, @PageSize int = 100, @Filters nvarchar(max) = N'[]',
    @Match varchar(3) = 'all', @Search nvarchar(500) = N'',
    @SortColumn sysname = N'', @Descending bit = 0
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    IF @Page < 1 OR @PageSize NOT BETWEEN 1 AND 500 OR @Match NOT IN ('all', 'any')
        OR ISJSON(@Filters) <> 1 OR LEFT(LTRIM(@Filters), 1) <> '['
        THROW 50000, 'Invalid query options.', 1;
    DECLARE @Key sysname, @Object nvarchar(520) = QUOTENAME(@SchemaName) + '.' + QUOTENAME(@TableName);
    SELECT @Key = KeyColumn FROM dbo.AxiGuiTable WHERE SchemaName = @SchemaName AND TableName = @TableName;
    IF @Key IS NULL THROW 50000, 'Table is not registered.', 1;
    IF NOT EXISTS (SELECT 1 FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
        JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE i.object_id = OBJECT_ID(@Object) AND i.is_unique = 1 AND i.has_filter = 0
        AND c.name = @Key AND ic.key_ordinal = 1 AND c.is_nullable = 0
        AND NOT EXISTS (SELECT 1 FROM sys.index_columns other WHERE other.object_id = i.object_id
            AND other.index_id = i.index_id AND other.key_ordinal > 1))
        THROW 50000, 'A non-null unique single-column key is required for stable paging.', 1;
    CREATE TABLE #Columns (ColumnName sysname, DataType sysname, IsNullable bit, IsReadOnly bit);
    INSERT #Columns EXEC dbo.sp_AxiGuiColumns @SchemaName, @TableName;
    IF NOT EXISTS (SELECT 1 FROM #Columns WHERE ColumnName = @Key)
        THROW 50000, 'The paging key must be visible.', 1;
    IF @SortColumn = N'' SET @SortColumn = @Key;
    IF NOT EXISTS (SELECT 1 FROM #Columns WHERE ColumnName = @SortColumn)
        THROW 50000, 'Invalid sort column.', 1;
    CREATE TABLE #Filters (Id int PRIMARY KEY, ColumnName sysname, Operator varchar(30), Value nvarchar(max), SecondValue nvarchar(max));
    INSERT #Filters SELECT CONVERT(int, [key]), JSON_VALUE(value, '$.column'), JSON_VALUE(value, '$.operator'),
        JSON_VALUE(value, '$.value'), JSON_VALUE(value, '$.second_value') FROM OPENJSON(@Filters);
    IF (SELECT COUNT(*) FROM #Filters) > 50 OR EXISTS (SELECT 1 FROM #Filters f LEFT JOIN #Columns c ON c.ColumnName = f.ColumnName
        WHERE c.ColumnName IS NULL OR f.Operator IS NULL OR f.Operator NOT IN ('eq','neq','gt','gte','lt','lte','contains','not_contains','starts_with','ends_with','is_null','not_null','between','in','not_in')
        OR (f.Operator NOT IN ('is_null','not_null') AND f.Value IS NULL)
        OR (f.Operator = 'between' AND f.SecondValue IS NULL)
        OR (f.Operator IN ('in','not_in') AND ISJSON(f.Value) <> 1))
        THROW 50000, 'Invalid filter.', 1;
    DECLARE @Where nvarchar(max) = N'', @Id int, @Column sysname, @Operator varchar(30), @Clause nvarchar(max),
        @Value nvarchar(max), @Ref nvarchar(max), @Second nvarchar(max), @Type nvarchar(100), @Quoted nvarchar(258), @Operand nvarchar(max);
    DECLARE filter_cursor CURSOR LOCAL FAST_FORWARD FOR SELECT f.Id, f.ColumnName, f.Operator, f.Value,
        CASE WHEN c.DataType IN ('decimal','numeric') THEN N'decimal(' + CONVERT(nvarchar(3), metadata.precision) + N',' + CONVERT(nvarchar(3), metadata.scale) + N')'
            ELSE c.DataType END
        FROM #Filters f JOIN #Columns c ON c.ColumnName = f.ColumnName
        JOIN sys.columns metadata ON metadata.object_id = OBJECT_ID(@Object) AND metadata.name = f.ColumnName ORDER BY f.Id;
    OPEN filter_cursor;
    FETCH NEXT FROM filter_cursor INTO @Id, @Column, @Operator, @Value, @Type;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @Ref = N'(SELECT Value FROM #Filters WHERE Id = ' + CONVERT(nvarchar(10), @Id) + N')';
        SET @Second = N'(SELECT SecondValue FROM #Filters WHERE Id = ' + CONVERT(nvarchar(10), @Id) + N')';
        SET @Quoted = QUOTENAME(@Column);
        SET @Type = CASE WHEN @Type IN ('nvarchar','nchar','varchar','char','text','ntext','xml') THEN N'nvarchar(max)'
            ELSE @Type END;
        SET @Operand = CASE WHEN EXISTS (SELECT 1 FROM #Columns WHERE ColumnName = @Column AND DataType IN ('text','ntext','xml'))
            THEN N'CONVERT(nvarchar(max), ' + @Quoted + N')' ELSE @Quoted END;
        IF @Operator IN ('is_null', 'not_null')
            SET @Clause = @Quoted + CASE WHEN @Operator = 'is_null' THEN N' IS NULL' ELSE N' IS NOT NULL' END;
        ELSE IF @Operator IN ('contains','not_contains','starts_with','ends_with')
        BEGIN
            UPDATE #Filters SET Value = REPLACE(REPLACE(REPLACE(REPLACE(Value, N'\', N'\\'), N'%', N'\%'), N'_', N'\_'), N'[', N'\[') WHERE Id = @Id;
            SET @Clause = N'CONVERT(nvarchar(max), ' + @Quoted + N') ' + CASE WHEN @Operator = 'not_contains' THEN N'NOT LIKE ' ELSE N'LIKE ' END
                + CASE WHEN @Operator IN ('contains','not_contains','ends_with') THEN N'N''%'' + ' ELSE N'' END + @Ref
                + CASE WHEN @Operator IN ('contains','not_contains','starts_with') THEN N' + N''%''' ELSE N'' END + N' ESCAPE N''\''';
            IF @Operator = 'not_contains' SET @Clause = N'(' + @Quoted + N' IS NULL OR ' + @Clause + N')';
        END
        ELSE IF @Operator IN ('in','not_in')
            SET @Clause = @Operand + N' ' + CASE WHEN @Operator = 'not_in' THEN N'NOT IN ' ELSE N'IN ' END
                + N'(SELECT CONVERT(' + @Type + N', value) FROM OPENJSON(' + @Ref + N'))';
        ELSE IF @Operator = 'between'
            SET @Clause = @Operand + N' BETWEEN CONVERT(' + @Type + N', ' + @Ref + N') AND CONVERT(' + @Type + N', ' + @Second + N')';
        ELSE
        BEGIN
            SET @Clause = @Operand + N' ' + CASE @Operator WHEN 'eq' THEN N'=' WHEN 'neq' THEN N'<>'
                WHEN 'gt' THEN N'>' WHEN 'gte' THEN N'>=' WHEN 'lt' THEN N'<' WHEN 'lte' THEN N'<=' END
                + N' CONVERT(' + @Type + N', ' + @Ref + N')';
            IF @Operator = 'neq' SET @Clause = N'(' + @Quoted + N' IS NULL OR ' + @Clause + N')';
        END;
        SET @Where = @Where + CASE WHEN @Where = N'' THEN N'' WHEN @Match = 'all' THEN N' AND ' ELSE N' OR ' END + N'(' + @Clause + N')';
        FETCH NEXT FROM filter_cursor INTO @Id, @Column, @Operator, @Value, @Type;
    END;
    CLOSE filter_cursor;
    DEALLOCATE filter_cursor;
    IF @Where <> N'' SET @Where = N'(' + @Where + N')';
    DECLARE @Projection nvarchar(max), @SearchWhere nvarchar(max), @Pattern nvarchar(2100);
    SELECT @Projection = STRING_AGG(CONVERT(nvarchar(max), QUOTENAME(ColumnName)), N', '),
        @SearchWhere = STRING_AGG(CONVERT(nvarchar(max), N'CONVERT(nvarchar(max), ' + QUOTENAME(ColumnName) + N') LIKE @Pattern ESCAPE N''\'''), N' OR ')
        FROM #Columns;
    SET @Pattern = N'%' + REPLACE(REPLACE(REPLACE(REPLACE(@Search, N'\', N'\\'), N'%', N'\%'), N'_', N'\_'), N'[', N'\[') + N'%';
    IF @Search <> N'' SET @Where = @Where + CASE WHEN @Where = N'' THEN N'' ELSE N' AND ' END + N'(' + @SearchWhere + N')';
    IF @Where <> N'' SET @Where = N' WHERE ' + @Where;
    DECLARE @Sql nvarchar(max) = N'SELECT COUNT_BIG(*) FROM ' + @Object + @Where + N'; SELECT ' + @Projection + N' FROM ' + @Object + @Where
        + N' ORDER BY ' + QUOTENAME(@SortColumn) + CASE WHEN @Descending = 1 THEN N' DESC' ELSE N' ASC' END
        + CASE WHEN @SortColumn <> @Key THEN N', ' + QUOTENAME(@Key) + N' ASC' ELSE N'' END
        + N' OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;',
        @Offset bigint = (CONVERT(bigint, @Page) - 1) * @PageSize;
    EXEC sys.sp_executesql @Sql, N'@Pattern nvarchar(2100), @Offset bigint, @PageSize int', @Pattern, @Offset, @PageSize;
END;
GO
GRANT EXECUTE ON dbo.sp_AxiGuiTables TO AxiGuiExecutor;
GRANT EXECUTE ON dbo.sp_AxiGuiColumns TO AxiGuiExecutor;
GRANT EXECUTE ON dbo.sp_AxiGuiQuery TO AxiGuiExecutor;
GO
CREATE OR ALTER PROCEDURE dbo.sp_AxiGuiWrite
    @SchemaName sysname, @TableName sysname, @Action varchar(10),
    @Key nvarchar(500) = NULL, @Values nvarchar(max) = N'{}', @Original nvarchar(max) = N'{}'
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @KeyColumn sysname, @Object nvarchar(520) = QUOTENAME(@SchemaName) + '.' + QUOTENAME(@TableName);
    SELECT @KeyColumn = KeyColumn FROM dbo.AxiGuiTable
        WHERE SchemaName = @SchemaName AND TableName = @TableName AND Kind = 'server_config';
    IF @KeyColumn IS NULL OR @Action NOT IN ('insert','update','delete') OR ISJSON(@Values) <> 1 OR ISJSON(@Original) <> 1
        THROW 50000, 'Invalid write request.', 1;
    CREATE TABLE #Columns (ColumnName sysname, DataType sysname, IsNullable bit, IsReadOnly bit);
    INSERT #Columns EXEC dbo.sp_AxiGuiColumns @SchemaName, @TableName;
    CREATE TABLE #Values (ColumnName sysname PRIMARY KEY, Value nvarchar(max));
    INSERT #Values SELECT [key], value FROM OPENJSON(@Values);
    CREATE TABLE #Original (ColumnName sysname PRIMARY KEY, Value nvarchar(max));
    INSERT #Original SELECT [key], value FROM OPENJSON(@Original);
    IF EXISTS (SELECT 1 FROM #Values v LEFT JOIN #Columns c ON c.ColumnName = v.ColumnName
        WHERE c.ColumnName IS NULL OR c.IsReadOnly = 1 OR (@Action = 'update' AND v.ColumnName = @KeyColumn))
        THROW 50000, 'Invalid or read-only column.', 1;
    IF @Action <> 'insert' AND (@Key IS NULL OR EXISTS (SELECT 1 FROM #Columns c LEFT JOIN #Original o ON o.ColumnName = c.ColumnName
        WHERE o.ColumnName IS NULL)) THROW 50000, 'Original row is required.', 1;
    DECLARE @Sql nvarchar(max), @Names nvarchar(max) = N'', @Assignments nvarchar(max) = N'', @Expressions nvarchar(max) = N'',
        @Where nvarchar(max) = N'', @Column sysname, @Type nvarchar(100), @Expr nvarchar(max), @KeyType nvarchar(100);
    DECLARE columns_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT c.name, CASE WHEN TYPE_NAME(c.system_type_id) IN ('nvarchar','nchar','varchar','char','text','ntext','xml') THEN N'nvarchar(max)'
            WHEN TYPE_NAME(c.system_type_id) IN ('decimal','numeric') THEN N'decimal(' + CONVERT(nvarchar(3), c.precision) + N',' + CONVERT(nvarchar(3), c.scale) + N')'
            ELSE TYPE_NAME(c.system_type_id) END
        FROM sys.columns c JOIN #Columns visible ON visible.ColumnName = c.name WHERE c.object_id = OBJECT_ID(@Object);
    OPEN columns_cursor;
    FETCH NEXT FROM columns_cursor INTO @Column, @Type;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF @Column = @KeyColumn SET @KeyType = @Type;
        SET @Expr = N'CONVERT(' + @Type + N', (SELECT Value FROM #Original WHERE ColumnName = N''' + REPLACE(@Column, '''', '''''') + N'''))';
        SET @Where = @Where + N' AND ((' + QUOTENAME(@Column) + N' IS NULL AND ' + @Expr + N' IS NULL) OR CONVERT(' + @Type + N', ' + QUOTENAME(@Column) + N') = ' + @Expr + N')';
        IF EXISTS (SELECT 1 FROM #Values WHERE ColumnName = @Column)
        BEGIN
            SET @Expr = N'CONVERT(' + @Type + N', (SELECT Value FROM #Values WHERE ColumnName = N''' + REPLACE(@Column, '''', '''''') + N'''))';
            SET @Names = @Names + CASE WHEN @Names = N'' THEN N'' ELSE N', ' END + QUOTENAME(@Column);
            SET @Expressions = @Expressions + CASE WHEN @Expressions = N'' THEN N'' ELSE N', ' END + @Expr;
            SET @Assignments = @Assignments + CASE WHEN @Assignments = N'' THEN N'' ELSE N', ' END + QUOTENAME(@Column) + N' = ' + @Expr;
        END;
        FETCH NEXT FROM columns_cursor INTO @Column, @Type;
    END;
    CLOSE columns_cursor;
    DEALLOCATE columns_cursor;
    IF @KeyType IS NULL THROW 50000, 'Invalid key column.', 1;
    IF @Action <> 'delete' AND @Names = N'' THROW 50000, 'No values supplied.', 1;
    SET @Where = N' WHERE ' + QUOTENAME(@KeyColumn) + N' = CONVERT(' + @KeyType + N', @Key)' + @Where;
    SET @Sql = CASE @Action
        WHEN 'insert' THEN N'INSERT ' + @Object + N' (' + @Names + N') SELECT ' + @Expressions + N';'
        WHEN 'update' THEN N'UPDATE ' + @Object + N' SET ' + @Assignments + @Where + N';'
        WHEN 'delete' THEN N'DELETE FROM ' + @Object + @Where + N';' END
        + N' IF @@ROWCOUNT <> 1 THROW 50001, ''The row changed or no longer exists. Refresh before retrying.'', 1;';
    BEGIN TRY
        BEGIN TRANSACTION;
        EXEC sys.sp_executesql @Sql, N'@Key nvarchar(500)', @Key;
        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH;
END;
GO
GRANT EXECUTE ON dbo.sp_AxiGuiWrite TO AxiGuiExecutor;
GO
GRANT EXECUTE ON dbo.sp_AxiGuiTables TO db_AxiAnswer_GUI;
GRANT EXECUTE ON dbo.sp_AxiGuiColumns TO db_AxiAnswer_GUI;
GRANT EXECUTE ON dbo.sp_AxiGuiQuery TO db_AxiAnswer_GUI;
GRANT EXECUTE ON dbo.sp_AxiGuiWrite TO db_AxiAnswer_GUI;
GO