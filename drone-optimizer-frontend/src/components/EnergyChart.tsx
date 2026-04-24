import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine
} from 'recharts';
import type {
    CriteriaWeights,
    OptimizationResponse,
    GeneratedAlternativeResult,
    AlternativeResult,
    SolutionSelection
} from '../types';

interface EnergyChartProps {
    data?: OptimizationResponse;
    selectedSolution: SolutionSelection | null;
    setSelectedSolution: (selection: SolutionSelection | null) => void;
}

interface BaselineChartPoint {
    kind: 'baseline';
    id: 'baseline';
    label: string;
    x: number;
    y: number;
    energy: number;
    flight_time_seconds: number;
}

interface MainChartPoint extends AlternativeResult {
    kind: 'main';
    id: string;
    label: string;
    x: number;
    y: number;
}

interface GeneratedChartPoint extends GeneratedAlternativeResult {
    kind: 'generated';
    id: string;
    label: string;
    x: number;
    y: number;
}

type ChartPoint = BaselineChartPoint | MainChartPoint | GeneratedChartPoint;

const CLEARANCE_SENTINEL_THRESHOLD = 1e5;

const formatClearance = (value: number) => {
    if (!Number.isFinite(value) || value >= CLEARANCE_SENTINEL_THRESHOLD) {
        return 'N/A';
    }
    return `${value.toFixed(2)} m`;
};

const formatRisk = (value: number) => {
    if (!Number.isFinite(value) || value === 0) {
        return 'N/A';
    }
    return value.toFixed(6);
};

const formatEnergy = (value: number) => `${value.toFixed(2)} mAh`;

const formatWeightsCompact = (weights: CriteriaWeights) => (
    `E ${Math.round(weights.energy * 100)}% • T ${Math.round(weights.time * 100)}% • D ${Math.round(weights.distance * 100)}% • R ${Math.round(weights.risk * 100)}%`
);

const profileLabels: Record<string, string> = {
    eco: 'Éco',
    balanced: 'Équilibré',
    safe: 'Sûr',
    fast: 'Rapide'
};

const profileStroke: Record<string, string> = {
    eco: '#16a34a',
    balanced: '#2563eb',
    safe: '#7c3aed',
    fast: '#ea580c',
    baseline: '#94a3b8'
};

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const point = payload[0].payload as ChartPoint;

    return (
        <div className="rounded-lg border border-slate-200 bg-white shadow-lg p-3 text-xs">
            <div className="font-bold text-slate-800 mb-2">{point.label}</div>
            <div className="space-y-1 text-slate-600">
                <div>Type : <span className="font-semibold">
                    {point.kind === 'baseline' ? 'Baseline' : point.kind === 'main' ? 'Profil principal' : 'Solution générée'}
                </span></div>
                <div>Temps : <span className="font-semibold">{point.x.toFixed(2)} s</span></div>
                <div>Énergie : <span className="font-semibold">{formatEnergy(point.y)}</span></div>

                {point.kind !== 'baseline' && (
                    <>
                        <div>Distance : <span className="font-semibold">{point.distance_m.toFixed(2)} m</span></div>
                        <div>Marge : <span className="font-semibold">{formatClearance(point.min_clearance_m)}</span></div>
                        <div>Risque : <span className="font-semibold">{formatRisk(point.risk)}</span></div>
                        <div>Batterie : <span className="font-semibold">{point.feasible_battery ? 'Compatible' : 'Dépassée'}</span></div>
                        <div>Crédibilité : <span className="font-semibold">{point.credible ? 'Oui' : 'Non'}</span></div>
                    </>
                )}

                {point.kind === 'main' && (
                    <>
                        <div>Score ADMC : <span className="font-semibold">{point.weighted_score.toFixed(4)}</span></div>
                        <div>Pareto V1 : <span className="font-semibold">{point.pareto_optimal ? 'Oui' : 'Non'}</span></div>
                    </>
                )}

                {point.kind === 'generated' && (
                    <>
                        <div>Poids source : <span className="font-semibold">{formatWeightsCompact(point.source_weights)}</span></div>
                        <div>Pareto dense : <span className="font-semibold">{point.is_pareto_optimal ? 'Oui' : 'Non'}</span></div>
                    </>
                )}
            </div>
        </div>
    );
};

