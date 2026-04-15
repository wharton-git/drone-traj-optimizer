import React, { useMemo, useState } from 'react';
import type {
    OptimizationPayload,
    Coordinate,
    OptimizationResponse,
    NoGoZone,
    CriteriaWeights,
    AlternativeResult
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
    noGoZones: NoGoZone[];
    setNoGoZones: (zones: NoGoZone[]) => void;
    data?: OptimizationResponse;
    selectedProfile: string | null;
    setSelectedProfile: (profile: string | null) => void;
}

const profileLabels: Record<string, string> = {
    eco: 'Éco',
    balanced: 'Équilibré',
    safe: 'Sûr',
    fast: 'Rapide'
};

const badgeClassForDecision = (status: string) => {
    if (status === 'GO') return 'bg-green-50 border-green-400 text-green-900';
    if (status === 'WARNING') return 'bg-amber-50 border-amber-400 text-amber-900';
    return 'bg-red-50 border-red-400 text-red-900';
};

const altCardClass = (alt: AlternativeResult, selectedProfile: string | null, recommendedProfile?: string) => {
    const isSelected = selectedProfile === alt.profile;
    const isRecommended = recommendedProfile === alt.profile;

    if (!alt.credible) {
        return `border rounded-xl p-3 transition-all ${isSelected ? 'border-red-500 ring-2 ring-red-200 bg-red-50' : 'border-red-200 bg-red-50'
            }`;
    }

    if (isRecommended) {
        return `border rounded-xl p-3 transition-all ${isSelected ? 'border-blue-600 ring-2 ring-blue-200 bg-blue-50' : 'border-blue-300 bg-blue-50'
            }`;
    }

    return `border rounded-xl p-3 transition-all ${isSelected ? 'border-slate-700 ring-2 ring-slate-200 bg-slate-50' : 'border-slate-200 bg-white'
        }`;
};

