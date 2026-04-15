from pydantic import BaseModel, Field
from typing import List, Tuple, Optional, Literal


class NoGoZone(BaseModel):
    center: Tuple[float, float]
    radius: float


class CriteriaWeights(BaseModel):
    energy: float = Field(default=0.30, ge=0.0)
    time: float = Field(default=0.25, ge=0.0)
    distance: float = Field(default=0.15, ge=0.0)
    risk: float = Field(default=0.30, ge=0.0)


class OptimizationRequest(BaseModel):
    wind_speed: float
    wind_direction_deg: float = 0.0
    drone_mass: float
    battery_capacity: float
    start_point: Tuple[float, float]
    end_point: Tuple[float, float]
    no_go_zones: Optional[List[NoGoZone]] = []
    weights: Optional[CriteriaWeights] = None


class ScenarioResult(BaseModel):
    speed: float
    energy: float
    flight_time_seconds: float


class AlternativeMetrics(BaseModel):
    energy: float
    flight_time_seconds: float
    distance_m: float
    risk: float
    min_clearance_m: float


class AlternativeResult(BaseModel):
    profile: str
    speed: float
    energy: float
    flight_time_seconds: float
    distance_m: float
    risk: float
    min_clearance_m: float
    buffer_clearance_m: float
    weighted_score: float
    feasible_battery: bool
    credible: bool
    rejection_reasons: List[str]
    path: List[Tuple[float, float]]


class Decision(BaseModel):
    status: Literal["GO", "WARNING", "NO_GO"]
    message: str


class OptimizationResponse(BaseModel):
    baseline: ScenarioResult
    optimized: ScenarioResult
    battery_capacity: float
    path: List[Tuple[float, float]]
    alternatives: List[AlternativeResult]
    recommended_profile: str
    decision: Decision
    success: bool