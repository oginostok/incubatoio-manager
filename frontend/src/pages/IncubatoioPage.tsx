import { useState, useCallback } from "react";
import { Package, Timer, Egg, FileText, Truck } from "lucide-react";
import { GiFactory } from "react-icons/gi";
import EggStorageTable from "@/components/EggStorageTable";
import EggStorageTotalsTable from "@/components/EggStorageTotalsTable";
import ResponsiveSidebar from "@/components/ResponsiveSidebar";
import IncubationTable from "@/components/IncubationTable";
import RegistroIncubazioniTable from "@/components/RegistroIncubazioniTable";
import TrasferimentoTable from "@/components/TrasferimentoTable";
import SchiusaPulciniTable from "@/components/SchiusaPulciniTable";

interface IncubatoioPageProps {
    onNavigate: (page: string) => void;
}

type Section = "magazzino" | "incubazione" | "registro" | "trasferimento" | "schiusa";

export default function IncubatoioPage({ onNavigate }: IncubatoioPageProps) {
    const [section, setSection] = useState<Section>("magazzino");
    const [eggStorageRefreshTrigger, setEggStorageRefreshTrigger] = useState(0);

    // Callback to trigger refresh of egg storage totals when T014 data changes
    const handleEggStorageChange = useCallback(() => {
        setEggStorageRefreshTrigger(prev => prev + 1);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
            {/* SIDEBAR */}
            <ResponsiveSidebar
                title="Incubatoio"
                icon={<GiFactory className="w-8 h-8 text-amber-600" />}
                onNavigateHome={() => onNavigate("home")}
            >
                <button
                    onClick={() => setSection("magazzino")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${section === "magazzino"
                        ? "bg-amber-100 text-amber-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                >
                    <Package className="w-5 h-5" />
                    Magazzino Uova
                </button>
                <button
                    onClick={() => setSection("incubazione")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${section === "incubazione"
                        ? "bg-amber-100 text-amber-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                >
                    <Timer className="w-5 h-5" />
                    Incubazione Uova
                </button>
                <button
                    onClick={() => setSection("registro")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${section === "registro"
                        ? "bg-amber-100 text-amber-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                >
                    <FileText className="w-5 h-5" />
                    Registro Incubazioni
                </button>
                <button
                    onClick={() => setSection("trasferimento")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${section === "trasferimento"
                        ? "bg-amber-100 text-amber-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                >
                    <Truck className="w-5 h-5" />
                    Trasferimento
                </button>
                <button
                    onClick={() => setSection("schiusa")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${section === "schiusa"
                        ? "bg-amber-100 text-amber-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                >
                    <Egg className="w-5 h-5" />
                    Schiusa Pulcini
                </button>
            </ResponsiveSidebar>

            {/* MAIN CONTENT */}
            <main className="flex-1 p-8 overflow-auto min-[1920px]:ml-0 ml-0">
                {section === "magazzino" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 min-[1920px]:grid-cols-4 gap-6">
                            <div className="min-[1920px]:col-span-3">
                                <EggStorageTable onDataChange={handleEggStorageChange} />
                            </div>
                            <div className="min-[1920px]:col-span-1">
                                <EggStorageTotalsTable refreshTrigger={eggStorageRefreshTrigger} />
                            </div>
                        </div>
                    </div>
                )}
                {section === "incubazione" && (
                    <IncubationTable />
                )}
                {section === "registro" && (
                    <RegistroIncubazioniTable />
                )}
                {section === "trasferimento" && (
                    <TrasferimentoTable />
                )}
                {section === "schiusa" && (
                    <SchiusaPulciniTable />
                )}
            </main>
        </div>
    );
}
