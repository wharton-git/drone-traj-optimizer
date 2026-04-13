from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import optimizer

app = FastAPI(title="Drone Optimizer API")

# Configuration CORS pour autoriser ton frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # À restreindre en production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(optimizer.router, prefix="/api/v1")