import React, { useState } from 'react';
import { useOptimization } from './hooks/useOptimization';
import type { OptimizationPayload, Coordinate, NoGoZone } from './types';

import ControlPanel from './components/ControlPanel';
import MapView from './components/MapView';
import EnergyChart from './components/EnergyChart';

const App: React.FC = () => {
  const { mutate: optimize, data: result, isPending, isError } = useOptimization();

  const [startCoord, setStartCoord] = useState<Coordinate>([-18.8792, 47.5079]);
  const [endCoord, setEndCoord] = useState<Coordinate>([-18.9145, 47.5312]);
  const [batteryCapacity, setBatteryCapacity] = useState<number>(30000);
  const [noGoZones, setNoGoZones] = useState<NoGoZone[]>([]);

  const handleSimulate = (params: OptimizationPayload) => {
    optimize(params);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">

      <aside className="w-1/4 h-full bg-white shadow-lg z-10 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-blue-900">ADMC Drone Opti</h1>
          <p className="text-sm text-slate-500">Solveur PNL (SLSQP)</p>
        </div>

        <div className="grow p-6 overflow-y-auto">
          <ControlPanel
            onSimulate={handleSimulate}
            isPending={isPending}
            startCoord={startCoord} setStartCoord={setStartCoord}
            endCoord={endCoord} setEndCoord={setEndCoord}
            batteryCapacity={batteryCapacity} setBatteryCapacity={setBatteryCapacity}
            noGoZones={noGoZones} setNoGoZones={setNoGoZones}
            data={result}
          />

          {/* Affichage synthétique des résultats PNL CORRIGÉ */}
          {result && result.success && result.optimized && (
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-semibold text-green-800 mb-2">Convergence atteinte</h3>
              <ul className="text-sm space-y-1">
                <li>Vitesse opt. : <span className="font-mono text-green-700 font-bold">{result.optimized.speed.toFixed(2)} m/s</span></li>
                <li>Énergie min. : <span className="font-mono text-green-700 font-bold">{result.optimized.energy.toFixed(2)} J</span></li>

                <li className="pt-2 mt-2 border-t border-green-200 text-xs text-slate-600">
                  vs Trajet Naïf : {result.baseline.energy.toFixed(2)} J (à {result.baseline.speed.toFixed(2)} m/s)
                </li>
              </ul>
            </div>
          )}

          {result && !result.success && (
            <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              Le solveur n'a pas trouvé de minimum global (Non-convergence). Modifiez les paramètres.
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative">

        <section className="h-[60%] w-full bg-slate-200 relative z-0">
          <MapView
            path={result?.path}
            startCoord={startCoord} setStartCoord={setStartCoord}
            endCoord={endCoord} setEndCoord={setEndCoord}
            noGoZones={noGoZones} setNoGoZones={setNoGoZones}
          />
        </section>

        <section className="h-[40%] w-full p-4 border-t border-slate-300 bg-white z-10 relative">
          <EnergyChart data={result} />
        </section>

        {isPending && (
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 font-medium text-blue-700 animate-pulse border border-blue-100">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Optimisation SLSQP en cours...
            </div>
          </div>
        )}
      </main>

    </div>
  );
};

export default App;