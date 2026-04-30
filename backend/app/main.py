from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.graph import router as graph_router

app = FastAPI(title="MrView API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(graph_router, prefix="/api")

@app.get("/")
def root():
    return {"status": "ok"}
