from pydantic import BaseModel
from typing import List, Tuple, Optional

class NoGoZone(BaseModel):
    center: Tuple[float, float]  # (Lat, Lng)
    radius: float                # Rayon en mètres

class OptimizationRequest(BaseModel):
    wind_speed: float
    drone_mass: float
    battery_capacity: float
    start_point: Tuple[float, float]
    end_point: Tuple[float, float]
    no_go_zones: Optional[List[NoGoZone]] =[]  # NOUVEAU : Liste optionnelle

class ScenarioResult(BaseModel):
    speed: float
    energy: float
    flight_time_seconds: float

class Decision(BaseModel):
    status: str
    message: str

class OptimizationResponse(BaseModel):
    baseline: ScenarioResult
    optimized: ScenarioResult
    battery_capacity: float
    path: List[Tuple[float, float]]  # Contiendra [Départ, Waypoint, Arrivée]
    decision: Decision
    success: bool