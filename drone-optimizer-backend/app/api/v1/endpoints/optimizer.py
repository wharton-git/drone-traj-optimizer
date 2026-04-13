from fastapi import APIRouter, HTTPException
from app.models.optimization import OptimizationRequest, OptimizationResponse
from app.services.solver import solve_optimal_speed

router = APIRouter()

@router.post("/optimize", response_model=OptimizationResponse)
async def optimize_drone_path(request: OptimizationRequest):
    # 1. Appel de la logique PNL
    result = solve_optimal_speed(request.wind_speed)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail="L'optimisation a échoué.")
    
    # 2. Simulation d'un chemin (Path) entre départ et arrivée
    # En situation réelle, on calculerait des points intermédiaires optimisés
    path = [request.start_point, request.end_point]
    
    return {
        "optimal_speed": result["optimal_speed"],
        "min_energy": result["min_energy"],
        "path": path,
        "success": True
    }