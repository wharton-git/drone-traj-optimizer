import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    Cell
} from 'recharts';
import type { OptimizationResponse } from '../types';

interface EnergyChartProps {
    data?: OptimizationResponse;
    selectedProfile: string | null;
    setSelectedProfile: (profile: string | null) => void;
}

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

    const point = payload[0].payload;

    return (
        <div className="rounded-lg border border-slate-200 bg-white shadow-lg p-3 text-xs">
            <div className="font-bold text-slate-800 mb-2">{point.label}</div>
            <div className="space-y-1 text-slate-600">
                <div>Temps : <span className="font-semibold">{point.x.toFixed(2)} s</span></div>
                <div>Énergie : <span className="font-semibold">{point.y.toFixed(2)} J</span></div>
                {'distance_m' in point && (
                    <div>Distance : <span className="font-semibold">{point.distance_m.toFixed(2)} m</span></div>
                )}
                {'min_clearance_m' in point && (
                    <div>Marge : <span className="font-semibold">{formatClearance(point.min_clearance_m)}</span></div>
                )}
                {'weighted_score' in point && (
                    <div>Score : <span className="font-semibold">{point.weighted_score.toFixed(4)}</span></div>
                )}
                {'credible' in point && (
                    <div>
                        Statut :{' '}
                        <span className={`font-semibold ${point.credible ? 'text-green-700' : 'text-red-700'}`}>
                            {point.credible ? 'Crédible' : 'Non crédible'}
                        </span>
                    </div>
                )}
                {'pareto_optimal' in point && (
                    <div>
                        Pareto :{' '}
                        <span className={`font-semibold ${point.pareto_optimal ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {point.pareto_optimal ? 'Oui' : 'Non'}
                        </span>
                    </div>
                )}
                {'risk' in point && (
                    <div>Risque : <span className="font-semibold">{formatRisk(point.risk)}</span></div>
                )}
            </div>
        </div>
    );
};

const EnergyChart: React.FC<EnergyChartProps> = ({ data, selectedProfile, setSelectedProfile }) => {
    const chartData = useMemo(() => {
        if (!data || !data.success) return [];

        const baselinePoint = {
            profile: 'baseline',
            label: 'Trajet naïf',
            x: data.baseline.flight_time_seconds,
            y: data.baseline.energy,
            energy: data.baseline.energy,
            flight_time_seconds: data.baseline.flight_time_seconds
        };

        const alternatives = data.alternatives.map((alt) => ({
            ...alt,
            label: `${profileLabels[alt.profile] ?? alt.profile}${alt.profile === data.recommended_profile ? ' (recommandé)' : ''}`,
            x: alt.flight_time_seconds,
            y: alt.energy
        }));

        return [baselinePoint, ...alternatives];
    }, [data]);

    const paretoFrontData = useMemo(() => {
        if (!data || !data.success) return [];

        return data.alternatives
            .filter((alt) => alt.pareto_optimal)
            .map((alt) => ({
                ...alt,
                x: alt.flight_time_seconds,
                y: alt.energy,
            }))
            .sort((a, b) => a.x - b.x);
    }, [data]);

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
                        Axe X : temps • Axe Y : énergie • Le trait vert matérialise la projection du front de Pareto.
                    </p>
                </div>
                {selectedProfile && (
                    <button
                        type="button"
                        onClick={() => setSelectedProfile(data.recommended_profile)}
                        className="text-xs border border-slate-300 rounded px-2 py-1 bg-white hover:bg-slate-50"
                    >
                        Revenir au profil recommandé
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
                            unit=" J"
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
                                    value: `Batterie max (${data.battery_capacity} J)`,
                                    fill: '#ef4444',
                                    fontSize: 12,
                                    fontWeight: 'bold'
                                }}
                            />
                        )}

                        {paretoFrontData.length >= 2 && (
                            <Scatter
                                data={paretoFrontData}
                                line={{ stroke: '#059669', strokeWidth: 2.5 }}
                                shape={() => null}
                                isAnimationActive={false}
                            />
                        )}

                        <Scatter
                            data={chartData}
                            shape={(props: any) => {
                                const { cx, cy, payload } = props;
                                const isSelected = payload.profile === selectedProfile;
                                const isRecommended = payload.profile === data.recommended_profile;
                                const fill = profileStroke[payload.profile] ?? '#2563eb';
                                const radius = payload.profile === 'baseline' ? 7 : isSelected ? 10 : isRecommended ? 9 : 7;

                                return (
                                    <g
                                        style={{ cursor: payload.profile !== 'baseline' ? 'pointer' : 'default' }}
                                        onClick={() => {
                                            if (payload.profile !== 'baseline') {
                                                setSelectedProfile(payload.profile);
                                            }
                                        }}
                                    >
                                        {payload.pareto_optimal && (
                                            <circle
                                                cx={cx}
                                                cy={cy}
                                                r={radius + 4}
                                                fill="none"
                                                stroke="#059669"
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
                                            opacity={payload.profile === 'baseline' ? 0.9 : 0.95}
                                        />
                                    </g>
                                );
                            }}
                        >
                            {chartData.map((entry) => (
                                <Cell key={`${entry.profile}-${entry.x}-${entry.y}`} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default EnergyChart;
