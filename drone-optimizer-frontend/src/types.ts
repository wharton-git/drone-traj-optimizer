export type Coordinate = [number, number];

export interface NoGoZone {
    center: Coordinate;
    radius: number;
}

export interface CriteriaWeights {
    energy: number;
    time: number;
    distance: number;
    risk: number;
}

export interface OptimizationPayload {
    wind_speed: number;
    wind_direction_deg: number;
    drone_mass: number;
    battery_capacity: number;
    start_point: Coordinate;
    end_point: Coordinate;
    no_go_zones: NoGoZone[];
    weights: CriteriaWeights;
}

export interface ScenarioResult {
    speed: number;
    energy: number;
    flight_time_seconds: number;
}

export interface AlternativeResult {
    profile: string;
    speed: number;
    energy: number;
    flight_time_seconds: number;
    distance_m: number;
    risk: number;
    min_clearance_m: number;
    buffer_clearance_m: number;
    weighted_score: number;
    feasible_battery: boolean;
    credible: boolean;
    pareto_optimal: boolean;
    rejection_reasons: string[];
    path: Coordinate[];
}

export interface OptimizationResponse {
    baseline: ScenarioResult;
    optimized: ScenarioResult;
    battery_capacity: number;
    path: Coordinate[];
    alternatives: AlternativeResult[];
    recommended_profile: string;
    decision: {
        status: 'GO' | 'WARNING' | 'NO_GO';
        message: string;
    };
    success: boolean;
}
