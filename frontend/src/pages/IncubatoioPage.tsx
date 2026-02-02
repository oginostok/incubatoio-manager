import { useState } from "react";
import { Package, Timer, Egg, FileText } from "lucide-react";
import { GiFactory } from "react-icons/gi";
import EggStorageTable from "@/components/EggStorageTable";
import EggStorageTotalsTable from "@/components/EggStorageTotalsTable";
import ResponsiveSidebar from "@/components/ResponsiveSidebar";
import IncubationTable from "@/components/IncubationTable";
import RegistroIncubazioniTable from "@/components/RegistroIncubazioniTable";

interface IncubatoioPageProps {
    onNavigate: (page: string) => void;
}

type Section = "magazzino" | "incubazione" | "registro" | "schiusa";

export default function IncubatoioPage({ onNavigate }: IncubatoioPageProps) {
    const [section, setSection] = useState<Section>("magazzino");

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
                                <EggStorageTable />
                            </div>
                            <div className="min-[1920px]:col-span-1">
                                <EggStorageTotalsTable />
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
                {section === "schiusa" && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Schiusa Pulcini</h2>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                <p className="text-blue-700 text-lg">
                                    ℹ️ Area in costruzione.
                                </p>
                                <p className="text-gray-600 mt-2">
                                    Impostazione dati reali di nascita per incubazioni avvenute 3 settimane fa
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
