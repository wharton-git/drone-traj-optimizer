import math
import numpy as np
from scipy.optimize import minimize


PROFILE_WEIGHTS = {
    "eco": {"energy": 0.55, "time": 0.15, "distance": 0.10, "risk": 0.20},
    "fast": {"energy": 0.15, "time": 0.55, "distance": 0.10, "risk": 0.20},
    "safe": {"energy": 0.20, "time": 0.10, "distance": 0.10, "risk": 0.60},
    "balanced": {"energy": 0.30, "time": 0.25, "distance": 0.15, "risk": 0.30},
}

MIN_SPEED = 5.0
MAX_SPEED = 30.0

# marge opérationnelle minimale réaliste
MIN_OPERATIONAL_CLEARANCE_M = 30.0

# au-delà de ce facteur de détour, on considère la solution non crédible
MAX_DETOUR_FACTOR = 3.0

# largeur du corridor de recherche autour de la mission
SEARCH_MARGIN_M = 2000.0

def wind_vector_from_speed_direction(wind_speed, wind_direction_deg):
    """
    Convention :
    - 0° = vers l'Est
    - 90° = vers le Nord
    - angle mesuré dans le plan cartésien local (x Est, y Nord)
    """
    theta = math.radians(wind_direction_deg)
    wx = wind_speed * math.cos(theta)
    wy = wind_speed * math.sin(theta)
    return np.array([wx, wy], dtype=float)


def segment_unit_vector(A, B):
    vec = B - A
    norm = np.linalg.norm(vec)
    if norm <= 1e-9:
        return np.array([1.0, 0.0], dtype=float)
    return vec / norm


def to_cartesian(coord, ref):
    lat, lon = coord
    ref_lat, ref_lon = ref
    x = (lon - ref_lon) * 111320 * math.cos(math.radians(ref_lat))
    y = (lat - ref_lat) * 111000
    return np.array([x, y], dtype=float)


def to_latlon(cartesian, ref):
    x, y = cartesian
    ref_lat, ref_lon = ref
    lat = ref_lat + y / 111000
    lon = ref_lon + x / (111320 * math.cos(math.radians(ref_lat)))
    return (float(lat), float(lon))


def point_to_segment_distance(A, B, P):
    line_vec = B - A
    line_len_sq = np.dot(line_vec, line_vec)
    if line_len_sq == 0:
        return float(np.linalg.norm(P - A))
    t = np.dot(P - A, line_vec) / line_len_sq
    t = max(0.0, min(1.0, t))
    projection = A + t * line_vec
    return float(np.linalg.norm(P - projection))


def calculate_power_for_segment(v, A, B, wind_vector, drone_mass):
    v = max(v, 0.1)
    k1 = 0.5
    k2 = 100.0 * drone_mass

    direction = segment_unit_vector(A, B)
    drone_velocity_vector = v * direction
    relative_velocity_vector = drone_velocity_vector - wind_vector
    relative_speed = np.linalg.norm(relative_velocity_vector)

    return float(k1 * (relative_speed ** 2) + (k2 / v))


def normalize_weights(weights: dict) -> dict:
    total = sum(max(0.0, float(v)) for v in weights.values())
    if total <= 0:
        return {"energy": 0.30, "time": 0.25, "distance": 0.15, "risk": 0.30}
    return {k: max(0.0, float(v)) / total for k, v in weights.items()}


def build_initial_guess(A, B, n_wp, speed_guess=15.0):
    x0_list = [speed_guess]

    line_vec = B - A
    perp = np.array([-line_vec[1], line_vec[0]], dtype=float)
    norm_perp = np.linalg.norm(perp)

    if norm_perp > 0:
        perp = (perp / norm_perp) * 100.0
    else:
        perp = np.array([0.0, 100.0], dtype=float)

    for i in range(n_wp):
        f = (i + 1) / (n_wp + 1)
        wp_init = A + f * line_vec + perp
        x0_list.extend([float(wp_init[0]), float(wp_init[1])])

    return np.array(x0_list, dtype=float)


def compute_path_distance(pts):
    return float(sum(np.linalg.norm(pts[i + 1] - pts[i]) for i in range(len(pts) - 1)))


def compute_direct_distance(A, B):
    return float(np.linalg.norm(B - A))


