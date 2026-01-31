import { GiFactory, GiRooster, GiNestEggs, GiChicken } from "react-icons/gi";
import { Barcode } from "lucide-react";

interface HomePageProps {
    onNavigate: (page: string) => void;
    onLogout: () => void;
}

export default function HomePage({ onNavigate, onLogout }: HomePageProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-8">
            {/* Title */}
            <h1 className="text-4xl font-bold text-gray-800 mb-12 text-center">
                Dashboard Principale
            </h1>

            {/* Grid of Buttons - Row 1: 3 items, Row 2: 2 items */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl w-full mb-12">
                {/* LETTURA CODICE */}
                <button
                    onClick={() => onNavigate("lettura_codice")}
                    className="flex flex-col items-center justify-center gap-4 p-8 h-40
                               bg-white rounded-2xl shadow-lg border-2 border-transparent
                               hover:border-indigo-400 hover:shadow-xl hover:scale-[1.02]
                               transition-all duration-200 group"
                >
                    <Barcode className="w-12 h-12 text-indigo-600 group-hover:scale-110 transition-transform" />
                    <span className="text-xl font-bold text-gray-700">LETTURA CODICE</span>
                </button>

                {/* INCUBATOIO */}
                <button
                    onClick={() => onNavigate("incubatoio")}
                    className="flex flex-col items-center justify-center gap-4 p-8 h-40
                               bg-white rounded-2xl shadow-lg border-2 border-transparent
                               hover:border-amber-400 hover:shadow-xl hover:scale-[1.02]
                               transition-all duration-200 group"
                >
                    <GiFactory className="w-12 h-12 text-amber-600 group-hover:scale-110 transition-transform" />
                    <span className="text-xl font-bold text-gray-700">INCUBATOIO</span>
                </button>

                {/* ALLEVAMENTI */}
                <button
                    onClick={() => onNavigate("allevamenti")}
                    className="flex flex-col items-center justify-center gap-4 p-8 h-40
                               bg-white rounded-2xl shadow-lg border-2 border-transparent
                               hover:border-rose-400 hover:shadow-xl hover:scale-[1.02]
                               transition-all duration-200 group"
                >
                    <GiRooster className="w-12 h-12 text-rose-600 group-hover:scale-110 transition-transform" />
                    <span className="text-xl font-bold text-gray-700">ALLEVAMENTI</span>
                </button>

                {/* UOVA */}
                <button
                    onClick={() => onNavigate("produzioni_uova")}
                    className="flex flex-col items-center justify-center gap-4 p-8 h-40
                               bg-white rounded-2xl shadow-lg border-2 border-transparent
                               hover:border-yellow-400 hover:shadow-xl hover:scale-[1.02]
                               transition-all duration-200 group"
                >
                    <GiNestEggs className="w-12 h-12 text-yellow-600 group-hover:scale-110 transition-transform" />
                    <span className="text-xl font-bold text-gray-700">UOVA</span>
                </button>

                {/* PULCINI */}
                <button
                    onClick={() => onNavigate("produzioni_pulcini")}
                    className="flex flex-col items-center justify-center gap-4 p-8 h-40
                               bg-white rounded-2xl shadow-lg border-2 border-transparent
                               hover:border-orange-400 hover:shadow-xl hover:scale-[1.02]
                               transition-all duration-200 group"
                >
                    <GiChicken className="w-12 h-12 text-orange-500 group-hover:scale-110 transition-transform" />
                    <span className="text-xl font-bold text-gray-700">PULCINI</span>
                </button>
            </div>

            {/* Exit Button */}
            <button
                className="text-gray-500 hover:text-gray-700 text-sm underline transition-colors"
                onClick={onLogout}
            >
                Esci
            </button>
        </div>
    );
}
