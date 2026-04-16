import React, { useEffect, useMemo, useState } from 'react';
import { useOptimization } from './hooks/useOptimization';
import type { OptimizationPayload, Coordinate, NoGoZone } from './types';

import ControlPanel from './components/ControlPanel';
import MapView from './components/MapView';
import EnergyChart from './components/EnergyChart';

const App: React.FC = () => {
  const { mutate: optimize, data: result, isPending } = useOptimization();

  const [startCoord, setStartCoord] = useState<Coordinate>([-18.8792, 47.5079]);
  const [endCoord, setEndCoord] = useState<Coordinate>([-18.9145, 47.5312]);
  const [batteryCapacity, setBatteryCapacity] = useState<number>(30000);
  const [noGoZones, setNoGoZones] = useState<NoGoZone[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [windSpeed, setWindSpeed] = useState<number>(5);
  const [windDirectionDeg, setWindDirectionDeg] = useState<number>(0);

  const handleSimulate = (params: OptimizationPayload) => {
    optimize(params);
  };

  useEffect(() => {
    if (result?.recommended_profile) {
      setSelectedProfile(result.recommended_profile);
    }
  }, [result?.recommended_profile]);

  const selectedAlternative = useMemo(() => {
    if (!result?.alternatives || !selectedProfile) return null;
    return result.alternatives.find((alt) => alt.profile === selectedProfile) ?? null;
  }, [result, selectedProfile]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      <aside className="w-95 min-w-95 h-full bg-white shadow-lg z-10 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-blue-900">ADMC Drone Opti</h1>
          <p className="text-sm text-slate-500">
            Optimisation multicritère • PNL (SLSQP)
          </p>
        </div>

        <div className="grow p-6 overflow-y-auto">
          <ControlPanel
            onSimulate={handleSimulate}
            isPending={isPending}
            startCoord={startCoord}
            setStartCoord={setStartCoord}
            endCoord={endCoord}
            setEndCoord={setEndCoord}
            batteryCapacity={batteryCapacity}
            setBatteryCapacity={setBatteryCapacity}
            noGoZones={noGoZones}
            setNoGoZones={setNoGoZones}
            data={result}
            selectedProfile={selectedProfile}
            setSelectedProfile={setSelectedProfile}
            windSpeed={windSpeed}
            setWindSpeed={setWindSpeed}
            windDirectionDeg={windDirectionDeg}
            setWindDirectionDeg={setWindDirectionDeg}
          />

          {result && result.success && selectedAlternative && (
            <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <h3 className="font-semibold text-slate-800 mb-3">Profil affiché</h3>
              <ul className="text-sm space-y-1">
                <li>
                  Profil : <span className="font-mono font-bold text-slate-700">{selectedAlternative.profile}</span>
                </li>
                <li>
                  Vitesse : <span className="font-mono font-bold text-slate-700">{selectedAlternative.speed.toFixed(2)} m/s</span>
                </li>
                <li>
                  Énergie : <span className="font-mono font-bold text-slate-700">{selectedAlternative.energy.toFixed(2)} J</span>
                </li>
                <li>
                  Temps : <span className="font-mono font-bold text-slate-700">{selectedAlternative.flight_time_seconds.toFixed(2)} s</span>
                </li>
                <li>
                  Score : <span className="font-mono font-bold text-slate-700">{selectedAlternative.weighted_score.toFixed(4)}</span>
                </li>
                <li>
                  Pareto : <span className="font-mono font-bold text-slate-700">
                    {selectedAlternative.pareto_optimal ? 'Oui' : 'Non'}
                  </span>
                </li>
                <li>
                  Marge obstacle : <span className="font-mono font-bold text-slate-700">
                    {selectedAlternative.min_clearance_m >= 1e5 ? 'N/A' : `${selectedAlternative.min_clearance_m.toFixed(2)} m`}
                  </span>
                </li>
                <li>
                  Buffer restant : <span className="font-mono font-bold text-slate-700">
                    {selectedAlternative.buffer_clearance_m >= 1e5 ? 'N/A' : `${selectedAlternative.buffer_clearance_m.toFixed(2)} m`}
                  </span>
                </li>
                <li className="pt-2 mt-2 border-t border-slate-200 text-xs text-slate-600">
                  Baseline : {result.baseline.energy.toFixed(2)} J à {result.baseline.speed.toFixed(2)} m/s
                </li>
              </ul>
            </div>
          )}

          {result && !result.success && (
            <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              Le solveur n'a pas trouvé d'alternatives exploitables. Modifie les paramètres.
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative min-w-0">
        <section className="h-[60%] w-full bg-slate-200 relative z-0 min-w-0">
          <MapView
            path={selectedAlternative?.path ?? result?.path}
            alternatives={result?.alternatives}
            recommendedProfile={result?.recommended_profile}
            selectedProfile={selectedProfile}
            setSelectedProfile={setSelectedProfile}
            startCoord={startCoord}
            setStartCoord={setStartCoord}
            endCoord={endCoord}
            setEndCoord={setEndCoord}
            noGoZones={noGoZones}
            setNoGoZones={setNoGoZones}
            windSpeed={windSpeed}
            windDirectionDeg={windDirectionDeg}
          />
        </section>

        <section className="h-[40%] w-full p-4 border-t border-slate-300 bg-white z-10 relative min-w-0">
          <EnergyChart
            data={result}
            selectedProfile={selectedProfile}
            setSelectedProfile={setSelectedProfile}
          />
        </section>

        {isPending && (
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 font-medium text-blue-700 animate-pulse border border-blue-100">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Optimisation ADMC en cours...
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
