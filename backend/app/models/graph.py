from pydantic import BaseModel
from typing import List, Optional

class Node(BaseModel):
    fqdn: str
    ip: Optional[str] = None

class Edge(BaseModel):
    id: str
    source_ip: str
    source_port: int
    source_fqdn: Optional[str] = None
    target_ip: str
    target_port: int
    target_fqdn: Optional[str] = None
    pid: Optional[int] = None
    process_name: Optional[str] = None

class GraphResponse(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