const EnergyChart: React.FC<EnergyChartProps> = ({ data, selectedSolution, setSelectedSolution }) => {
    const baselineData = useMemo<BaselineChartPoint[]>(() => {
        if (!data || !data.success) return [];

        return [{
            kind: 'baseline',
            id: 'baseline',
            label: 'Trajet naïf',
            x: data.baseline.flight_time_seconds,
            y: data.baseline.energy,
            energy: data.baseline.energy,
            flight_time_seconds: data.baseline.flight_time_seconds
        }];
    }, [data]);

    const mainData = useMemo<MainChartPoint[]>(() => {
        if (!data || !data.success) return [];

        return data.alternatives.map((alt) => ({
            ...alt,
            kind: 'main',
            id: alt.profile,
            label: `${profileLabels[alt.profile] ?? alt.profile}${alt.profile === data.recommended_profile ? ' (recommandé)' : ''}`,
            x: alt.flight_time_seconds,
            y: alt.energy
        }));
    }, [data]);

    const generatedData = useMemo<GeneratedChartPoint[]>(() => {
        if (!data || !data.success) return [];

        return data.pareto_generated_alternatives.map((alt) => ({
            ...alt,
            kind: 'generated',
            id: alt.id,
            label: alt.label,
            x: alt.flight_time_seconds,
            y: alt.energy
        }));
    }, [data]);

    const generatedCloudData = useMemo(
        () => generatedData.filter((point) => !point.is_pareto_optimal),
        [generatedData]
    );

    const generatedParetoData = useMemo(
        () => generatedData
            .filter((point) => point.is_pareto_optimal)
            .sort((a, b) => a.x - b.x || a.y - b.y),
        [generatedData]
    );

    const selectedMainId = selectedSolution?.kind === 'main' ? selectedSolution.id : null;
    const selectedGeneratedId = selectedSolution?.kind === 'generated' ? selectedSolution.id : null;

    if (!data) {
        return (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
                Lancez l'optimisation pour visualiser les compromis ADMC.
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col pt-2">
            <div className="flex items-center justify-between mb-4 px-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-700">Compromis multicritères</h3>
                    <p className="text-xs text-slate-500">
                        Axe X : temps • Axe Y : énergie équivalente en mAh • Nuage gris = solutions générées • front vert = Pareto dense • points colorés = profils principaux.
                    </p>
                </div>
                {selectedSolution && (
                    <button
                        type="button"
                        onClick={() => setSelectedSolution({ kind: 'main', id: data.recommended_profile })}
                        className="text-xs border border-slate-300 rounded px-2 py-1 bg-white hover:bg-slate-50"
                    >
                        Revenir à la recommandation ADMC
                    </button>
                )}
            </div>

            <div className="grow">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                            type="number"
                            dataKey="x"
                            name="Temps"
                            unit=" s"
                            tick={{ fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            name="Énergie"
                            unit=" mAh"
                            tick={{ fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '4 4' }} />

                        {data.battery_capacity && (
                            <ReferenceLine
                                y={data.battery_capacity}
                                stroke="#ef4444"
                                strokeDasharray="5 5"
                                strokeWidth={2}
                                label={{
                                    position: 'top',
                                    value: `Batterie max (${data.battery_capacity} mAh @ ${data.battery_voltage.toFixed(1)} V)`,
                                    fill: '#ef4444',
                                    fontSize: 12,
                                    fontWeight: 'bold'
                                }}
                            />
                        )}

                        <Scatter
                            data={generatedCloudData}
                            isAnimationActive={false}
                            shape={(props: any) => {
                                const { cx, cy, payload } = props as { cx: number; cy: number; payload: GeneratedChartPoint };
                                const isSelected = payload.id === selectedGeneratedId;

                                return (
                                    <g
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setSelectedSolution({ kind: 'generated', id: payload.id })}
                                    >
                                        <circle
                                            cx={cx}
                                            cy={cy}
                                            r={isSelected ? 5.5 : 3.5}
                                            fill="#94a3b8"
                                            opacity={isSelected ? 0.95 : 0.45}
                                            stroke={isSelected ? '#0f766e' : '#ffffff'}
                                            strokeWidth={isSelected ? 2 : 1}
                                        />
                                    </g>
                                );
                            }}
                        />

                        <Scatter
                            data={generatedParetoData}
                            line={generatedParetoData.length >= 2 ? { stroke: '#059669', strokeWidth: 2.5 } : false}
                            isAnimationActive={false}
                            shape={(props: any) => {
                                const { cx, cy, payload } = props as { cx: number; cy: number; payload: GeneratedChartPoint };
                                const isSelected = payload.id === selectedGeneratedId;
                                const radius = isSelected ? 7 : 5;

                                return (
                                    <g
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setSelectedSolution({ kind: 'generated', id: payload.id })}
                                    >
                                        <circle
                                            cx={cx}
                                            cy={cy}
                                            r={radius + 3}
                                            fill="none"
                                            stroke="#065f46"
                                            strokeWidth={2}
                                            opacity={0.95}
                                        />
                                        <circle
                                            cx={cx}
                                            cy={cy}
                                            r={radius}
                                            fill="#10b981"
                                            stroke="#ffffff"
                                            strokeWidth={2}
                                            opacity={0.98}
                                        />
                                    </g>
                                );
                            }}
                        />

                        <Scatter
                            data={[...baselineData, ...mainData]}
                            isAnimationActive={false}
                            shape={(props: any) => {
                                const { cx, cy, payload } = props as { cx: number; cy: number; payload: BaselineChartPoint | MainChartPoint };

                                if (payload.kind === 'baseline') {
                                    return (
                                        <rect
                                            x={cx - 5}
                                            y={cy - 5}
                                            width={10}
                                            height={10}
                                            fill={profileStroke.baseline}
                                            stroke="#ffffff"
                                            strokeWidth={2}
                                            rx={2}
                                        />
                                    );
                                }

                                const isSelected = payload.id === selectedMainId;
                                const isRecommended = payload.id === data.recommended_profile;
                                const fill = profileStroke[payload.profile] ?? '#2563eb';
                                const radius = isSelected ? 10 : isRecommended ? 9 : 7;

                                return (
                                    <g
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setSelectedSolution({ kind: 'main', id: payload.id })}
                                    >
                                        {payload.pareto_optimal && (
                                            <circle
                                                cx={cx}
                                                cy={cy}
                                                r={radius + 4}
                                                fill="none"
                                                stroke="#0284c7"
                                                strokeWidth={2}
                                                strokeDasharray="4 3"
                                                opacity={0.95}
                                            />
                                        )}
                                        <circle
                                            cx={cx}
                                            cy={cy}
                                            r={radius}
                                            fill={fill}
                                            stroke={payload.credible === false ? '#dc2626' : '#ffffff'}
                                            strokeWidth={payload.credible === false ? 3 : 2}
                                            opacity={0.96}
                                        />
                                    </g>
                                );
                            }}
                        />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default EnergyChart;
