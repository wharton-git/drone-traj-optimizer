import React, { useState } from 'react';
import type { OptimizationPayload, Coordinate, OptimizationResponse, NoGoZone } from '../types';

interface ControlPanelProps {
    onSimulate: (payload: OptimizationPayload) => void;
    isPending: boolean;
    startCoord: Coordinate;
    setStartCoord: (c: Coordinate) => void;
    endCoord: Coordinate;
    setEndCoord: (c: Coordinate) => void;
    batteryCapacity: number;
    setBatteryCapacity: (val: number) => void;
    noGoZones: NoGoZone[];
    setNoGoZones: (zones: NoGoZone[]) => void;
    data?: OptimizationResponse;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    onSimulate, isPending,
    startCoord, setStartCoord,
    endCoord, setEndCoord,
    batteryCapacity, setBatteryCapacity,
    noGoZones, setNoGoZones,
    data
}) => {
    const [windSpeed, setWindSpeed] = useState<number>(5.0);
    const [droneMass, setDroneMass] = useState<number>(1.2);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSimulate({
            wind_speed: windSpeed,
            drone_mass: droneMass,
            battery_capacity: batteryCapacity,
            start_point: startCoord,
            end_point: endCoord,
            no_go_zones: noGoZones
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">Paramètres initiaux</h2>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Vent (m/s)</label>
                    <input
                        type="number" step="0.1" min="0" required
                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-blue-500"
                        value={windSpeed} onChange={(e) => setWindSpeed(parseFloat(e.target.value))}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Masse (kg)</label>
                    <input
                        type="number" step="0.1" min="0.1" required
                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-blue-500"
                        value={droneMass} onChange={(e) => setDroneMass(parseFloat(e.target.value))}
                    />
                </div>
            </div>

            {/* Départ */}
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-2">Point de Départ (Lat / Lng)</label>
                <div className="flex gap-2">
                    <input type="number" step="0.0001" value={startCoord[0]} onChange={(e) => setStartCoord([parseFloat(e.target.value), startCoord[1]])} className="w-1/2 p-2 text-sm border rounded" required />
                    <input type="number" step="0.0001" value={startCoord[1]} onChange={(e) => setStartCoord([startCoord[0], parseFloat(e.target.value)])} className="w-1/2 p-2 text-sm border rounded" required />
                </div>
            </div>

            {/* Arrivée */}
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-2">Point d'Arrivée (Lat / Lng)</label>
                <div className="flex gap-2">
                    <input type="number" step="0.0001" value={endCoord[0]} onChange={(e) => setEndCoord([parseFloat(e.target.value), endCoord[1]])} className="w-1/2 p-2 text-sm border rounded" required />
                    <input type="number" step="0.0001" value={endCoord[1]} onChange={(e) => setEndCoord([endCoord[0], parseFloat(e.target.value)])} className="w-1/2 p-2 text-sm border rounded" required />
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Capacité Batterie (Joules)</label>
                <input
                    type="number" step="1000" min="1000" required
                    className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                    value={batteryCapacity} onChange={(e) => setBatteryCapacity(parseFloat(e.target.value))}
                />
            </div>
            <div className="bg-red-50 p-3 rounded border border-red-200 mt-4">
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-red-800">Zones Interdites (No-Go)</label>
                    <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {noGoZones.length}
                    </span>
                </div>
                <p className="text-[10px] text-red-600 mb-2">Cliquez sur la carte pour ajouter un obstacle (ex: Tempête, Aéroport).</p>
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

            <button
                type="submit"
                disabled={isPending}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 px-4 rounded transition-colors"
            >
                {isPending ? 'Résolution SLSQP...' : 'Lancer l\'Optimisation'}
            </button>

            {/* MOTEUR D'AIDE A LA DECISION (Affichage) */}
            {data?.decision && (
                <div className={`mt-6 p-4 rounded-md border ${data.decision.status === 'GO' ? 'bg-green-50 border-green-400 text-green-900' :
                    data.decision.status === 'WARNING' ? 'bg-amber-50 border-amber-400 text-amber-900' :
                        'bg-red-50 border-red-400 text-red-900'
                    }`}>
                    <div className="flex items-center mb-2">
                        <span className="font-bold text-lg">{data.decision.status}</span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{data.decision.message}</p>
                </div>
            )}
        </form>
    );
};

export default ControlPanel;