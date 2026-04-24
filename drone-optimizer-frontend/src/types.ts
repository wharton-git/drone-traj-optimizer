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
    battery_voltage: number;
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

export interface GeneratedAlternativeResult {
    id: string;
    label: string;
    source_weights: CriteriaWeights;
    speed: number;
    energy: number;
    flight_time_seconds: number;
    distance_m: number;
    risk: number;
    min_clearance_m: number;
    buffer_clearance_m: number;
    feasible_battery: boolean;
    credible: boolean;
    is_pareto_optimal: boolean;
    rejection_reasons: string[];
    path: Coordinate[];
}

export type GeneratedParetoBasis =
    | 'credible_and_feasible'
    | 'feasible_only'
    | 'all_generated'
    | 'none';

export type SolutionSelection =
    | { kind: 'main'; id: string }
    | { kind: 'generated'; id: string };

export interface OptimizationResponse {
    baseline: ScenarioResult;
    optimized: ScenarioResult;
    battery_capacity: number;
    battery_voltage: number;
    path: Coordinate[];
    alternatives: AlternativeResult[];
    pareto_generated_alternatives: GeneratedAlternativeResult[];
    pareto_front_generated: string[];
    generated_count: number;
    pareto_generated_count: number;
    generated_pareto_basis: GeneratedParetoBasis;
    recommended_profile: string;
    decision: {
        status: 'GO' | 'WARNING' | 'NO_GO';
        message: string;
    };
    success: boolean;
}
