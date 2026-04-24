import React, { useMemo, useState } from 'react';
import type {
    OptimizationResponse,
    SolutionSelection,
    CriteriaWeights,
    GeneratedParetoBasis
} from '../types';

interface ResultsPanelProps {
    data?: OptimizationResponse;
    selectedSolution: SolutionSelection | null;
    setSelectedSolution: (selection: SolutionSelection | null) => void;
}

type SortDirection = 'asc' | 'desc';

type MainSortKey =
    | 'profile'
    | 'recommended'
    | 'pareto_optimal'
    | 'credible'
    | 'feasible_battery'
    | 'speed'
    | 'energy'
    | 'flight_time_seconds'
    | 'distance_m'
    | 'risk'
    | 'min_clearance_m'
    | 'buffer_clearance_m'
    | 'weighted_score';

type GeneratedSortKey =
    | 'label'
    | 'is_pareto_optimal'
    | 'credible'
    | 'feasible_battery'
    | 'speed'
    | 'energy'
    | 'flight_time_seconds'
    | 'distance_m'
    | 'risk'
    | 'min_clearance_m'
    | 'buffer_clearance_m';

type SortConfig<T extends string> = {
    key: T;
    direction: SortDirection;
};

const CLEARANCE_SENTINEL_THRESHOLD = 1e5;

const generatedBasisLabels: Record<GeneratedParetoBasis, string> = {
    credible_and_feasible: 'Credibles et batterie OK',
    feasible_only: 'Batterie OK',
    all_generated: 'Toutes les générées',
    none: 'Aucune'
};

const formatClearance = (value: number) => {
    if (!Number.isFinite(value) || value >= CLEARANCE_SENTINEL_THRESHOLD) {
        return 'N/A';
    }
    return `${value.toFixed(2)} m`;
};

const formatRisk = (value: number) => {
    if (!Number.isFinite(value)) return 'N/A';
    if (value === 0) return 'N/A';
    return value.toFixed(6);
};

const formatEnergy = (value: number) => `${value.toFixed(2)} mAh`;

const formatWeightsCompact = (weights: CriteriaWeights) => (
    `E ${Math.round(weights.energy * 100)}% • T ${Math.round(weights.time * 100)}% • D ${Math.round(weights.distance * 100)}% • R ${Math.round(weights.risk * 100)}%`
);

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

const compareValues = (a: string | number | boolean, b: string | number | boolean) => {
    if (typeof a === 'string' && typeof b === 'string') {
        return a.localeCompare(b);
    }
    return Number(a) - Number(b);
};

const badge = (label: string, className: string) => (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}>
        {label}
    </span>
);

const tableHeaderButtonClass = 'inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900';

