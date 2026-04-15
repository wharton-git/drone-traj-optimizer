import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coordinate, NoGoZone } from '../types';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
    path?: Coordinate[];
    startCoord: Coordinate;
    setStartCoord: (c: Coordinate) => void;
    endCoord: Coordinate;
    setEndCoord: (c: Coordinate) => void;
    noGoZones: NoGoZone[];
    setNoGoZones: (zones: NoGoZone[]) => void;
}

// 1. COMPOSANT CACHÉ : Gère le clic sur la carte
const MapInteractionHandler: React.FC<{ setClickedCoord: (c: Coordinate) => void }> = ({ setClickedCoord }) => {
    useMapEvents({
        click(e) {
            setClickedCoord([e.latlng.lat, e.latlng.lng]);
        }
    });
    return null;
};

// 2. COMPOSANT DE RECHERCHE : UI par-dessus la carte interagissant avec Nominatim
const SearchControl: React.FC = () => {
    const [query, setQuery] = useState('');
    const map = useMap();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query) return;

        try {
            // API de Geocoding OpenStreetMap
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                map.flyTo([parseFloat(lat), parseFloat(lon)], 14); // Anime la caméra vers le lieu
            } else {
                alert("Lieu non trouvé.");
            }
        } catch (error) {
            console.error("Erreur de recherche", error);
        }
    };

    return (
        <div className="absolute top-4 right-4 z-400 bg-white p-2 rounded shadow-md flex gap-2">
            <form onSubmit={handleSearch} className="flex">
                <input
                    type="text"
                    placeholder="Chercher un lieu..."
                    className="p-1 text-sm border border-slate-300 rounded-l outline-none focus:border-blue-500"
                    value={query} onChange={(e) => setQuery(e.target.value)}
                />
                <button type="submit" className="bg-blue-600 text-white px-3 text-sm rounded-r font-medium hover:bg-blue-700">
                    Aller
                </button>
            </form>
        </div>
    );
};

const MapView: React.FC<MapViewProps> = ({ path, startCoord, setStartCoord, endCoord, setEndCoord, noGoZones, setNoGoZones }) => {
    // État temporaire pour stocker le clic avant décision de l'utilisateur
    const [clickedCoord, setClickedCoord] = useState<Coordinate | null>(null);

    const handleSetStart = () => { if (clickedCoord) { setStartCoord(clickedCoord); setClickedCoord(null); } };
    const handleSetEnd = () => { if (clickedCoord) { setEndCoord(clickedCoord); setClickedCoord(null); } };

    const handleAddNoGoZone = () => {
        if (clickedCoord) {
            setNoGoZones([...noGoZones, { center: clickedCoord, radius: 1000 }]); // Rayon par défaut : 1km
            setClickedCoord(null);
        }
    };

    return (
        <div className="w-full h-full relative">
            <MapContainer center={startCoord} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* <SearchControl /> */}
                <SearchControl/>
                <MapInteractionHandler setClickedCoord={setClickedCoord} />

                {/* POPUP CONTEXTUEL SUR CLIC MIS A JOUR */}
                {clickedCoord && (
                    <Popup
                        position={clickedCoord}
                        // onClose={() => setClickedCoord(null)}
                    >
                        <div className="text-center w-40">
                            <p className="text-xs font-bold text-slate-500 mb-2 border-b pb-1">Action à cette position :</p>
                            <div className="flex flex-col gap-1.5">
                                <button onClick={handleSetStart} className="bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700">
                                    Définir comme Départ
                                </button>
                                <button onClick={handleSetEnd} className="bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700">
                                    Définir comme Arrivée
                                </button>
                                {/* LE NOUVEAU BOUTON D'OBSTACLE */}
                                <button onClick={handleAddNoGoZone} className="bg-red-600 text-white text-xs px-2 py-1 rounded mt-1 hover:bg-red-700 font-bold">
                                    Ajouter Zone (1km)
                                </button>
                            </div>
                        </div>
                    </Popup>
                )}

                <Marker position={startCoord}><Popup>Départ actuel</Popup></Marker>
                <Marker position={endCoord}><Popup>Arrivée actuelle</Popup></Marker>

                {/* AFFICHAGE DES CERCLES ROUGES DES NO-GO ZONES */}
                {noGoZones.map((zone, index) => (
                    <Circle
                        key={index}
                        center={zone.center}
                        radius={zone.radius}
                        pathOptions={{ color: 'red', fillColor: '#ef4444', fillOpacity: 0.3, weight: 2 }}
                    >
                        <Popup>Zone Interdite (Rayon: {zone.radius}m)</Popup>
                    </Circle>
                ))}

                {/* TRACÉ PNL */}
                {path && path.length > 0 && (
                    <Polyline positions={path} color="#2563eb" weight={4} dashArray="10, 10" />
                )}
            </MapContainer>
        </div>
    );
};

export default MapView;