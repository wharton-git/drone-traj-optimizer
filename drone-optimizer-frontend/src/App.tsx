import React, { useEffect, useState } from 'react';
import { useOptimization } from './hooks/useOptimization';
import type { OptimizationPayload, Coordinate, NoGoZone, SolutionSelection } from './types';

import ControlPanel from './components/ControlPanel';
import MapView from './components/MapView';
import EnergyChart from './components/EnergyChart';
import ResultsPanel from './components/ResultsPanel';

const App: React.FC = () => {
  const { mutate: optimize, data: result, isPending } = useOptimization();

  const [startCoord, setStartCoord] = useState<Coordinate>([-18.8792, 47.5079]);
  const [endCoord, setEndCoord] = useState<Coordinate>([-18.9145, 47.5312]);
  const [batteryCapacity, setBatteryCapacity] = useState<number>(30000);
  const [noGoZones, setNoGoZones] = useState<NoGoZone[]>([]);
  const [selectedSolution, setSelectedSolution] = useState<SolutionSelection | null>(null);
  const [windSpeed, setWindSpeed] = useState<number>(5);
  const [windDirectionDeg, setWindDirectionDeg] = useState<number>(0);

  const handleSimulate = (params: OptimizationPayload) => {
    optimize(params);
  };

  useEffect(() => {
    if (result?.recommended_profile) {
      setSelectedSolution({ kind: 'main', id: result.recommended_profile });
    }
  }, [result?.recommended_profile]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans xl:h-screen xl:overflow-hidden xl:grid xl:grid-cols-[360px_minmax(0,1fr)_560px]">
      <aside className="bg-white border-b border-slate-200 xl:border-b-0 xl:border-r xl:h-screen xl:overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-blue-900">ADMC Drone Opti</h1>
          <p className="text-sm text-slate-500">
            Optimisation multicritère • PNL (SLSQP)
          </p>
        </div>

        <div className="p-6">
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
            windSpeed={windSpeed}
            setWindSpeed={setWindSpeed}
            windDirectionDeg={windDirectionDeg}
            setWindDirectionDeg={setWindDirectionDeg}
          />
        </div>
      </aside>

      <main className="relative min-w-0 flex flex-col gap-4 p-4 xl:p-6 xl:h-screen">
        <section className="relative min-h-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:flex-[3]">
          <MapView
            path={result?.path}
            alternatives={result?.alternatives}
            generatedAlternatives={result?.pareto_generated_alternatives}
            recommendedProfile={result?.recommended_profile}
            selectedSolution={selectedSolution}
            setSelectedSolution={setSelectedSolution}
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

        <section className="min-h-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:flex-[2]">
          <EnergyChart
            data={result}
            selectedSolution={selectedSolution}
            setSelectedSolution={setSelectedSolution}
          />
        </section>

        {isPending && (
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
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

      <aside className="bg-white border-t border-slate-200 xl:border-t-0 xl:border-l xl:h-screen xl:overflow-y-auto">
        <div className="p-6">
          <ResultsPanel
            data={result}
            selectedSolution={selectedSolution}
            setSelectedSolution={setSelectedSolution}
          />
        </div>
      </aside>
    </div>
  );
};

export default App;
