
from fastapi import APIRouter
from app.services.graph_service import get_graph_data
from app.models.graph import GraphResponse

router = APIRouter()

@router.get("/graph", response_model=GraphResponse)
def graph():
    return get_graph_data()