const ControlPanel: React.FC<ControlPanelProps> = ({
    onSimulate,
    isPending,
    startCoord,
    setStartCoord,
    endCoord,
    setEndCoord,
    batteryCapacity,
    setBatteryCapacity,
    noGoZones,
    setNoGoZones,
    data,
    selectedProfile,
    setSelectedProfile
}) => {
    const [windSpeed, setWindSpeed] = useState<number>(5.0);
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
            drone_mass: droneMass,
            battery_capacity: batteryCapacity,
            start_point: startCoord,
            end_point: endCoord,
            no_go_zones: noGoZones,
            weights: normalizedWeights
        });
    };

    const recommendedAlt = data?.alternatives?.find(
        (alt) => alt.profile === data.recommended_profile
    );

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">Paramètres initiaux</h2>

                <div className="grid grid-cols-2 gap-4">
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

                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Capacité Batterie (J)</label>
                    <input
                        type="number"
                        step="1000"
                        min="1000"
                        required
                        className="w-full p-2 border border-slate-300 rounded text-sm"
                        value={batteryCapacity}
                        onChange={(e) => setBatteryCapacity(parseFloat(e.target.value))}
                    />
                </div>

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
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 px-4 rounded transition-colors"
                >
                    {isPending ? 'Résolution ADMC...' : "Lancer l'Optimisation ADMC"}
                </button>
            </form>

            {data?.decision && (
                <div className={`p-4 rounded-md border ${badgeClassForDecision(data.decision.status)}`}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="font-bold text-lg">{data.decision.status}</span>
                        {recommendedAlt && (
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/80 border border-current">
                                Profil recommandé : {profileLabels[recommendedAlt.profile] ?? recommendedAlt.profile}
                            </span>
                        )}
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{data.decision.message}</p>
                </div>
            )}

            {data?.success && recommendedAlt && (
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
                    <h3 className="font-semibold text-blue-900 mb-3">Synthèse de la recommandation</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white rounded-lg border border-blue-100 p-3">
                            <div className="text-xs text-slate-500">Profil</div>
                            <div className="font-bold text-slate-800">
                                {profileLabels[recommendedAlt.profile] ?? recommendedAlt.profile}
                            </div>
                        </div>
                        <div className="bg-white rounded-lg border border-blue-100 p-3">
                            <div className="text-xs text-slate-500">Score</div>
                            <div className="font-bold text-slate-800">
                                {recommendedAlt.weighted_score.toFixed(4)}
                            </div>
                        </div>
                        <div className="bg-white rounded-lg border border-blue-100 p-3">
                            <div className="text-xs text-slate-500">Énergie</div>
                            <div className="font-bold text-slate-800">
                                {recommendedAlt.energy.toFixed(2)} J
                            </div>
                        </div>
                        <div className="bg-white rounded-lg border border-blue-100 p-3">
                            <div className="text-xs text-slate-500">Temps</div>
                            <div className="font-bold text-slate-800">
                                {recommendedAlt.flight_time_seconds.toFixed(2)} s
                            </div>
                        </div>
                        <div className="bg-white rounded-lg border border-blue-100 p-3">
                            <div className="text-xs text-slate-500">Distance</div>
                            <div className="font-bold text-slate-800">
                                {recommendedAlt.distance_m.toFixed(2)} m
                            </div>
                        </div>
                        <div className="bg-white rounded-lg border border-blue-100 p-3">
                            <div className="text-xs text-slate-500">Marge obstacle</div>
                            <div className="font-bold text-slate-800">
                                {recommendedAlt.min_clearance_m.toFixed(2)} m
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {data?.alternatives && data.alternatives.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800">Alternatives ADMC</h3>
                        <button
                            type="button"
                            onClick={() => setSelectedProfile(data.recommended_profile)}
                            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white hover:bg-slate-50"
                        >
                            Afficher recommandée
                        </button>
                    </div>

                    <div className="space-y-3">
                        {data.alternatives.map((alt) => {
                            const isRecommended = alt.profile === data.recommended_profile;
                            return (
                                <button
                                    key={alt.profile}
                                    type="button"
                                    onClick={() => setSelectedProfile(alt.profile)}
                                    className={`w-full text-left ${altCardClass(alt, selectedProfile, data.recommended_profile)}`}
                                >
                                    <div className="flex justify-between items-start gap-3 mb-2">
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-slate-800">
                                                    {profileLabels[alt.profile] ?? alt.profile}
                                                </span>
                                                {isRecommended && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                                                        RECOMMANDÉ
                                                    </span>
                                                )}
                                                {!alt.credible && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white">
                                                        NON CRÉDIBLE
                                                    </span>
                                                )}
                                                {!alt.feasible_battery && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                                                        BATTERIE KO
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                Cliquez pour afficher cette trajectoire sur la carte.
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[11px] text-slate-500">Score</div>
                                            <div className="font-mono font-bold text-slate-800">
                                                {alt.weighted_score.toFixed(4)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700">
                                        <div>Vitesse : <span className="font-semibold">{alt.speed.toFixed(2)} m/s</span></div>
                                        <div>Énergie : <span className="font-semibold">{alt.energy.toFixed(2)} J</span></div>
                                        <div>Temps : <span className="font-semibold">{alt.flight_time_seconds.toFixed(2)} s</span></div>
                                        <div>Distance : <span className="font-semibold">{alt.distance_m.toFixed(2)} m</span></div>
                                        <div>Marge obstacle : <span className="font-semibold">{alt.min_clearance_m.toFixed(2)} m</span></div>
                                        <div>Buffer restant : <span className="font-semibold">{alt.buffer_clearance_m.toFixed(2)} m</span></div>
                                    </div>

                                    {!alt.credible && alt.rejection_reasons.length > 0 && (
                                        <div className="mt-3 text-[11px] text-red-700 bg-white/70 border border-red-200 rounded p-2">
                                            Rejet : {alt.rejection_reasons.join(', ')}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ControlPanel;