def compute_clearance_stats(pts, no_go_zones, start_coord):
    if not no_go_zones:
        return {
            "risk": 0.0,
            "min_clearance_m": 999999.0,
            "buffer_clearance_m": 999999.0,
        }

    min_clearance_obstacle_edge = float("inf")
    min_clearance_operational_buffer = float("inf")

    for zone in no_go_zones:
        P = to_cartesian(zone.center, ref=start_coord)

        obstacle_radius = float(zone.radius)
        operational_radius = obstacle_radius + MIN_OPERATIONAL_CLEARANCE_M

        for i in range(len(pts) - 1):
            d = point_to_segment_distance(pts[i], pts[i + 1], P)

            clearance_obstacle_edge = d - obstacle_radius
            clearance_operational_buffer = d - operational_radius

            min_clearance_obstacle_edge = min(min_clearance_obstacle_edge, clearance_obstacle_edge)
            min_clearance_operational_buffer = min(min_clearance_operational_buffer, clearance_operational_buffer)

    if min_clearance_obstacle_edge == float("inf"):
        min_clearance_obstacle_edge = 999999.0

    if min_clearance_operational_buffer == float("inf"):
        min_clearance_operational_buffer = 999999.0

    if min_clearance_operational_buffer <= 0:
        risk = 1e6
    else:
        risk = 1.0 / min_clearance_operational_buffer

    return {
        "risk": float(risk),
        "min_clearance_m": float(min_clearance_obstacle_edge),
        "buffer_clearance_m": float(min_clearance_operational_buffer),
    }


def evaluate_metrics(v, pts, wind_vector, drone_mass, start_coord, no_go_zones):
    total_dist = compute_path_distance(pts)
    flight_time = total_dist / max(v, 0.1)
    energy = compute_energy_for_path(v, pts, wind_vector, drone_mass)

    clearance_stats = compute_clearance_stats(pts, no_go_zones, start_coord)

    return {
        "energy": float(energy),
        "flight_time_seconds": float(flight_time),
        "distance_m": float(total_dist),
        "risk": float(clearance_stats["risk"]),
        "min_clearance_m": float(clearance_stats["min_clearance_m"]),
        "buffer_clearance_m": float(clearance_stats["buffer_clearance_m"]),
    }


def get_points_from_x(x, A, B, n_wp):
    v = float(x[0])
    wps = [np.array([x[1 + 2 * i], x[2 + 2 * i]], dtype=float) for i in range(n_wp)]
    return v, [A] + wps + [B]


def build_constraints(no_go_zones, start_coord, n_segments, get_points_callable):
    constraints = []

    def make_constraint(P_fixed, R_fixed, seg_idx):
        return {
            "type": "ineq",
            "fun": lambda x: point_to_segment_distance(
                get_points_callable(x)[1][seg_idx],
                get_points_callable(x)[1][seg_idx + 1],
                P_fixed,
            ) - R_fixed,
        }

    for zone in no_go_zones:
        P = to_cartesian(zone.center, ref=start_coord)
        R = float(zone.radius) + MIN_OPERATIONAL_CLEARANCE_M

        for i in range(n_segments):
            constraints.append(make_constraint(P, R, i))

    return constraints


def build_waypoint_bounds(A, B):
    xmin = min(A[0], B[0]) - SEARCH_MARGIN_M
    xmax = max(A[0], B[0]) + SEARCH_MARGIN_M
    ymin = min(A[1], B[1]) - SEARCH_MARGIN_M
    ymax = max(A[1], B[1]) + SEARCH_MARGIN_M
    return xmin, xmax, ymin, ymax


def build_bounds(A, B, n_wp):
    xmin, xmax, ymin, ymax = build_waypoint_bounds(A, B)

    bounds = [(MIN_SPEED, MAX_SPEED)]
    for _ in range(n_wp):
        bounds.append((xmin, xmax))
        bounds.append((ymin, ymax))

    return bounds


def build_reference_scales(A, B, wind_vector, drone_mass, start_coord, no_go_zones):
    direct_dist = compute_direct_distance(A, B)
    direct_dist = max(direct_dist, 1.0)

    reference_speed = 15.0
    reference_time = direct_dist / reference_speed
    reference_energy = compute_energy_for_path(reference_speed, [A, B], wind_vector, drone_mass)
    reference_risk = 1.0

    if no_go_zones:
        direct_metrics = evaluate_metrics(
            reference_speed,
            [A, B],
            wind_vector,
            drone_mass,
            start_coord,
            no_go_zones,
        )
        reference_risk = max(1.0, direct_metrics["risk"])

    return {
        "energy": max(reference_energy, 1.0),
        "time": max(reference_time, 1.0),
        "distance": max(direct_dist, 1.0),
        "risk": max(reference_risk, 1.0),
    }


def build_weighted_objective(profile_weights, scales, wind_vector, drone_mass, start_coord, no_go_zones, get_points_callable):
    w = normalize_weights(profile_weights)

    def objective(x):
        v, pts = get_points_callable(x)
        metrics = evaluate_metrics(v, pts, wind_vector, drone_mass, start_coord, no_go_zones)

        score = (
            w["energy"] * (metrics["energy"] / scales["energy"])
            + w["time"] * (metrics["flight_time_seconds"] / scales["time"])
            + w["distance"] * (metrics["distance_m"] / scales["distance"])
            + w["risk"] * (metrics["risk"] / scales["risk"])
        )
        return float(score)

    return objective


