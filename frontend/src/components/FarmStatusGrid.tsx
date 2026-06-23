import { useState } from "react";
import type { Lotto, FarmStructure } from "@/types";
import { ShedDetailPanel } from "./ShedDetailPanel";

interface FarmStatusGridProps {
    lotti: Lotto[];
    farmStructure: FarmStructure;
    pollastraStructure?: FarmStructure;
    onUpdate: () => void;
}

function calculateAgeWeeks(yearStart: number, weekStart: number): number {
    const today = new Date();
    const startDate = getDateFromYearWeek(yearStart, weekStart);
    const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.floor(diffDays / 7));
}

function getDateFromYearWeek(year: number, week: number): Date {
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
    return monday;
}

function isLottoExpired(l: Lotto): boolean {
    if (!l.Data_Fine_Prevista) return false;
    const parts = l.Data_Fine_Prevista.split('/');
    if (parts.length !== 2) return false;
    const fineYear = parseInt(parts[0]);
    const fineWeek = parseInt(parts[1]);
    if (isNaN(fineYear) || isNaN(fineWeek)) return false;
    // Cycle expires from the Monday of the week after fineWeek
    const expiry = getDateFromYearWeek(fineYear, fineWeek);
    expiry.setDate(expiry.getDate() + 7);
    return new Date() >= expiry;
}

// True quando la settimana di start del lotto è già arrivata.
// Gli accasamenti programmati nel futuro non sono ancora "in corso".
function hasStarted(l: Lotto): boolean {
    return new Date() >= getDateFromYearWeek(l.Anno_Start, l.Sett_Start);
}

// Matches capannone by number (exact or "1A"/"1B" sub-sections)
function matchesShed(capannone: string, shed: number): boolean {
    const cap = String(capannone);
    const shedStr = String(shed);
    if (cap === shedStr) return true;
    if (cap.startsWith(shedStr) && cap.length > shedStr.length && !/^\d/.test(cap[shedStr.length])) return true;
    return false;
}

