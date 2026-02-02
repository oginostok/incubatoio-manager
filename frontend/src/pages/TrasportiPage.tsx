import { Construction } from "lucide-react";
import { FaTruck } from "react-icons/fa";
import ResponsiveSidebar from "@/components/ResponsiveSidebar";

interface TrasportiPageProps {
    onNavigate: (page: string) => void;
}

export default function TrasportiPage({ onNavigate }: TrasportiPageProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
            {/* SIDEBAR */}
            <ResponsiveSidebar
                title="Trasporti"
                icon={<FaTruck className="w-8 h-8 text-teal-600" />}
                onNavigateHome={() => onNavigate("home")}
                footerText="Sezioni in arrivo"
            >
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">
                        Sezioni in arrivo
                    </p>
                </div>
            </ResponsiveSidebar>

            {/* MAIN CONTENT */}
            <main className="flex-1 p-8">
                <div className="flex flex-col items-center justify-center h-full">
                    <Construction className="w-24 h-24 text-yellow-500 mb-6" />
                    <h2 className="text-4xl font-bold text-gray-800 mb-4">
                        Trasporti
                    </h2>
                    <p className="text-xl text-gray-600 mb-2">
                        Pagina in costruzione
                    </p>
                    <p className="text-gray-500">
                        Questa sezione sarà disponibile a breve
                    </p>
                </div>
            </main>
        </div>
    );
}
