import React, { useState } from 'react';
import {
    MapContainer,
    TileLayer,
    Polyline,
    Marker,
    Popup,
    useMap,
    useMapEvents,
    Circle
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coordinate, NoGoZone, AlternativeResult } from '../types';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const directionLabel = (deg: number) => {
    const d = ((deg % 360) + 360) % 360;

    if (d >= 337.5 || d < 22.5) return 'Est';
    if (d < 67.5) return 'Nord-Est';
    if (d < 112.5) return 'Nord';
    if (d < 157.5) return 'Nord-Ouest';
    if (d < 202.5) return 'Ouest';
    if (d < 247.5) return 'Sud-Ouest';
    if (d < 292.5) return 'Sud';
    return 'Sud-Est';
};

L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
    path?: Coordinate[];
    alternatives?: AlternativeResult[];
    recommendedProfile?: string;
    selectedProfile: string | null;
    setSelectedProfile: (profile: string | null) => void;
    startCoord: Coordinate;
    setStartCoord: (c: Coordinate) => void;
    endCoord: Coordinate;
    setEndCoord: (c: Coordinate) => void;
    noGoZones: NoGoZone[];
    setNoGoZones: (zones: NoGoZone[]) => void;
    windSpeed: number;
    windDirectionDeg: number;
}

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
    fast: '#ea580c'
};

const MapInteractionHandler: React.FC<{ setClickedCoord: (c: Coordinate) => void }> = ({ setClickedCoord }) => {
    useMapEvents({
        click(e) {
            setClickedCoord([e.latlng.lat, e.latlng.lng]);
        }
    });
    return null;
};

const SearchControl: React.FC = () => {
    const [query, setQuery] = useState('');
    const map = useMap();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query) return;

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await res.json();

            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                map.flyTo([parseFloat(lat), parseFloat(lon)], 14);
            } else {
                alert("Lieu non trouvé.");
            }
        } catch (error) {
            console.error("Erreur de recherche", error);
        }
    };

    return (
        <div className="absolute top-4 right-4 z-1000 bg-white p-2 rounded shadow-md flex gap-2">
            <form onSubmit={handleSearch} className="flex">
                <input
                    type="text"
                    placeholder="Chercher un lieu..."
                    className="p-1 text-sm border border-slate-300 rounded-l outline-none focus:border-blue-500"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button type="submit" className="bg-blue-600 text-white px-3 text-sm rounded-r font-medium hover:bg-blue-700">
                    Aller
                </button>
            </form>
        </div>
    );
};

