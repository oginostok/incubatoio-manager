import { useState } from "react";
import type { Lotto, FarmStructure } from "@/types";
import { ShedDetailPanel } from "./ShedDetailPanel";

interface FarmStatusGridProps {
    lotti: Lotto[];
    farmStructure: FarmStructure;
    onUpdate: () => void;
}

// Calculate age in weeks from start year/week
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

export function FarmStatusGrid({ lotti, farmStructure, onUpdate }: FarmStatusGridProps) {
    const [selectedShed, setSelectedShed] = useState<{ farm: string; shed: number } | null>(null);

    // Get active lotti for a specific farm/shed
    const getActiveLotti = (farm: string, shed: number): Lotto[] => {
        return lotti.filter(l => {
            if (!l.Attivo || l.Allevamento !== farm) return false;
            const cap = String(l.Capannone);
            const shedStr = String(shed);
            // Exact match or starts with (e.g., 1 -> 1A, 1B)
            if (cap === shedStr) return true;
            if (cap.startsWith(shedStr) && cap.length > shedStr.length && !/^\d/.test(cap[shedStr.length])) {
                return true;
            }
            return false;
        });
    };

    // Check if shed is productive (age >= 24 weeks)
    const isProductive = (farm: string, shed: number): boolean => {
        const activeLotti = getActiveLotti(farm, shed);
        return activeLotti.some(l => calculateAgeWeeks(l.Anno_Start, l.Sett_Start) >= 24);
    };

    const sortedFarms = Object.keys(farmStructure).sort();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Situazione Allevamenti</h2>
                <p className="text-xs text-gray-400">V001</p>
                <p className="text-gray-500">Clicca su un capannone verde per vedere i dettagli</p>
            </div>

            {/* Farm Cards - Two Separate Columns for Independent Vertical Expansion */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Left Column */}
                <div className="flex flex-col gap-6">
                    {sortedFarms.filter((_, index) => index % 2 === 0).map(farm => {
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

                                {/* Shed Buttons */}
                                <div className="flex flex-wrap gap-3">
                                    {sheds.map(shed => {
                                        const productive = isProductive(farm, shed);
                                        const isSelected = selectedShed?.farm === farm && selectedShed?.shed === shed;

                                        return (
                                            <button
                                                key={shed}
                                                onClick={() => {
                                                    if (productive) {
                                                        if (isSelected) {
                                                            setSelectedShed(null);
                                                        } else {
                                                            setSelectedShed({ farm, shed });
                                                        }
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

                                {/* Shed Detail Panel */}
                                {currentFarmSelected && selectedShed && (
                                    <div className="mt-6 pt-6 border-t border-gray-100">
                                        <ShedDetailPanel
                                            lotti={getActiveLotti(selectedShed.farm, selectedShed.shed).filter(
                                                l => calculateAgeWeeks(l.Anno_Start, l.Sett_Start) >= 24
                                            )}
                                            onUpdate={onUpdate}
                                            onClose={() => setSelectedShed(null)}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-6">
                    {sortedFarms.filter((_, index) => index % 2 === 1).map(farm => {
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

                                {/* Shed Buttons */}
                                <div className="flex flex-wrap gap-3">
                                    {sheds.map(shed => {
                                        const productive = isProductive(farm, shed);
                                        const isSelected = selectedShed?.farm === farm && selectedShed?.shed === shed;

                                        return (
                                            <button
                                                key={shed}
                                                onClick={() => {
                                                    if (productive) {
                                                        if (isSelected) {
                                                            setSelectedShed(null);
                                                        } else {
                                                            setSelectedShed({ farm, shed });
                                                        }
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

                                {/* Shed Detail Panel */}
                                {currentFarmSelected && selectedShed && (
                                    <div className="mt-6 pt-6 border-t border-gray-100">
                                        <ShedDetailPanel
                                            lotti={getActiveLotti(selectedShed.farm, selectedShed.shed).filter(
                                                l => calculateAgeWeeks(l.Anno_Start, l.Sett_Start) >= 24
                                            )}
                                            onUpdate={onUpdate}
                                            onClose={() => setSelectedShed(null)}
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
