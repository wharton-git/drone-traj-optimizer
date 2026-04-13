from pydantic import BaseModel
from typing import List, Tuple

class OptimizationRequest(BaseModel):
    wind_speed: float
    drone_mass: float
    start_point: Tuple[float, float]
    end_point: Tuple[float, float]

class OptimizationResponse(BaseModel):
    optimal_speed: float
    min_energy: float
    path: List[Tuple[float, float]]
    success: bool