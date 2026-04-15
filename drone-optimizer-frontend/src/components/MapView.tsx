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
        <div className="absolute top-4 right-4 z-[1000] bg-white p-2 rounded shadow-md flex gap-2">
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
        <div className="absolute top-4 left-4 z-[1000] bg-white/95 border border-slate-200 rounded-xl shadow-lg p-3 min-w-[220px]">
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
    setNoGoZones
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