export function FarmStatusGrid({ lotti, farmStructure, pollastraStructure, onUpdate }: FarmStatusGridProps) {
    const POLLASTRA_FARMS: Record<string, number[]> = pollastraStructure ?? {};
    const [selectedShed, setSelectedShed] = useState<{ farm: string; shed: number } | null>(null);
    const [selectedPollaShed, setSelectedPollaShed] = useState<{ farm: string; shed: number } | null>(null);

    // Normal lotti (no fase)
    const normalLotti = lotti.filter(l => !l.Fase || l.Fase === null);
    // Pollastra lotti
    const pollastralotti = lotti.filter(l => l.Fase === 'pollastra');

    const getActiveLotti = (farm: string, shed: number, src: Lotto[]): Lotto[] =>
        src.filter(l => l.Attivo && l.Allevamento === farm && matchesShed(l.Capannone, shed));

    const isProductive = (farm: string, shed: number): boolean =>
        getActiveLotti(farm, shed, normalLotti).some(
            l => calculateAgeWeeks(l.Anno_Start, l.Sett_Start) >= 24 && !isLottoExpired(l)
        );

    // Lotti pollastra realmente in corso in un capannone: attivi, già partiti e non scaduti.
    const getRunningPollastra = (farm: string, shed: number): Lotto[] =>
        getActiveLotti(farm, shed, pollastralotti).filter(l => hasStarted(l) && !isLottoExpired(l));

    const sortedFarms = Object.keys(farmStructure).sort();

    // Shared farm card renderer for normal farms
    const renderNormalFarmCard = (farm: string) => {
        const sheds = farmStructure[farm];
        const currentFarmSelected = selectedShed?.farm === farm;

        return (
            <div
                key={farm}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md"
            >
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    🏠 {farm}
                </h3>
                <div className="flex flex-wrap gap-3">
                    {sheds.map(shed => {
                        const productive = isProductive(farm, shed);
                        const isSelected = selectedShed?.farm === farm && selectedShed?.shed === shed;
                        return (
                            <button
                                key={shed}
                                onClick={() => {
                                    if (productive) {
                                        setSelectedShed(isSelected ? null : { farm, shed });
                                        setSelectedPollaShed(null);
                                    }
                                }}
                                disabled={!productive}
                                className={`
                                    px-6 py-4 rounded-xl font-semibold text-base transition-all min-w-[100px]
                                    ${productive
                                        ? isSelected
                                            ? "bg-emerald-400 text-white shadow-lg scale-105 ring-4 ring-emerald-200"
                                            : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 hover:shadow-md border-2 border-emerald-300"
                                        : "bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200"
                                    }
                                `}
                            >
                                {productive ? (isSelected ? "✓ " : "● ") : "○ "} Cap. {shed}
                            </button>
                        );
                    })}
                </div>
                {currentFarmSelected && selectedShed && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <ShedDetailPanel
                            lotti={getActiveLotti(selectedShed.farm, selectedShed.shed, normalLotti).filter(
                                l => calculateAgeWeeks(l.Anno_Start, l.Sett_Start) >= 24
                            )}
                            onUpdate={onUpdate}
                            onClose={() => setSelectedShed(null)}
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Situazione Allevamenti</h2>
                <p className="text-xs text-gray-400">V001</p>
                <p className="text-gray-500">Clicca su un capannone verde per vedere i dettagli</p>
            </div>

            {/* Normal farms — two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="flex flex-col gap-6">
                    {sortedFarms.filter((_, i) => i % 2 === 0).map(renderNormalFarmCard)}
                </div>
                <div className="flex flex-col gap-6">
                    {sortedFarms.filter((_, i) => i % 2 === 1).map(renderNormalFarmCard)}
                </div>
            </div>

            {/* ── Fase Pollastra zone ── */}
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-6 space-y-5">
                <div>
                    <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                        🐣 Fase Pollastra
                    </h3>
                    <p className="text-xs text-blue-500 mt-0.5">Allevamenti W1–W20 · non produttivi</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    {Object.entries(POLLASTRA_FARMS).map(([farm, sheds]) => {
                        const isFarmSelected = selectedPollaShed?.farm === farm;

                        return (
                            <div
                                key={farm}
                                className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm"
                            >
                                <h4 className="text-sm font-semibold text-blue-700 mb-3">🏠 {farm}</h4>
                                <div className="flex flex-wrap gap-2">
                                    {sheds.map(shed => {
                                        const runningLotti = getRunningPollastra(farm, shed);
                                        const occupied = runningLotti.length > 0;
                                        const isSelected = selectedPollaShed?.farm === farm && selectedPollaShed?.shed === shed;
                                        const age = occupied
                                            ? calculateAgeWeeks(runningLotti[0].Anno_Start, runningLotti[0].Sett_Start)
                                            : null;

                                        return (
                                            <button
                                                key={shed}
                                                onClick={() => {
                                                    if (!occupied) return;
                                                    setSelectedPollaShed(isSelected ? null : { farm, shed });
                                                    setSelectedShed(null);
                                                }}
                                                disabled={!occupied}
                                                className={`
                                                    px-4 py-3 rounded-xl font-semibold text-sm transition-all min-w-[90px] text-left
                                                    ${occupied
                                                        ? isSelected
                                                            ? "bg-blue-500 text-white shadow-md ring-4 ring-blue-200"
                                                            : "bg-blue-100 text-blue-800 hover:bg-blue-200 border-2 border-blue-300"
                                                        : "bg-gray-50 text-gray-400 cursor-not-allowed border-2 border-gray-200"
                                                    }
                                                `}
                                            >
                                                <div>{occupied ? (isSelected ? "✓ " : "● ") : "○ "} Cap. {shed}</div>
                                                <div className="text-[10px] mt-1 opacity-80">
                                                    {occupied && age !== null ? `W${age} / 20` : " "}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Detail panel for selected pollastra shed */}
                                {isFarmSelected && selectedPollaShed && (
                                    <div className="mt-4 pt-4 border-t border-blue-100">
                                        <ShedDetailPanel
                                            lotti={getRunningPollastra(selectedPollaShed.farm, selectedPollaShed.shed)}
                                            onUpdate={onUpdate}
                                            onClose={() => setSelectedPollaShed(null)}
                                            hideProduzione={true}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
