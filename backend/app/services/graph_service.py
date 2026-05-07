import pytds

from app.config import get_settings
from app.models.graph import Node, Edge, GraphResponse


def get_query() -> str:
    """
    Should switch to procedure or view in the future, but for now this is fine
    """

    return"""
    SELECT source_fqdn, source_ip, source_port, target_fqdn, target_ip, target_port, pid, process_name FROM inventory.connections
    """


def get_graph_data() -> GraphResponse:
    settings = get_settings()
    rows: list[dict] = []
    with pytds.connect(
        server=settings.mssql_host,
        port=settings.mssql_port,
        database=settings.mssql_database,
        user=settings.mssql_user,
        password=settings.mssql_password,
        as_dict=True,
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(get_query())
            rows = cursor.fetchall()

    nodes_by_ip: dict[str, Node] = {}
    edges: list[Edge] = []

    for i, row in enumerate(rows, start=1):
        source_ip = str(row["source_ip"])
        target_ip = str(row["target_ip"])
        source_fqdn = row.get("source_fqdn") or source_ip
        target_fqdn = row.get("target_fqdn") or target_ip
        pid = int(row.get("pid") or -1)
        process_name = str(row.get("process_name") or "")

        nodes_by_ip[source_ip] = Node(
            fqdn=source_fqdn,
            ip=source_ip,
        )

        nodes_by_ip[target_ip] = Node(
            fqdn=target_fqdn,
            ip=target_ip,
        )

        edges.append(
            Edge(
                id=f"edge-{i}",
                source_ip=source_ip,
                source_port=int(row["source_port"]),
                source_fqdn=source_fqdn,
                target_ip=target_ip,
                target_port=int(row["target_port"]),
                target_fqdn=target_fqdn,
                pid=pid,
                process_name=process_name,
            )
        )

    nodes = list(nodes_by_ip.values())

    return GraphResponse(nodes=nodes, edges=edges)