def evaluate_credibility(alt, direct_distance):
    reasons = []

    if alt["buffer_clearance_m"] < 0:
        reasons.append(
            f"clearance too low (< {MIN_OPERATIONAL_CLEARANCE_M} m)"
        )

    if direct_distance > 0:
        detour_factor = alt["distance_m"] / direct_distance
        if detour_factor > MAX_DETOUR_FACTOR:
            reasons.append(
                f"detour too large (> {MAX_DETOUR_FACTOR}x direct distance)"
            )

    if not alt["feasible_battery"]:
        reasons.append("battery exceeded")

    credible = len(reasons) == 0
    return credible, reasons


def solve_single_profile(profile_name, profile_weights, wind_vector, drone_mass, start_coord, end_coord, no_go_zones, battery_capacity):
    A = to_cartesian(start_coord, ref=start_coord)
    B = to_cartesian(end_coord, ref=start_coord)

    n_wp = max(1, len(no_go_zones) + 1)
    x0 = build_initial_guess(A, B, n_wp, speed_guess=15.0)

    def get_points(x):
        return get_points_from_x(x, A, B, n_wp)

    bounds = build_bounds(A, B, n_wp)
    constraints = build_constraints(no_go_zones, start_coord, n_wp + 1, get_points)
    scales = build_reference_scales(A, B, wind_vector, drone_mass, start_coord, no_go_zones)

    objective = build_weighted_objective(
    profile_weights=profile_weights,
    scales=scales,
    wind_vector=wind_vector,
    drone_mass=drone_mass,
    start_coord=start_coord,
    no_go_zones=no_go_zones,
    get_points_callable=get_points,
)

    result = minimize(
        fun=objective,
        x0=x0,
        method="SLSQP",
        bounds=bounds,
        constraints=constraints,
        options={"maxiter": 500, "ftol": 1e-6},
    )

    if not result.success:
        return None

    opt_v, opt_pts = get_points(result.x)
    metrics = evaluate_metrics(opt_v, opt_pts, wind_vector, drone_mass, start_coord, no_go_zones)
    path_gps = [to_latlon(p, ref=start_coord) for p in opt_pts]

    return {
        "profile": profile_name,
        "speed": round(float(opt_v), 2),
        "energy": round(metrics["energy"], 2),
        "flight_time_seconds": round(metrics["flight_time_seconds"], 2),
        "distance_m": round(metrics["distance_m"], 2),
        "risk": round(metrics["risk"], 6),
        "min_clearance_m": round(metrics["min_clearance_m"], 2),
        "buffer_clearance_m": round(metrics["buffer_clearance_m"], 2),
        "raw_score": float(result.fun),
        "weighted_score": 0.0,
        "feasible_battery": metrics["energy"] <= battery_capacity,
        "credible": False,
        "rejection_reasons": [],
        "path": path_gps,
    }


def score_alternatives_with_user_weights(alternatives, user_weights):
    if not alternatives:
        return alternatives

    user_weights = normalize_weights(user_weights)

    energy_values = [alt["energy"] for alt in alternatives]
    time_values = [alt["flight_time_seconds"] for alt in alternatives]
    dist_values = [alt["distance_m"] for alt in alternatives]
    risk_values = [alt["risk"] for alt in alternatives]

    def norm_cost(value, values):
        vmin = min(values)
        vmax = max(values)
        if abs(vmax - vmin) < 1e-9:
            return 0.0
        return (value - vmin) / (vmax - vmin)

    for alt in alternatives:
        score = (
            user_weights["energy"] * norm_cost(alt["energy"], energy_values)
            + user_weights["time"] * norm_cost(alt["flight_time_seconds"], time_values)
            + user_weights["distance"] * norm_cost(alt["distance_m"], dist_values)
            + user_weights["risk"] * norm_cost(alt["risk"], risk_values)
        )
        alt["weighted_score"] = round(float(score), 6)

    # crédibles d'abord, puis batterie, puis score
    alternatives.sort(
        key=lambda a: (
            not a["credible"],
            not a["feasible_battery"],
            a["weighted_score"],
            a["energy"],
        )
    )
    return alternatives


def build_baseline(wind_vector, drone_mass, start_coord, end_coord):
    A = to_cartesian(start_coord, ref=start_coord)
    B = to_cartesian(end_coord, ref=start_coord)
    naive_speed = 25.0
    naive_dist = float(np.linalg.norm(B - A))
    naive_time = naive_dist / naive_speed
    naive_energy = compute_energy_for_path(naive_speed, [A, B], wind_vector, drone_mass)

    return {
        "speed": round(naive_speed, 2),
        "energy": round(float(naive_energy), 2),
        "flight_time_seconds": round(float(naive_time), 2),
    }


