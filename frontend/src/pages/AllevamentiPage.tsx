import { useState, useEffect } from "react";
import { Settings, Dna, Activity } from "lucide-react";
import { GiRooster } from "react-icons/gi";
import { AllevamentiAPI } from "@/lib/api";
import type { Lotto, FarmStructure } from "@/types";
import { FarmStatusGrid } from "@/components/FarmStatusGrid";
import { AccasamentiTable } from "@/components/AccasamentiTable";
import { GeneticsSettingsTable } from "@/components/GeneticsSettingsTable";
import ResponsiveSidebar from "@/components/ResponsiveSidebar";

interface AllevamentiPageProps {
    onNavigate: (page: string) => void;
}

type Section = "stato" | "accasamenti" | "genetiche";

export default function AllevamentiPage({ onNavigate }: AllevamentiPageProps) {
    const [section, setSection] = useState<Section>("stato");
    const [lotti, setLotti] = useState<Lotto[]>([]);
    const [farmStructure, setFarmStructure] = useState<FarmStructure>({});
    const [loading, setLoading] = useState(true);

    // Fetch data on mount
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [lottiData, farmsData] = await Promise.all([
                    AllevamentiAPI.getLotti(),
                    AllevamentiAPI.getFarmStructure(),
                ]);
                setLotti(lottiData);
                setFarmStructure(farmsData);
            } catch (error) {
                console.error("Failed to fetch allevamenti data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Refresh data after CRUD
    const refreshData = async () => {
        const lottiData = await AllevamentiAPI.getLotti();
        setLotti(lottiData);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
            {/* SIDEBAR */}
            <ResponsiveSidebar
                title="Allevamenti"
                icon={<GiRooster className="w-8 h-8 text-red-600" />}
                onNavigateHome={() => onNavigate("home")}
                footerText={`${lotti.filter(l => l.Attivo).length} lotti attivi`}
            >
                <button
                    onClick={() => setSection("stato")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${section === "stato"
                        ? "bg-red-100 text-red-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                >
                    <Activity className="w-5 h-5" />
                    Stato Allevamenti
                </button>
                <button
                    onClick={() => setSection("accasamenti")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${section === "accasamenti"
                        ? "bg-red-100 text-red-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                >
                    <Settings className="w-5 h-5" />
                    Impostazioni Accasamenti
                </button>
                <button
                    onClick={() => setSection("genetiche")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${section === "genetiche"
                        ? "bg-red-100 text-red-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                >
                    <Dna className="w-5 h-5" />
                    Impostazioni Genetiche
                </button>
            </ResponsiveSidebar>

            {/* MAIN CONTENT */}
            <main className="flex-1 p-8 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    </div>
                ) : (
                    <>
                        {section === "stato" && (
                            <FarmStatusGrid
                                lotti={lotti}
                                farmStructure={farmStructure}
                                onUpdate={refreshData}
                            />
                        )}
                        {section === "accasamenti" && (
                            <AccasamentiTable
                                lotti={lotti}
                                farmStructure={farmStructure}
                                onUpdate={refreshData}
                            />
                        )}
                        {section === "genetiche" && (
                            <GeneticsSettingsTable />
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
