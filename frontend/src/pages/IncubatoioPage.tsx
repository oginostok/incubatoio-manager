import { useState } from "react";
import { ArrowLeft, Settings } from "lucide-react";
import { GiFactory } from "react-icons/gi";
import { Button } from "@/components/ui/button";

interface IncubatoioPageProps {
    onNavigate: (page: string) => void;
}

type Section = "gestione" | "impostazioni";

export default function IncubatoioPage({ onNavigate }: IncubatoioPageProps) {
    const [section, setSection] = useState<Section>("gestione");

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
            {/* SIDEBAR */}
            <aside className="w-64 bg-white/80 backdrop-blur-sm border-r border-gray-200 p-6 flex flex-col">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => onNavigate("home")}
                    className="mb-8 justify-start gap-2 text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Torna alla Home
                </Button>

                {/* Logo/Title */}
                <div className="flex items-center gap-3 mb-8">
                    <GiFactory className="w-8 h-8 text-amber-600" />
                    <h1 className="text-xl font-bold text-gray-800">Incubatoio</h1>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => setSection("gestione")}
                        className={`w-full px-4 py-3 rounded-xl text-left transition-all ${section === "gestione"
                            ? "bg-amber-100 text-amber-700 font-medium"
                            : "text-gray-600 hover:bg-gray-100"
                            }`}
                    >
                        Gestione Incubatoio
                    </button>
                    <button
                        onClick={() => setSection("impostazioni")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${section === "impostazioni"
                            ? "bg-amber-100 text-amber-700 font-medium"
                            : "text-gray-600 hover:bg-gray-100"
                            }`}
                    >
                        <Settings className="w-5 h-5" />
                        Impostazioni
                    </button>
                </nav>

                {/* Footer */}
                <div className="text-xs text-gray-400 mt-auto pt-4 border-t">
                    Area in costruzione
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 p-8 overflow-auto">
                {section === "gestione" && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Gestione Incubatoio</h2>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                <p className="text-blue-700 text-lg">
                                    ℹ️ Area in costruzione.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                {section === "impostazioni" && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Impostazioni</h2>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                <p className="text-blue-700 text-lg">
                                    ℹ️ Area in costruzione.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