def choose_best_alternative(alternatives):
    credible_alts = [a for a in alternatives if a["credible"] and a["feasible_battery"]]
    if credible_alts:
        return credible_alts[0]

    feasible_alts = [a for a in alternatives if a["feasible_battery"]]
    if feasible_alts:
        return feasible_alts[0]

    return alternatives[0]


def build_decision(battery_capacity, baseline, best_alternative):
    if not best_alternative["feasible_battery"]:
        status = "NO_GO"
        msg = (
            f"NO-GO : aucune alternative crédible n'est compatible avec la batterie. "
            f"La meilleure option disponible est '{best_alternative['profile']}' "
            f"mais elle nécessite {best_alternative['energy']} J pour une batterie de "
            f"{battery_capacity} J."
        )
    elif not best_alternative["credible"]:
        status = "WARNING"
        msg = (
            f"ATTENTION : l'alternative recommandée '{best_alternative['profile']}' "
            f"reste non crédible opérationnellement ({', '.join(best_alternative['rejection_reasons'])}). "
            f"Énergie = {best_alternative['energy']} J, marge minimale = {best_alternative['min_clearance_m']} m."
        )
    elif baseline["energy"] > battery_capacity and best_alternative["energy"] <= battery_capacity:
        status = "WARNING"
        msg = (
            f"ATTENTION : le trajet direct consommerait {baseline['energy']} J "
            f"et dépasserait la batterie. L'ADMC recommande '{best_alternative['profile']}' "
            f"à {best_alternative['speed']} m/s, avec {best_alternative['energy']} J "
            f"et une marge minimale de {best_alternative['min_clearance_m']} m."
        )
    else:
        status = "GO"
        msg = (
            f"GO : l'ADMC recommande '{best_alternative['profile']}' "
            f"à {best_alternative['speed']} m/s. "
            f"Énergie = {best_alternative['energy']} J, temps = {best_alternative['flight_time_seconds']} s, "
            f"distance = {best_alternative['distance_m']} m, marge minimale = {best_alternative['min_clearance_m']} m."
        )

    return {"status": status, "message": msg}


def solve_optimal_speed_admc(
    wind_speed: float,
    wind_direction_deg: float,
    drone_mass: float,
    battery_capacity: float,
    start_coord,
    end_coord,
    no_go_zones,
    user_weights=None,
):
    if user_weights is None:
        user_weights = {"energy": 0.30, "time": 0.25, "distance": 0.15, "risk": 0.30}

    wind_vector = wind_vector_from_speed_direction(wind_speed, wind_direction_deg)

    baseline = build_baseline(wind_vector, drone_mass, start_coord, end_coord)

    A = to_cartesian(start_coord, ref=start_coord)
    B = to_cartesian(end_coord, ref=start_coord)
    direct_distance = compute_direct_distance(A, B)

    alternatives = []
    for profile_name, profile_weights in PROFILE_WEIGHTS.items():
        alt = solve_single_profile(
            profile_name=profile_name,
            profile_weights=profile_weights,
            wind_vector=wind_vector,
            drone_mass=drone_mass,
            start_coord=start_coord,
            end_coord=end_coord,
            no_go_zones=no_go_zones,
            battery_capacity=battery_capacity,
        )
        if alt is not None:
            credible, reasons = evaluate_credibility(alt, direct_distance)
            alt["credible"] = credible
            alt["rejection_reasons"] = reasons
            alternatives.append(alt)

    if not alternatives:
        return {
            "success": False,
            "baseline": baseline,
            "optimized": {"speed": 0, "energy": 0, "flight_time_seconds": 0},
            "path": [],
            "alternatives": [],
            "recommended_profile": "",
        }

    alternatives = score_alternatives_with_user_weights(alternatives, user_weights)
    best = choose_best_alternative(alternatives)

    optimized = {
        "speed": best["speed"],
        "energy": best["energy"],
        "flight_time_seconds": best["flight_time_seconds"],
    }

    return {
        "success": True,
        "baseline": baseline,
        "optimized": optimized,
        "path": best["path"],
        "alternatives": alternatives,
        "recommended_profile": best["profile"],
    }

def compute_energy_for_path(v, pts, wind_vector, drone_mass):
    total_energy = 0.0

    for i in range(len(pts) - 1):
        A = pts[i]
        B = pts[i + 1]
        segment_length = float(np.linalg.norm(B - A))

        if segment_length <= 1e-9:
            continue

        flight_time = segment_length / max(v, 0.1)
        power = calculate_power_for_segment(v, A, B, wind_vector, drone_mass)
        total_energy += power * flight_time

    return float(total_energy)