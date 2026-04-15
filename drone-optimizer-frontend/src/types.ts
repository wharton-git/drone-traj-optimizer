export type Coordinate = [number, number];

export interface NoGoZone {
    center: Coordinate;
    radius: number;
}

export interface OptimizationPayload {
    wind_speed: number;
    drone_mass: number;
    battery_capacity: number;
    start_point: Coordinate;
    end_point: Coordinate;
    no_go_zones: NoGoZone[]; // NOUVEAU
}

export interface ScenarioResult {
    speed: number;
    energy: number;
    flight_time_seconds: number;
}

export interface OptimizationResponse {
    baseline: ScenarioResult;
    optimized: ScenarioResult;
    battery_capacity: number;
    path: Coordinate[];
    decision: {
        status: 'GO' | 'WARNING' | 'NO_GO';
        message: string;
    };
    success: boolean;
}