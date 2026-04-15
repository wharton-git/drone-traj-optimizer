import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { type OptimizationResponse } from '../types';

interface EnergyChartProps {
    data?: OptimizationResponse;
}

const EnergyChart: React.FC<EnergyChartProps> = ({ data }) => {

    // Génération de la série de données pour le comparatif Recharts
    const chartData = useMemo(() => {
        if (!data || !data.success || !data.baseline || !data.optimized) return [];

        return [
            {
                name: 'Trajet Naïf (Vmax)',
                'Énergie Consommée': data.baseline.energy,
                fill: '#94a3b8' // Gris (Baseline)
            },
            {
                name: 'Trajet PNL (Optimal)',
                'Énergie Consommée': data.optimized.energy,
                fill: data.optimized.energy > data.battery_capacity ? '#ef4444' : '#22c55e'
            }
        ];
    }, [data]);

    if (!data) {
        return (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
                Lancez l'optimisation pour visualiser le comparatif énergétique.
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col pt-2">
            <h3 className="text-sm font-bold text-slate-700 mb-4 px-4">Comparatif Énergétique (Joules)</h3>
            <div className="grow">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 13, fontWeight: 500 }} tickLine={false} />
                        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: 'transparent' }}
                        />

                        {data.battery_capacity && (
                            <ReferenceLine
                                y={data.battery_capacity}
                                stroke="#ef4444"
                                strokeDasharray="5 5"
                                strokeWidth={2}
                                label={{
                                    position: 'top',
                                    value: `Capacité Batterie Max (${data.battery_capacity} J)`,
                                    fill: '#ef4444',
                                    fontSize: 12,
                                    fontWeight: 'bold'
                                }}
                            />
                        )}

                        <Bar
                            dataKey="Énergie Consommée"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={80}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default EnergyChart;