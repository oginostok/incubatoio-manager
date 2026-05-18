import { useEffect, useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import ResponsiveSidebar from "@/components/ResponsiveSidebar";

interface SettingsPageProps {
    onNavigate: (page: string) => void;
}

interface CycleSettings {
    eta_inizio_ciclo: number;
    eta_fine_ciclo: number;
    auto_assign_sales: boolean;
}

export default function SettingsPage({ onNavigate }: SettingsPageProps) {
    const [settings, setSettings] = useState<CycleSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/settings/cycle`)
            .then(r => r.json())
            .then(d => setSettings(d))
            .catch(e => setError(String(e)))
            .finally(() => setLoading(false));
    }, []);

    const toggleAutoAssign = async () => {
        if (!settings) return;
        const next = !settings.auto_assign_sales;
        setSaving(true);
        setError(null);
        const previous = settings;
        setSettings({ ...settings, auto_assign_sales: next });
        try {
            const r = await fetch(`${API_BASE_URL}/api/settings/cycle`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ auto_assign_sales: next }),
            });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const updated = await r.json();
            setSettings(updated);
        } catch (e) {
            setSettings(previous);
            setError("Impossibile salvare. Riprova.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
            <ResponsiveSidebar
                title="Impostazioni"
                icon={<SettingsIcon className="w-8 h-8 text-gray-700" />}
                onNavigateHome={() => onNavigate("home")}
                footerText="Configurazione globale"
            >
                <div className="px-4 py-3 text-sm text-gray-500">
                    Configurazione del sistema. Le modifiche hanno effetto immediato.
                </div>
            </ResponsiveSidebar>

            <main className="flex-1 p-8 overflow-auto">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Impostazioni</h2>
                <p className="text-gray-600 mb-8">Configurazione globale del sistema.</p>

                {loading ? (
                    <div className="text-gray-500">Caricamento...</div>
                ) : !settings ? (
                    <div className="text-red-600">Errore: {error || "settings non disponibili"}</div>
                ) : (
                    <div className="max-w-3xl space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-start justify-between gap-6 mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">
                                        Assegna automaticamente le vendite
                                    </h3>
                                </div>
                                <button
                                    onClick={toggleAutoAssign}
                                    disabled={saving}
                                    role="switch"
                                    aria-checked={settings.auto_assign_sales}
                                    className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 ${
                                        settings.auto_assign_sales ? "bg-green-500" : "bg-gray-300"
                                    } ${saving ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow ring-0 transition-transform ${
                                            settings.auto_assign_sales ? "translate-x-5" : "translate-x-0"
                                        }`}
                                    />
                                </button>
                            </div>
                            <div className="text-sm text-gray-700 space-y-2">
                                <p>
                                    Se <strong>attivo</strong>: il sistema assegna automaticamente le uova in vendita non
                                    attribuite manualmente, partendo dagli allevamenti con età tra <strong>30 e 45 settimane</strong>
                                    {" "}(quelli in piena produzione), preferendo i più giovani. Se la finestra 30–45 non basta,
                                    il sistema attinge anche dagli altri allevamenti (sempre dal più giovane al più anziano).
                                </p>
                                <p>
                                    Se <strong>spento</strong>: le vendite vanno inserite manualmente, prodotto per prodotto,
                                    nel riepilogo settimanale (T002 → sezione “Dettaglio Vendite”). Le quote non assegnate
                                    vengono sottratte solo dal totale netto, senza essere attribuite a uno specifico allevamento.
                                </p>
                            </div>
                            {error && (
                                <div className="mt-3 text-sm text-red-600">{error}</div>
                            )}
                            <div className="mt-4 text-xs text-gray-500">
                                Stato attuale:{" "}
                                <span className={`font-semibold ${settings.auto_assign_sales ? "text-green-700" : "text-gray-600"}`}>
                                    {settings.auto_assign_sales ? "ON — assegnazione automatica attiva" : "OFF — solo assegnazioni manuali"}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
