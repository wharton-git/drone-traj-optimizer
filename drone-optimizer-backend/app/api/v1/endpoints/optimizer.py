from fastapi import APIRouter, HTTPException
from app.models.optimization import OptimizationRequest, OptimizationResponse, Decision
from app.services.solver import solve_optimal_speed

router = APIRouter()

@router.post("/optimize", response_model=OptimizationResponse)
async def optimize_drone_path(request: OptimizationRequest):
    
    # Résolution PNL (avec les No-Go Zones)
    result = solve_optimal_speed(
        request.wind_speed, 
        request.drone_mass, 
        request.start_point, 
        request.end_point, 
        request.no_go_zones
    )
    
    if not result["success"]:
        # Si le solveur ne trouve pas de chemin (ex: zone trop vaste bloquant le passage)
        raise HTTPException(status_code=400, detail="Le solveur PNL n'a pas pu trouver de trajectoire évitant les obstacles.")
    
    baseline = result["baseline"]
    optimized = result["optimized"]
    batt = request.battery_capacity

    # MOTEUR DE RÈGLES
    if optimized["energy"] > batt:
        status = "NO_GO"
        msg = f"NO-GO : Même avec contournement et vitesse optimale ({optimized['speed']} m/s), la mission nécessite {optimized['energy']}J, dépassant la batterie ({batt}J)."
    elif baseline["energy"] > batt and optimized["energy"] <= batt:
        status = "WARNING"
        msg = f"ATTENTION : Un vol naïf écraserait le drone ({baseline['energy']}J). L'algorithme a généré un contournement sécurisé à {optimized['speed']} m/s consommant {optimized['energy']}J."
    else:
        status = "GO"
        msg = f"GO : Mission sécurisée. La trajectoire évite les obstacles à {optimized['speed']} m/s ({optimized['energy']}J)."

    decision = Decision(status=status, message=msg)

    return OptimizationResponse(
        baseline=baseline,
        optimized=optimized,
        battery_capacity=batt,
        path=result["path"], # NOUVEAU : [Départ, Waypoint de contournement, Arrivée]
        decision=decision,
        success=True
    )