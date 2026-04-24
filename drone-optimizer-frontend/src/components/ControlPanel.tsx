import React, { useMemo, useState } from 'react';
import type {
    OptimizationPayload,
    Coordinate,
    NoGoZone,
    CriteriaWeights
} from '../types';

interface ControlPanelProps {
    onSimulate: (payload: OptimizationPayload) => void;
    isPending: boolean;
    startCoord: Coordinate;
    setStartCoord: (c: Coordinate) => void;
    endCoord: Coordinate;
    setEndCoord: (c: Coordinate) => void;
    batteryCapacity: number;
    setBatteryCapacity: (val: number) => void;
    batteryVoltage: number;
    setBatteryVoltage: (val: number) => void;
    noGoZones: NoGoZone[];
    setNoGoZones: (zones: NoGoZone[]) => void;
    windSpeed: number;
    setWindSpeed: (val: number) => void;
    windDirectionDeg: number;
    setWindDirectionDeg: (val: number) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    onSimulate,
    isPending,
    startCoord,
    setStartCoord,
    endCoord,
    setEndCoord,
    batteryCapacity,
    setBatteryCapacity,
    batteryVoltage,
    setBatteryVoltage,
    noGoZones,
    setNoGoZones,
    windSpeed,
    setWindSpeed,
    windDirectionDeg,
    setWindDirectionDeg
}) => {
    const [droneMass, setDroneMass] = useState<number>(1.2);
    const [weights, setWeights] = useState<CriteriaWeights>({
        energy: 30,
        time: 25,
        distance: 15,
        risk: 30
    });

    const normalizedWeights = useMemo<CriteriaWeights>(() => {
        const total = weights.energy + weights.time + weights.distance + weights.risk;
        if (total <= 0) {
            return { energy: 0.3, time: 0.25, distance: 0.15, risk: 0.3 };
        }
        return {
            energy: weights.energy / total,
            time: weights.time / total,
            distance: weights.distance / total,
            risk: weights.risk / total
        };
    }, [weights]);

    const handleWeightChange = (key: keyof CriteriaWeights, value: number) => {
        setWeights((prev) => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        onSimulate({
            wind_speed: windSpeed,
            wind_direction_deg: windDirectionDeg,
            drone_mass: droneMass,
            battery_capacity: batteryCapacity,
            battery_voltage: batteryVoltage,
            start_point: startCoord,
            end_point: endCoord,
            no_go_zones: noGoZones,
            weights: normalizedWeights
        });
    };

    return (
        <div className="space-y-6">
            <div className="pb-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Configuration</h2>
                <p className="text-sm text-slate-500">
                    Paramètres mission, contraintes et préférences ADMC.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Vent (m/s)</label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            required
                            className="w-full p-2 border border-slate-300 rounded text-sm"
                            value={windSpeed}
                            onChange={(e) => setWindSpeed(parseFloat(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Direction vent (°)</label>
                        <input
                            type="number"
                            step="1"
                            min="0"
                            max="360"
                            required
                            className="w-full p-2 border border-slate-300 rounded text-sm"
                            value={windDirectionDeg}
                            onChange={(e) => setWindDirectionDeg(parseFloat(e.target.value))}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                            0° = Est, 90° = Nord
                        </p>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Masse (kg)</label>
                        <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            required
                            className="w-full p-2 border border-slate-300 rounded text-sm"
                            value={droneMass}
                            onChange={(e) => setDroneMass(parseFloat(e.target.value))}
                        />
                    </div>
                </div>

                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-2">Point de Départ (Lat / Lng)</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            step="0.0001"
                            value={startCoord[0]}
                            onChange={(e) => setStartCoord([parseFloat(e.target.value), startCoord[1]])}
                            className="w-1/2 p-2 text-sm border rounded"
                            required
                        />
                        <input
                            type="number"
                            step="0.0001"
                            value={startCoord[1]}
                            onChange={(e) => setStartCoord([startCoord[0], parseFloat(e.target.value)])}
                            className="w-1/2 p-2 text-sm border rounded"
                            required
                        />
                    </div>
                </div>

                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-2">Point d'Arrivée (Lat / Lng)</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            step="0.0001"
                            value={endCoord[0]}
                            onChange={(e) => setEndCoord([parseFloat(e.target.value), endCoord[1]])}
                            className="w-1/2 p-2 text-sm border rounded"
                            required
                        />
                        <input
                            type="number"
                            step="0.0001"
                            value={endCoord[1]}
                            onChange={(e) => setEndCoord([endCoord[0], parseFloat(e.target.value)])}
                            className="w-1/2 p-2 text-sm border rounded"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Capacité Batterie (mAh)</label>
                        <input
                            type="number"
                            step="100"
                            min="100"
                            required
                            className="w-full p-2 border border-slate-300 rounded text-sm"
                            value={batteryCapacity}
                            onChange={(e) => setBatteryCapacity(parseFloat(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Tension nominale (V)</label>
                        <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            required
                            className="w-full p-2 border border-slate-300 rounded text-sm"
                            value={batteryVoltage}
                            onChange={(e) => setBatteryVoltage(parseFloat(e.target.value))}
                        />
                    </div>
                </div>
                <p className="text-[10px] text-slate-400 -mt-3">
                    Conversion utilisee : mAh = J / (3.6 x V)
                </p>

                <div className="bg-red-50 p-3 rounded border border-red-200">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-red-800">Zones Interdites (No-Go)</label>
                        <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {noGoZones.length}
                        </span>
                    </div>
                    <p className="text-[10px] text-red-600 mb-2">
                        Cliquez sur la carte pour ajouter un obstacle.
                    </p>
                    {noGoZones.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setNoGoZones([])}
                            className="w-full text-xs bg-white text-red-600 border border-red-300 py-1 rounded hover:bg-red-100 transition-colors"
                        >
                            Effacer les obstacles
                        </button>
                    )}
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Poids ADMC</h3>
                        <p className="text-xs text-slate-500">
                            Ajuste les préférences du décideur. Les valeurs sont normalisées automatiquement.
                        </p>
                    </div>

                    {([
                        ['energy', 'Énergie'],
                        ['time', 'Temps'],
                        ['distance', 'Distance'],
                        ['risk', 'Risque']
                    ] as [keyof CriteriaWeights, string][]).map(([key, label]) => (
                        <div key={key}>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-medium text-slate-600">{label}</label>
                                <span className="text-xs font-mono text-slate-500">
                                    {(normalizedWeights[key] * 100).toFixed(1)}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={weights[key]}
                                onChange={(e) => handleWeightChange(key, Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    ))}

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-white border border-slate-200 rounded-lg p-2">
                        <div>Énergie : <span className="font-semibold">{(normalizedWeights.energy * 100).toFixed(1)}%</span></div>
                        <div>Temps : <span className="font-semibold">{(normalizedWeights.time * 100).toFixed(1)}%</span></div>
                        <div>Distance : <span className="font-semibold">{(normalizedWeights.distance * 100).toFixed(1)}%</span></div>
                        <div>Risque : <span className="font-semibold">{(normalizedWeights.risk * 100).toFixed(1)}%</span></div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 px-4 rounded transition-colors"
                >
                    {isPending ? 'Résolution ADMC...' : "Lancer l'Optimisation ADMC"}
                </button>
            </form>
        </div>
    );
};

export default ControlPanel;
