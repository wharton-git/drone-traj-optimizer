import numpy as np
from scipy.optimize import minimize

def energy_cost(v, wind_speed):
    """
    Fonction de cout non Lineaire : 
    Consomation = k1 * v^2 + k2 / v
    k1 (trainee) et k2 (portance) sont des constantes arbitraires
    Le vent modifie la vitesse Relative : v_rel = v - wind_speed
    """

    k1 = 0.5
    k2 = 100.0
    v_rel = v - wind_speed

    return k1 * (v_rel ** 2) + (k2 / v)

def solve_optimal_speed(wind_speed: float):

    v0 = 10.0

    bounds = [(5.0, 50.0)]

    result = minimize(
        fun=energy_cost, 
        x0=v0, 
        args=(wind_speed,), 
        method='SLSQP', 
        bounds=bounds
    )
    
    return {
        "optimal_speed": round(result.x[0], 2),
        "min_energy": round(result.fun, 2),
        "success": result.success
    }