import { useState } from "react";
import { ArrowLeft, Table2 } from "lucide-react";
import { GiChicken } from "react-icons/gi";
import { Button } from "@/components/ui/button";
import BirthRatesTable from "@/components/BirthRatesTable";
import PurchaseBirthRatesTable from "@/components/PurchaseBirthRatesTable";
import GranpolloPlanningTable from "@/components/GranpolloPlanningTable";
import Pollo70PlanningTable from "@/components/Pollo70PlanningTable";
import ColorYealdPlanningTable from "@/components/ColorYealdPlanningTable";
import RossPlanningTable from "@/components/RossPlanningTable";

interface PulciniPageProps {
    onNavigate: (page: string) => void;
}

// Prodotti con colori definiti in RULES.md
const PRODUCTS = [
    { id: "granpollo", label: "Granpollo", bgColor: "bg-granpollo-bright", hoverBg: "hover:bg-green-600", textColor: "text-white" },
    { id: "pollo70", label: "Pollo70", bgColor: "bg-pollo70-bright", hoverBg: "hover:bg-blue-600", textColor: "text-white" },
    { id: "colorYeald", label: "Color Yeald", bgColor: "bg-colorYeald-bright", hoverBg: "hover:bg-red-600", textColor: "text-white" },
    { id: "ross", label: "Ross", bgColor: "bg-ross-bright", hoverBg: "hover:bg-orange-600", textColor: "text-white" },
] as const;

type Section = "granpollo" | "pollo70" | "colorYeald" | "ross" | "tabelleNascita";

export default function PulciniPage({ onNavigate }: PulciniPageProps) {
    const [section, setSection] = useState<Section>("granpollo");
    const [showTooltips, setShowTooltips] = useState(true);
    const renderContent = () => {
        if (section === "tabelleNascita") {
            return (
                <>
                    <PurchaseBirthRatesTable />
                    <BirthRatesTable />
                </>
            );
        }

        if (section === "granpollo") {
            return <GranpolloPlanningTable showTooltips={showTooltips} />;
        }

        if (section === "pollo70") {
            return <Pollo70PlanningTable showTooltips={showTooltips} />;
        }

        if (section === "colorYeald") {
            return <ColorYealdPlanningTable showTooltips={showTooltips} />;
        }

        if (section === "ross") {
            return <RossPlanningTable showTooltips={showTooltips} />;
        }

        const product = PRODUCTS.find(p => p.id === section);
        return (
            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{product?.label}</h2>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <p className="text-blue-700 text-lg">
                            ℹ️ Area in costruzione.
                        </p>
                    </div>
                </div>
            </div>
        );
    };

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
                    <GiChicken className="w-8 h-8 text-orange-500" />
                    <h1 className="text-xl font-bold text-gray-800">Pulcini</h1>
                </div>

                {/* Navigation - Product buttons */}
                <nav className="flex-1 space-y-2">
                    {PRODUCTS.map((product) => (
                        <button
                            key={product.id}
                            onClick={() => setSection(product.id)}
                            className={`w-full px-4 py-3 rounded-xl text-left font-medium transition-all ${product.bgColor} ${product.hoverBg} ${product.textColor} ${section === product.id
                                ? "ring-2 ring-offset-2 ring-gray-400 shadow-lg"
                                : "shadow-sm opacity-90 hover:opacity-100"
                                }`}
                        >
                            {product.label}
                        </button>
                    ))}

                    {/* Separator */}
                    <div className="border-t border-gray-300 my-4"></div>

                    {/* Tabelle di Nascita */}
                    <button
                        onClick={() => setSection("tabelleNascita")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${section === "tabelleNascita"
                            ? "bg-gray-700 text-white font-medium shadow-lg"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                    >
                        <Table2 className="w-5 h-5" />
                        Tabelle di Nascita
                    </button>

                    {/* Separator */}
                    <div className="border-t border-gray-300 my-4"></div>

                    {/* Checkbox Visualizza Info */}
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-800 px-2">
                        <input
                            type="checkbox"
                            checked={showTooltips}
                            onChange={(e) => setShowTooltips(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Visualizza info
                    </label>
                </nav>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 p-8">
                {renderContent()}
            </main>
        </div>
    );
}
