import { useState, useEffect } from "react";
import { Settings, Dna, Activity, ClipboardList, Bird } from "lucide-react";
import { GiRooster } from "react-icons/gi";
import { AllevamentiAPI } from "@/lib/api";
import type { Lotto, FarmStructure } from "@/types";
import { FarmStatusGrid } from "@/components/FarmStatusGrid";
import { AccasamentiTable } from "@/components/AccasamentiTable";
import { GeneticsSettingsTable } from "@/components/GeneticsSettingsTable";
import { SchedaSettimanale } from "@/components/SchedaSettimanale";
import PollastraFarmsSettings from "@/components/PollastraFarmsSettings";
import { PollastraFarmsAPI } from "@/lib/api";
import ResponsiveSidebar from "@/components/ResponsiveSidebar";

interface AllevamentiPageProps {
    onNavigate: (page: string) => void;
}

type Section = "stato" | "accasamenti" | "genetiche" | "scheda_settimanale" | "pollastra_accasamenti";

export default function AllevamentiPage({ onNavigate }: AllevamentiPageProps) {
    const [section, setSection] = useState<Section>("stato");
    const [lotti, setLotti] = useState<Lotto[]>([]);
    const [farmStructure, setFarmStructure] = useState<FarmStructure>({});
    const [pollastraStructure, setPollastraStructure] = useState<FarmStructure>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [lottiData, farmsData, pollastraData] = await Promise.all([
                    AllevamentiAPI.getLotti(),
                    AllevamentiAPI.getFarmStructure(),
                    PollastraFarmsAPI.getAll(),
                ]);
                setLotti(lottiData);
                setFarmStructure(farmsData);
                setPollastraStructure(pollastraData.structure);
            } catch (error) {
                console.error("Failed to fetch allevamenti data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const refreshPollastraFarms = async () => {
        try {
            const data = await PollastraFarmsAPI.getAll();
            setPollastraStructure(data.structure);
        } catch (error) {
            console.error("Failed to refresh pollastra farms", error);
        }
    };

    const refreshData = async () => {
        const lottiData = await AllevamentiAPI.getLotti();
        setLotti(lottiData);
    };

    const normalLotti = lotti.filter(l => !l.Fase || l.Fase === null);
    const pollastralotti = lotti.filter(l => l.Fase === 'pollastra');

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
                    onClick={() => setSection("pollastra_accasamenti")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${section === "pollastra_accasamenti"
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                >
                    <Bird className="w-5 h-5" />
                    Impostazioni Pollastra
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

                <div className="my-3 border-t border-gray-200" />

                <button
                    onClick={() => setSection("scheda_settimanale")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${section === "scheda_settimanale"
                        ? "bg-red-100 text-red-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                >
                    <ClipboardList className="w-5 h-5" />
                    Scheda Settimanale
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
                                pollastraStructure={pollastraStructure}
                                onUpdate={refreshData}
                            />
                        )}
                        {section === "accasamenti" && (
                            <AccasamentiTable
                                lotti={normalLotti}
                                farmStructure={farmStructure}
                                onUpdate={refreshData}
                            />
                        )}
                        {section === "pollastra_accasamenti" && (
                            <div>
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-1">Impostazioni Pollastra</h2>
                                    <p className="text-gray-500 text-sm">Gestione allevamenti e accasamenti pollastra.</p>
                                </div>
                                <PollastraFarmsSettings onChanged={refreshPollastraFarms} />
                                <AccasamentiTable
                                    lotti={pollastralotti}
                                    farmStructure={pollastraStructure}
                                    onUpdate={refreshData}
                                    fase="pollastra"
                                    tableLabel="T010"
                                />
                            </div>
                        )}
                        {section === "genetiche" && (
                            <GeneticsSettingsTable />
                        )}
                        {section === "scheda_settimanale" && (
                            <SchedaSettimanale />
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
