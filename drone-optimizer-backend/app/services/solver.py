import numpy as np
import math
from scipy.optimize import minimize

# --- OUTILS GÉOMÉTRIQUES ---
def to_cartesian(coord, ref):
    lat, lon = coord
    ref_lat, ref_lon = ref
    x = (lon - ref_lon) * 111320 * math.cos(math.radians(ref_lat))
    y = (lat - ref_lat) * 111000
    return np.array([x, y])

def to_latlon(cartesian, ref):
    x, y = cartesian
    ref_lat, ref_lon = ref
    lat = ref_lat + y / 111000
    lon = ref_lon + x / (111320 * math.cos(math.radians(ref_lat)))
    return (lat, lon)

def point_to_segment_distance(A, B, P):
    line_vec = B - A
    line_len_sq = np.dot(line_vec, line_vec)
    if line_len_sq == 0:
        return np.linalg.norm(P - A)
    t = np.dot(P - A, line_vec) / line_len_sq
    t = max(0.0, min(1.0, t))
    projection = A + t * line_vec
    return np.linalg.norm(P - projection)

def calculate_power(v, wind_speed, drone_mass):
    k1 = 0.5
    k2 = 100.0 * drone_mass
    v_rel = v - wind_speed
    if v <= 0.1: v = 0.1 
    return k1 * (v_rel ** 2) + (k2 / v)

# --- LE SOLVEUR AVEC WAYPOINTS DYNAMIQUES ---
def solve_optimal_speed(wind_speed: float, drone_mass: float, start_coord, end_coord, no_go_zones):
    
    A = to_cartesian(start_coord, ref=start_coord)
    B = to_cartesian(end_coord, ref=start_coord)

    # 1. Calcul du nombre de points intermédiaires (Waypoints) nécessaires
    # Pour s'assurer d'avoir assez de "souplesse", on prend 1 WP par défaut, +1 par obstacle
    n_wp = max(1, len(no_go_zones) + 1)

    # 2. Construction du vecteur de décision initial (Guess)
    x0_list = [15.0]  # x[0] = Vitesse initiale
    
    line_vec = B - A
    # Vecteur perpendiculaire pour "casser la symétrie"
    # (Aide le gradient de SciPy à trouver un côté de l'obstacle)
    perp = np.array([-line_vec[1], line_vec[0]])
    norm_perp = np.linalg.norm(perp)
    if norm_perp > 0:
        perp = (perp / norm_perp) * 100.0 # Décalage initial de 100m sur le côté

    # On répartit les waypoints initiaux sur la ligne de vol
    for i in range(n_wp):
        f = (i + 1) / (n_wp + 1)
        wp_init = A + f * line_vec + perp
        x0_list.extend([wp_init[0], wp_init[1]])

    x0 = np.array(x0_list)

    # 3. Helper pour extraire les points du vecteur x
    def get_points(x):
        v = x[0]
        # On recrée la liste : [A, WP1, WP2, ..., B]
        wps =[np.array([x[1 + 2*i], x[2 + 2*i]]) for i in range(n_wp)]
        return v, [A] + wps + [B]

    # 4. Fonction Objectif (Minimiser l'Énergie)
    def objective(x):
        v, pts = get_points(x)
        # Distance totale = somme des segments
        dist = sum(np.linalg.norm(pts[i+1] - pts[i]) for i in range(len(pts)-1))
        power = calculate_power(v, wind_speed, drone_mass)
        return power * (dist / v)

    # 5. Bornes : La vitesse entre 5 et 30, et des coordonnées (x,y) libres pour chaque WP
    bounds =[(5.0, 30.0)] + [(None, None)] * (2 * n_wp)

    # 6. Génération des Contraintes No-Go
    constraints =[]
    
    # ASTUCE D'EXPERT PYTHON : On utilise une fonction génératrice pour figer les variables dans la boucle
    def make_constraint(P_fixed, R_fixed, seg_idx):
        return {
            'type': 'ineq',
            'fun': lambda x: point_to_segment_distance(
                get_points(x)[1][seg_idx], 
                get_points(x)[1][seg_idx+1], 
                P_fixed
            ) - R_fixed
        }

    for zone in no_go_zones:
        P = to_cartesian(zone.center, ref=start_coord)
        R = zone.radius + 15.0 # Marge de sécurité
        
        # Pour cet obstacle, AUCUN segment de la trajectoire ne doit le toucher
        for i in range(n_wp + 1):
            constraints.append(make_constraint(P, R, i))

    # 7. Exécution de l'Optimisation
    result = minimize(
        fun=objective, 
        x0=x0, 
        method='SLSQP', 
        bounds=bounds,
        constraints=constraints,
        options={'maxiter': 500, 'ftol': 1e-6}
    )
    
    # Calculs de Base (Baseline Naïve)
    naive_speed = 25.0
    naive_dist = np.linalg.norm(B - A)
    naive_energy = calculate_power(naive_speed, wind_speed, drone_mass) * (naive_dist / naive_speed)

    if not result.success:
        return {
            "success": False,
            "baseline": {"speed": round(naive_speed, 2), "energy": round(naive_energy, 2), "flight_time_seconds": round(naive_dist / naive_speed, 2)},
            "optimized": {"speed": 0, "energy": 0, "flight_time_seconds": 0},
            "path":[]
        }

    # 8. Extraction des résultats
    opt_v, opt_pts = get_points(result.x)
    opt_dist = sum(np.linalg.norm(opt_pts[i+1] - opt_pts[i]) for i in range(len(opt_pts)-1))
    opt_energy = result.fun

    # Reconversion de tous les points optimisés en GPS
    path_gps =[to_latlon(p, ref=start_coord) for p in opt_pts]

    return {
        "success": True,
        "path": path_gps,
        "baseline": {"speed": round(naive_speed, 2), "energy": round(naive_energy, 2), "flight_time_seconds": round(naive_dist / naive_speed, 2)},
        "optimized": {"speed": round(opt_v, 2), "energy": round(opt_energy, 2), "flight_time_seconds": round(opt_dist / opt_v, 2)}
    }