const ResultsPanel: React.FC<ResultsPanelProps> = ({
    data,
    selectedSolution,
    setSelectedSolution
}) => {
    const [mainSort, setMainSort] = useState<SortConfig<MainSortKey>>({
        key: 'weighted_score',
        direction: 'asc'
    });
    const [generatedSort, setGeneratedSort] = useState<SortConfig<GeneratedSortKey>>({
        key: 'is_pareto_optimal',
        direction: 'desc'
    });

    const selectedMainId = selectedSolution?.kind === 'main' ? selectedSolution.id : null;
    const selectedGeneratedId = selectedSolution?.kind === 'generated' ? selectedSolution.id : null;

    const recommendedAlt = data?.alternatives.find(
        (alt) => alt.profile === data.recommended_profile
    ) ?? null;

    const selectedMainAlternative = data?.alternatives.find(
        (alt) => alt.profile === selectedMainId
    ) ?? null;

    const selectedGeneratedAlternative = data?.pareto_generated_alternatives.find(
        (alt) => alt.id === selectedGeneratedId
    ) ?? null;

    const displayedSolution = selectedGeneratedAlternative ?? selectedMainAlternative ?? recommendedAlt;

    const toggleMainSort = (key: MainSortKey) => {
        setMainSort((current) => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleGeneratedSort = (key: GeneratedSortKey) => {
        setGeneratedSort((current) => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedMainAlternatives = useMemo(() => {
        if (!data) return [];

        const items = [...data.alternatives];
        items.sort((a, b) => {
            let comparison = 0;
            switch (mainSort.key) {
                case 'profile':
                    comparison = compareValues(
                        profileLabels[a.profile] ?? a.profile,
                        profileLabels[b.profile] ?? b.profile
                    );
                    break;
                case 'recommended':
                    comparison = compareValues(
                        a.profile === data.recommended_profile,
                        b.profile === data.recommended_profile
                    );
                    break;
                case 'pareto_optimal':
                case 'credible':
                case 'feasible_battery':
                case 'speed':
                case 'energy':
                case 'flight_time_seconds':
                case 'distance_m':
                case 'risk':
                case 'min_clearance_m':
                case 'buffer_clearance_m':
                case 'weighted_score':
                    comparison = compareValues(a[mainSort.key], b[mainSort.key]);
                    break;
                default:
                    comparison = 0;
            }
            if (comparison === 0) {
                comparison = compareValues(a.weighted_score, b.weighted_score);
            }
            return mainSort.direction === 'asc' ? comparison : -comparison;
        });
        return items;
    }, [data, mainSort]);

    const sortedGeneratedAlternatives = useMemo(() => {
        if (!data) return [];

        const items = [...data.pareto_generated_alternatives];
        items.sort((a, b) => {
            let comparison = 0;
            switch (generatedSort.key) {
                case 'label':
                    comparison = compareValues(a.label, b.label);
                    break;
                case 'is_pareto_optimal':
                case 'credible':
                case 'feasible_battery':
                case 'speed':
                case 'energy':
                case 'flight_time_seconds':
                case 'distance_m':
                case 'risk':
                case 'min_clearance_m':
                case 'buffer_clearance_m':
                    comparison = compareValues(a[generatedSort.key], b[generatedSort.key]);
                    break;
                default:
                    comparison = 0;
            }
            if (comparison === 0) {
                comparison = compareValues(a.flight_time_seconds, b.flight_time_seconds);
            }
            return generatedSort.direction === 'asc' ? comparison : -comparison;
        });
        return items;
    }, [data, generatedSort]);

    const mainHeaderLabel = (label: string, key: MainSortKey) => (
        <button type="button" className={tableHeaderButtonClass} onClick={() => toggleMainSort(key)}>
            <span>{label}</span>
            {mainSort.key === key && <span>{mainSort.direction === 'asc' ? '↑' : '↓'}</span>}
        </button>
    );

    const generatedHeaderLabel = (label: string, key: GeneratedSortKey) => (
        <button type="button" className={tableHeaderButtonClass} onClick={() => toggleGeneratedSort(key)}>
            <span>{label}</span>
            {generatedSort.key === key && <span>{generatedSort.direction === 'asc' ? '↑' : '↓'}</span>}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="pb-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Résultats</h2>
                <p className="text-sm text-slate-500">
                    Les profils principaux portent la recommandation ADMC. Les solutions générées servent l'exploration plus fine du front de Pareto.
                </p>
            </div>

            {!data && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    Lancez l'optimisation pour remplir cette colonne avec la recommandation, les profils principaux et le tableau des solutions générées.
                </div>
            )}

            {data?.decision && (
                <div className={`rounded-xl border p-4 ${badgeClassForDecision(data.decision.status)}`}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-lg font-bold">{data.decision.status}</span>
                        {recommendedAlt && (
                            <span className="rounded-full border border-current bg-white/80 px-2 py-1 text-xs font-semibold">
                                Recommandée : {profileLabels[recommendedAlt.profile] ?? recommendedAlt.profile}
                            </span>
                        )}
                    </div>
                    <p className="text-sm leading-relaxed">{data.decision.message}</p>
                </div>
            )}

            {data && displayedSolution && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <h3 className="font-semibold text-slate-900">Solution sélectionnée</h3>
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                            {selectedGeneratedAlternative ? 'Générée' : 'Principale'}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="text-xs text-slate-500">Nom</div>
                            <div className="font-bold text-slate-800">
                                {selectedGeneratedAlternative
                                    ? selectedGeneratedAlternative.label
                                    : profileLabels[selectedMainAlternative?.profile ?? recommendedAlt?.profile ?? ''] ?? selectedMainAlternative?.profile ?? recommendedAlt?.profile}
                            </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="text-xs text-slate-500">Vitesse</div>
                            <div className="font-bold text-slate-800">{displayedSolution.speed.toFixed(2)} m/s</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="text-xs text-slate-500">Conso batt.</div>
                            <div className="font-bold text-slate-800">{formatEnergy(displayedSolution.energy)}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="text-xs text-slate-500">Temps</div>
                            <div className="font-bold text-slate-800">{displayedSolution.flight_time_seconds.toFixed(2)} s</div>
                        </div>
                    </div>
                </div>
            )}

            {data && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Solutions générées</div>
                        <div className="mt-1 text-2xl font-bold text-slate-900">{data.generated_count}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Front dense</div>
                        <div className="mt-1 text-2xl font-bold text-slate-900">{data.pareto_generated_count}</div>
                    </div>
                    <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Base Pareto générée</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">
                            {generatedBasisLabels[data.generated_pareto_basis]}
                        </div>
                    </div>
                </div>
            )}

            {data && (
                <section className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="font-semibold text-slate-900">Profils principaux ADMC</h3>
                            <p className="text-xs text-slate-500">
                                Les 4 profils historiques restent la base de la recommandation lisible.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedSolution({ kind: 'main', id: data.recommended_profile })}
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                            Revenir à la recommandée
                        </button>
                    </div>

                    <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-200 bg-white">
                        <table className="min-w-[1220px] w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                                <tr className="border-b border-slate-200">
                                    <th className="px-3 py-2">{mainHeaderLabel('Profil', 'profile')}</th>
                                    <th className="px-3 py-2">{mainHeaderLabel('Reco', 'recommended')}</th>
                                    <th className="px-3 py-2">{mainHeaderLabel('Pareto', 'pareto_optimal')}</th>
                                    <th className="px-3 py-2">{mainHeaderLabel('Crédible', 'credible')}</th>
                                    <th className="px-3 py-2">{mainHeaderLabel('Batterie', 'feasible_battery')}</th>
                                    <th className="px-3 py-2">{mainHeaderLabel('Vitesse', 'speed')}</th>
                                    <th className="px-3 py-2">{mainHeaderLabel('Énergie (mAh)', 'energy')}</th>
                                    <th className="px-3 py-2">{mainHeaderLabel('Temps', 'flight_time_seconds')}</th>
                                    <th className="px-3 py-2">{mainHeaderLabel('Distance', 'distance_m')}</th>
                                    <th className="px-3 py-2">{mainHeaderLabel('Risque', 'risk')}</th>
                                    <th className="px-3 py-2">{mainHeaderLabel('Marge', 'min_clearance_m')}</th>
                                    <th className="px-3 py-2">{mainHeaderLabel('Buffer', 'buffer_clearance_m')}</th>
                                    <th className="px-3 py-2">{mainHeaderLabel('Score', 'weighted_score')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedMainAlternatives.map((alt) => {
                                    const isSelected = selectedMainId === alt.profile;
                                    const isRecommended = alt.profile === data.recommended_profile;
                                    const rowClass = isSelected
                                        ? 'bg-slate-900 text-white hover:bg-slate-900 hover:text-white'
                                        : !alt.credible
                                            ? 'bg-red-50 hover:bg-red-100'
                                            : isRecommended
                                                ? 'bg-blue-50 hover:bg-blue-100'
                                                : alt.pareto_optimal
                                                    ? 'bg-sky-50 hover:bg-sky-100'
                                                    : 'bg-white hover:bg-slate-100';

                                    return (
                                        <tr
                                            key={alt.profile}
                                            onClick={() => setSelectedSolution({ kind: 'main', id: alt.profile })}
                                            className={`${rowClass} cursor-pointer border-b border-slate-100 transition-colors`}
                                        >
                                            <td className="px-3 py-2 font-semibold whitespace-nowrap">
                                                {profileLabels[alt.profile] ?? alt.profile}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {isRecommended ? badge('RECOMMANDÉ', 'bg-blue-600 text-white') : '—'}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {alt.pareto_optimal ? badge('PARETO', 'bg-sky-600 text-white') : '—'}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {alt.credible ? badge('OK', 'bg-emerald-100 text-emerald-800') : badge('NON CRÉDIBLE', 'bg-red-100 text-red-800')}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {alt.feasible_battery ? badge('OK', 'bg-emerald-100 text-emerald-800') : badge('BATTERIE KO', 'bg-amber-100 text-amber-800')}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">{alt.speed.toFixed(2)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{formatEnergy(alt.energy)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{alt.flight_time_seconds.toFixed(2)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{alt.distance_m.toFixed(2)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{formatRisk(alt.risk)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{formatClearance(alt.min_clearance_m)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{formatClearance(alt.buffer_clearance_m)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap font-mono">{alt.weighted_score.toFixed(4)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {data && (
                <section className="space-y-3">
                    <div>
                        <h3 className="font-semibold text-slate-900">Solutions générées / Pareto dense</h3>
                        <p className="text-xs text-slate-500">
                            Tableau compact des solutions échantillonnées. Cliquez une ligne pour l'afficher sur la carte et le graphique.
                        </p>
                    </div>

                    <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200 bg-white">
                        <table className="min-w-[1280px] w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                                <tr className="border-b border-slate-200">
                                    <th className="px-3 py-2">{generatedHeaderLabel('Nom', 'label')}</th>
                                    <th className="px-3 py-2">{generatedHeaderLabel('Pareto', 'is_pareto_optimal')}</th>
                                    <th className="px-3 py-2">{generatedHeaderLabel('Crédible', 'credible')}</th>
                                    <th className="px-3 py-2">{generatedHeaderLabel('Batterie', 'feasible_battery')}</th>
                                    <th className="px-3 py-2">{generatedHeaderLabel('Vitesse', 'speed')}</th>
                                    <th className="px-3 py-2">{generatedHeaderLabel('Énergie (mAh)', 'energy')}</th>
                                    <th className="px-3 py-2">{generatedHeaderLabel('Temps', 'flight_time_seconds')}</th>
                                    <th className="px-3 py-2">{generatedHeaderLabel('Distance', 'distance_m')}</th>
                                    <th className="px-3 py-2">{generatedHeaderLabel('Risque', 'risk')}</th>
                                    <th className="px-3 py-2">{generatedHeaderLabel('Marge', 'min_clearance_m')}</th>
                                    <th className="px-3 py-2">{generatedHeaderLabel('Buffer', 'buffer_clearance_m')}</th>
                                    <th className="px-3 py-2">Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedGeneratedAlternatives.map((alt) => {
                                    const isSelected = selectedGeneratedId === alt.id;
                                    const rowClass = isSelected
                                        ? 'bg-emerald-900 text-white hover:bg-emerald-900 hover:text-white'
                                        : !alt.credible
                                            ? 'bg-red-50 hover:bg-red-100'
                                            : alt.is_pareto_optimal
                                                ? 'bg-emerald-50 hover:bg-emerald-100'
                                                : 'bg-white hover:bg-slate-100';

                                    return (
                                        <tr
                                            key={alt.id}
                                            onClick={() => setSelectedSolution({ kind: 'generated', id: alt.id })}
                                            className={`${rowClass} cursor-pointer border-b border-slate-100 transition-colors`}
                                        >
                                            <td className="px-3 py-2">
                                                <div className="font-semibold whitespace-nowrap">{alt.label}</div>
                                                <div className="text-[10px] opacity-80 whitespace-nowrap">{formatWeightsCompact(alt.source_weights)}</div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {alt.is_pareto_optimal ? badge('PARETO', 'bg-emerald-600 text-white') : '—'}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {alt.credible ? badge('OK', 'bg-emerald-100 text-emerald-800') : badge('NON CRÉDIBLE', 'bg-red-100 text-red-800')}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {alt.feasible_battery ? badge('OK', 'bg-emerald-100 text-emerald-800') : badge('BATTERIE KO', 'bg-amber-100 text-amber-800')}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">{alt.speed.toFixed(2)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{formatEnergy(alt.energy)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{alt.flight_time_seconds.toFixed(2)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{alt.distance_m.toFixed(2)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{formatRisk(alt.risk)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{formatClearance(alt.min_clearance_m)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{formatClearance(alt.buffer_clearance_m)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap text-slate-400">—</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
};

export default ResultsPanel;