const MapLegend: React.FC<{
    alternatives?: AlternativeResult[];
    recommendedProfile?: string;
    selectedProfile: string | null;
    setSelectedProfile: (profile: string | null) => void;
}> = ({ alternatives, recommendedProfile, selectedProfile, setSelectedProfile }) => {
    if (!alternatives || alternatives.length === 0) return null;

    return (
        <div className="absolute top-4 left-4 z-1000 bg-white/95 border border-slate-200 rounded-xl shadow-lg p-3 min-w-55">
            <div className="text-xs font-bold text-slate-700 mb-2">Trajectoires</div>
            <div className="space-y-2">
                {alternatives.map((alt) => {
                    const isSelected = selectedProfile === alt.profile;
                    const isRecommended = recommendedProfile === alt.profile;

                    return (
                        <button
                            key={alt.profile}
                            type="button"
                            onClick={() => setSelectedProfile(alt.profile)}
                            className={`w-full flex items-center justify-between gap-3 px-2 py-1.5 rounded text-xs border transition-colors ${isSelected ? 'bg-slate-100 border-slate-400' : 'bg-white border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className="inline-block w-3 h-3 rounded-full"
                                    style={{ backgroundColor: profileStroke[alt.profile] ?? '#2563eb' }}
                                />
                                <span className="font-medium text-slate-700">
                                    {profileLabels[alt.profile] ?? alt.profile}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 flex-wrap justify-end">
                                {isRecommended && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white">
                                        reco
                                    </span>
                                )}
                                {!alt.credible && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-600 text-white">
                                        rejet
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const WindIndicator: React.FC<{
    windSpeed: number;
    windDirectionDeg: number;
}> = ({ windSpeed, windDirectionDeg }) => {
    return (
        <div className="absolute bottom-4 right-4 z-1000 bg-white/95 border border-slate-200 rounded-xl shadow-lg px-4 py-3 min-w-42.5">
            <div className="text-xs font-bold text-slate-700 mb-2">Vent</div>

            <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 flex items-center justify-center rounded-full border border-slate-300 bg-slate-50">
                    <div
                        className="text-blue-600 text-xl font-bold leading-none transition-transform"
                        style={{
                            transform: `rotate(${windDirectionDeg}deg)`
                        }}
                    >
                        →
                    </div>
                </div>

                <div className="text-xs text-slate-600">
                    <div>
                        Vitesse : <span className="font-semibold">{windSpeed.toFixed(1)} m/s</span>
                    </div>
                    <div>
                        Direction : <span className="font-semibold">{windDirectionDeg.toFixed(0)}° ({directionLabel(windDirectionDeg)})</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                        0° = Est, 90° = Nord
                    </div>
                </div>
            </div>
        </div>
    );
};

const MapView: React.FC<MapViewProps> = ({
    path,
    alternatives,
    recommendedProfile,
    selectedProfile,
    setSelectedProfile,
    startCoord,
    setStartCoord,
    endCoord,
    setEndCoord,
    noGoZones,
    setNoGoZones,
    windSpeed,
    windDirectionDeg
}) => {
    const [clickedCoord, setClickedCoord] = useState<Coordinate | null>(null);

    const handleSetStart = () => {
        if (clickedCoord) {
            setStartCoord(clickedCoord);
            setClickedCoord(null);
        }
    };

    const handleSetEnd = () => {
        if (clickedCoord) {
            setEndCoord(clickedCoord);
            setClickedCoord(null);
        }
    };

    const handleAddNoGoZone = () => {
        if (clickedCoord) {
            setNoGoZones([...noGoZones, { center: clickedCoord, radius: 1000 }]);
            setClickedCoord(null);
        }
    };

    const selectedAlternative = alternatives?.find((alt) => alt.profile === selectedProfile) ?? null;
    const recommendedAlternative = alternatives?.find((alt) => alt.profile === recommendedProfile) ?? null;

    const visiblePath = selectedAlternative?.path ?? path;
    const visibleProfile = selectedAlternative?.profile ?? recommendedAlternative?.profile ?? null;

    return (
        <div className="w-full h-full relative">
            <MapContainer center={startCoord} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <SearchControl />
                <MapLegend
                    alternatives={alternatives}
                    recommendedProfile={recommendedProfile}
                    selectedProfile={selectedProfile}
                    setSelectedProfile={setSelectedProfile}
                />
                <WindIndicator
                    windSpeed={windSpeed}
                    windDirectionDeg={windDirectionDeg}
                />
                <MapInteractionHandler setClickedCoord={setClickedCoord} />

                {clickedCoord && (
                    <Popup position={clickedCoord}>
                        <div className="text-center w-44">
                            <p className="text-xs font-bold text-slate-500 mb-2 border-b pb-1">Action à cette position :</p>
                            <div className="flex flex-col gap-1.5">
                                <button onClick={handleSetStart} className="bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700">
                                    Définir comme Départ
                                </button>
                                <button onClick={handleSetEnd} className="bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700">
                                    Définir comme Arrivée
                                </button>
                                <button onClick={handleAddNoGoZone} className="bg-red-600 text-white text-xs px-2 py-1 rounded mt-1 hover:bg-red-700 font-bold">
                                    Ajouter Zone (1km)
                                </button>
                            </div>
                        </div>
                    </Popup>
                )}

                <Marker position={startCoord}>
                    <Popup>Départ actuel</Popup>
                </Marker>

                <Marker position={endCoord}>
                    <Popup>Arrivée actuelle</Popup>
                </Marker>

                {noGoZones.map((zone, index) => (
                    <Circle
                        key={index}
                        center={zone.center}
                        radius={zone.radius}
                        pathOptions={{
                            color: 'red',
                            fillColor: '#ef4444',
                            fillOpacity: 0.25,
                            weight: 2
                        }}
                    >
                        <Popup>Zone Interdite (Rayon : {zone.radius} m)</Popup>
                    </Circle>
                ))}

                {recommendedAlternative && recommendedAlternative.path.length > 0 && (
                    <Polyline
                        positions={recommendedAlternative.path}
                        pathOptions={{
                            color: '#2563eb',
                            weight: 4,
                            opacity: selectedProfile && selectedProfile !== recommendedAlternative.profile ? 0.35 : 0.9,
                            dashArray: '8 8'
                        }}
                    >
                        <Popup>
                            Recommandée : {profileLabels[recommendedAlternative.profile] ?? recommendedAlternative.profile}
                        </Popup>
                    </Polyline>
                )}

                {visiblePath && visiblePath.length > 0 && (
                    <Polyline
                        positions={visiblePath}
                        pathOptions={{
                            color: visibleProfile ? (profileStroke[visibleProfile] ?? '#16a34a') : '#16a34a',
                            weight: 5,
                            opacity: 0.95
                        }}
                    >
                        <Popup>
                            {visibleProfile
                                ? `Trajectoire affichée : ${profileLabels[visibleProfile] ?? visibleProfile}`
                                : 'Trajectoire optimisée'}
                        </Popup>
                    </Polyline>
                )}
            </MapContainer>
        </div>
    );
};

export default MapView;