from fastapi import APIRouter, HTTPException
from app.models.optimization import (
    OptimizationRequest,
    OptimizationResponse,
    Decision,
)
from app.services.solver import solve_optimal_speed_admc, build_decision

router = APIRouter()


@router.post("/optimize", response_model=OptimizationResponse)
async def optimize_drone_path(request: OptimizationRequest):
    user_weights = (
        request.weights.model_dump()
        if request.weights is not None
        else {"energy": 0.30, "time": 0.25, "distance": 0.15, "risk": 0.30}
    )

    result = solve_optimal_speed_admc(
        wind_speed=request.wind_speed,
        drone_mass=request.drone_mass,
        battery_capacity=request.battery_capacity,
        start_coord=request.start_point,
        end_coord=request.end_point,
        no_go_zones=request.no_go_zones,
        user_weights=user_weights,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=400,
            detail="Le solveur PNL/ADMC n'a pas pu générer d'alternatives valides."
        )

    best_alt = next(
        (a for a in result["alternatives"] if a["profile"] == result["recommended_profile"]),
        result["alternatives"][0]
    )

    decision_data = build_decision(
        battery_capacity=request.battery_capacity,
        baseline=result["baseline"],
        best_alternative=best_alt,
    )
    decision = Decision(**decision_data)

    return OptimizationResponse(
        baseline=result["baseline"],
        optimized=result["optimized"],
        battery_capacity=request.battery_capacity,
        path=result["path"],
        alternatives=result["alternatives"],
        recommended_profile=result["recommended_profile"],
        decision=decision,
        success=True,
    )