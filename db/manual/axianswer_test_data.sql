SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'AxiNetStatTest'
    THROW 50000, 'Test fixtures may only be installed in AxiNetStatTest.', 1;

IF SCHEMA_ID(N'Svr') IS NULL
    EXEC(N'CREATE SCHEMA Svr AUTHORIZATION dbo;');

IF OBJECT_ID(N'Svr.ServerList', N'U') IS NULL
CREATE TABLE Svr.ServerList (
    ID int IDENTITY(1,1) NOT NULL CONSTRAINT PK_TestServerList PRIMARY KEY,
    CmdbCiId nvarchar(128) NULL,
    CmdbAssetNr nvarchar(128) NULL,
    ServerName nvarchar(128) NOT NULL,
    SqlInstanceName nvarchar(128) NULL,
    Customer nvarchar(100) NULL,
    CustomerID int NULL,
    RecipientAxians nvarchar(200) NULL,
    RecipientCustomer nvarchar(200) NULL,
    DataCollector nvarchar(255) NULL,
    WindowsDomain nvarchar(255) NULL,
    DataCollectorIPv4 nvarchar(15) NULL,
    Environment nvarchar(25) NULL,
    Inventory_Windows bit NOT NULL DEFAULT (0),
    Inventory_Windows_Performance bit NOT NULL DEFAULT (0),
    Inventory_Windows_Sensitive bit NOT NULL DEFAULT (0),
    Inventory_Sql bit NOT NULL DEFAULT (0),
    Inventory_Sql_Performance bit NOT NULL DEFAULT (0),
    Inventory_Sql_Sensitive bit NOT NULL DEFAULT (0),
    Inventory_Ssas bit NOT NULL DEFAULT (0),
    Inventory_Ssrs bit NOT NULL DEFAULT (0),
    Inventory_Exclutions nvarchar(255) NULL,
    Description nvarchar(max) NULL,
    BusinessOwner nvarchar(1000) NULL,
    Ping_Windows bit NOT NULL DEFAULT (0),
    Ping_SQL bit NOT NULL DEFAULT (0),
    MaintStart datetime NULL,
    MaintEnd datetime NULL,
    ApiKey nvarchar(128) NULL,
    DateAdded smalldatetime NOT NULL DEFAULT (GETUTCDATE())
);

IF OBJECT_ID(N'dbo.ErrorLog', N'U') IS NULL
CREATE TABLE dbo.ErrorLog (
    ID int IDENTITY(1,1) NOT NULL CONSTRAINT PK_TestErrorLog PRIMARY KEY,
    ServerName nvarchar(128) NOT NULL,
    SqlInstanceName nvarchar(128) NULL,
    LogDate datetime2(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    ProcessInfo nvarchar(50) NULL,
    Severity int NULL,
    ErrorNumber int NULL,
    [Text] nvarchar(max) NOT NULL,
    DateAdded datetime2(0) NOT NULL DEFAULT (SYSUTCDATETIME())
);
GO

IF DB_NAME() <> N'AxiNetStatTest'
    THROW 50000, 'Test fixtures may only be installed in AxiNetStatTest.', 1;

BEGIN TRANSACTION;

INSERT Svr.ServerList (CmdbCiId, CmdbAssetNr, ServerName, SqlInstanceName, Customer, CustomerID,
    DataCollector, WindowsDomain, DataCollectorIPv4, Environment, Inventory_Windows,
    Inventory_Windows_Performance, Inventory_Sql, Inventory_Sql_Performance,
    Description, BusinessOwner, Ping_Windows, Ping_SQL)
SELECT seed.CmdbCiId, seed.CmdbAssetNr, seed.ServerName, seed.SqlInstanceName, seed.Customer,
    seed.CustomerID, N'collector.example.test', N'EXAMPLE', seed.IPv4, seed.Environment,
    1, 1, seed.InventorySql, seed.InventorySql,
    N'Synthetic AxiAnswer GUI test fixture.', N'Test Operations', 1, seed.InventorySql
FROM (VALUES
    (N'test-ci-001', N'TEST-001', N'sql01.example.test', N'MSSQLSERVER', N'Example North', 7, N'192.0.2.11', N'Production', 1),
    (N'test-ci-002', N'TEST-002', N'sql02.example.test', N'REPORTING', N'Example North', 7, N'192.0.2.12', N'Test', 1),
    (N'test-ci-003', N'TEST-003', N'app01.example.test', NULL, N'Example South', 8, N'192.0.2.21', N'Development', 0),
    (N'test-ci-004', N'TEST-004', N'web01.example.test', NULL, N'Example South', 8, N'192.0.2.22', N'Production', 0)
) seed(CmdbCiId, CmdbAssetNr, ServerName, SqlInstanceName, Customer, CustomerID, IPv4, Environment, InventorySql)
WHERE NOT EXISTS (SELECT 1 FROM Svr.ServerList existing WHERE existing.CmdbCiId = seed.CmdbCiId);

INSERT dbo.ErrorLog (ServerName, SqlInstanceName, LogDate, ProcessInfo, Severity, ErrorNumber, [Text])
SELECT seed.ServerName, seed.SqlInstanceName, seed.LogDate, seed.ProcessInfo, seed.Severity, seed.ErrorNumber, seed.Message
FROM (VALUES
    (N'sql01.example.test', N'MSSQLSERVER', CONVERT(datetime2(0), '2026-10-16T08:00:00'), N'Logon', 14, 18456, N'Test fixture: login failed for synthetic user.'),
    (N'sql01.example.test', N'MSSQLSERVER', CONVERT(datetime2(0), '2026-10-16T08:05:00'), N'spid51', 13, 1205, N'Test fixture: transaction was chosen as the deadlock victim.'),
    (N'sql02.example.test', N'REPORTING', CONVERT(datetime2(0), '2026-10-16T09:00:00'), N'Backup', 10, 0, N'Test fixture: database backup completed successfully.'),
    (N'app01.example.test', NULL, CONVERT(datetime2(0), '2026-10-16T09:15:00'), N'Collector', 16, 53, N'Test fixture: collector could not reach the server.')
) seed(ServerName, SqlInstanceName, LogDate, ProcessInfo, Severity, ErrorNumber, Message)
WHERE NOT EXISTS (SELECT 1 FROM dbo.ErrorLog existing
    WHERE existing.ServerName = seed.ServerName AND existing.LogDate = seed.LogDate AND existing.[Text] = seed.Message);

COMMIT;

SELECT N'Svr.ServerList' AS TableName, COUNT_BIG(*) AS [RowCount] FROM Svr.ServerList
UNION ALL
SELECT N'dbo.ErrorLog', COUNT_BIG(*) FROM dbo.ErrorLog;
GO