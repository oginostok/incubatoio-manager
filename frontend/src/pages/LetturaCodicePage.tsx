import { useState, useEffect } from "react";
import { Search, Loader2, Barcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, BarChart, Bar, ComposedChart } from "recharts";
import type { Lotto } from "@/types";
import { API_BASE_URL } from "@/lib/config";
import ResponsiveSidebar from "@/components/ResponsiveSidebar";

interface LetturaCodicePageProps {
    onNavigate: (page: string) => void;
}

interface SearchResult {
    found: boolean;
    lotto: Lotto;
    user_id: string;
}

interface ProductionData {
    anno: number;
    settimana: number;
    uova: number;
    prodotto: string;
}

const API_BASE = API_BASE_URL;

// Product base colors - OFFICIAL COLORS from RULES.md
const PRODUCT_CHART_COLORS: Record<string, string> = {
    'Granpollo': '#22c55e',     // green-500
    'Pollo70': '#3b82f6',       // blue-500
    'Color Yeald': '#ef4444',   // red-500
    'Ross': '#f97316',          // orange-500
};

function getProductChartColor(prodotto: string): string {
    return PRODUCT_CHART_COLORS[prodotto.trim()] || '#6b7280'; // gray-500 fallback
}

export default function LetturaCodicePage({ onNavigate }: LetturaCodicePageProps) {
    const [codice, setCodice] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SearchResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [production, setProduction] = useState<ProductionData[]>([]);
    const [weeklyData, setWeeklyData] = useState<any[]>([]);
    const [loadingProduction, setLoadingProduction] = useState(false);

    // Fetch production and weekly data when result changes
    useEffect(() => {
        if (result?.lotto?.id) {
            fetchProduction(result.lotto.id);
            fetchWeeklyData(result.lotto.id);
        } else {
            setProduction([]);
            setWeeklyData([]);
        }
    }, [result]);

    const fetchProduction = async (lottoId: number) => {
        setLoadingProduction(true);
        try {
            const response = await fetch(`${API_BASE}/api/allevamenti/lotti/${lottoId}/production`);
            if (response.ok) {
                const data = await response.json();
                setProduction(data.production || []);
            }
        } catch (error) {
            console.error("Failed to fetch production", error);
        } finally {
            setLoadingProduction(false);
        }
    };

    const fetchWeeklyData = async (lottoId: number) => {
        try {
            const response = await fetch(`${API_BASE}/api/allevamenti/lotti/${lottoId}/weekly-data`);
            if (response.ok) {
                const data = await response.json();
                setWeeklyData(data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch weekly data", error);
        }
    };

    const handleRicerca = async () => {
        if (!codice.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch(`${API_BASE}/api/allevamenti/lotti/search/${encodeURIComponent(codice.trim())}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Errore nella ricerca");
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Errore sconosciuto");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRicerca();
        }
    };

    // Helper to format the lotto data for display
    const formatLottoData = (lotto: Lotto) => {
        return [
            { label: "ID Database", value: lotto.id },
            { label: "Allevamento", value: lotto.Allevamento },
            { label: "Capannone", value: lotto.Capannone },
            { label: "Genetica Gallina", value: lotto.Razza },
            { label: "Genetica Gallo", value: lotto.Razza_Gallo || "-" },
            { label: "Prodotto", value: lotto.Prodotto },
            { label: "Capi", value: lotto.Capi?.toLocaleString('it-IT') },
            { label: "Anno Inizio", value: lotto.Anno_Start },
            { label: "Settimana Inizio", value: lotto.Sett_Start },
            { label: "Fine Ciclo Prevista", value: lotto.Data_Fine_Prevista || "-" },
            { label: "Curva Produzione", value: lotto.Curva_Produzione || "-" },
            { label: "Stato", value: lotto.Attivo ? "Attivo" : "Non Attivo" },
        ];
    };

    // Format chart data - filter from week 24 (age-based production start)
    // Calculate age for each data point and filter to show from age 24
    const chartData = production
        .map(p => {
            // Calculate age: (production week - start week) accounting for year wrap
            const startYearWeeks = result?.lotto?.Anno_Start ? result.lotto.Anno_Start * 52 + result.lotto.Sett_Start : 0;
            const dataYearWeeks = p.anno * 52 + p.settimana;
            const age = dataYearWeeks - startYearWeeks;
            // Find matching weekly data for uova_incubabili
            const weeklyMatch = weeklyData.find(w => w.eta_animali === age);
            return {
                label: `${p.anno}/${String(p.settimana).padStart(2, '0')}`,
                uova: p.uova,
                uovaIncubabili: weeklyMatch?.uova_incubabili || null,
                eta: age
            };
        })
        .filter(p => p.eta >= 24); // Only show from age 24 (start of production)

    // Mortality chart data - from week 19
    const mortalityData = weeklyData
        .filter(w => w.eta_animali >= 19)
        .map(w => ({
            label: `Età ${w.eta_animali}`,
            gallineMorte: w.galline_morte || 0,
            galliMorti: w.galli_morti || 0,
            eta: w.eta_animali
        }))
        .sort((a, b) => a.eta - b.eta);

    // Custom tooltip component
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        const data = payload[0].payload;
        return (
            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                <p className="font-semibold text-gray-800">Settimana {label}</p>
                <p className="text-sm text-gray-600">Previsione: <span className="font-medium">{data.uova?.toLocaleString('it-IT')}</span></p>
                {data.uovaIncubabili && <p className="text-sm text-gray-600">Uova Inc.: <span className="font-medium">{data.uovaIncubabili?.toLocaleString('it-IT')}</span></p>}
                <p className="text-sm text-gray-600">Età Galline: <span className="font-medium">{data.eta}</span></p>
            </div>
        );
    };

    const MortalityTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        return (
            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                <p className="font-semibold text-gray-800">{label}</p>
                {payload.map((entry: any, idx: number) => (
                    <p key={idx} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: <span className="font-medium">{entry.value}</span>
                    </p>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
            {/* SIDEBAR */}
            <ResponsiveSidebar
                title="Lettura Codice"
                icon={<Barcode className="w-8 h-8 text-indigo-600" />}
                onNavigateHome={() => onNavigate("home")}
                footerText="Legge le informazioni del codice inserito"
            >
                <button
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all bg-indigo-100 text-indigo-700 font-medium"
                >
                    <Search className="w-5 h-5" />
                    Ricerca Codice
                </button>
            </ResponsiveSidebar>

            {/* MAIN CONTENT */}
            <main className="flex-1 p-8 overflow-auto">
                {/* Search Card */}
                <Card className="max-w-4xl mx-auto mb-6">
                    <CardHeader className="text-center pb-4">
                        <Barcode className="w-12 h-12 mx-auto text-indigo-500 mb-2" />
                        <CardTitle className="text-xl">Lettura codice</CardTitle>
                        <p className="text-gray-600 text-sm">
                            Visualizza informazioni e produzione del ciclo
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Search Input */}
                        <div className="flex gap-3">
                            <Input
                                type="text"
                                placeholder="Inserisci codice (es. 1 o 1TON2025JA87)..."
                                value={codice}
                                onChange={(e) => setCodice(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="text-lg h-12 text-center font-mono uppercase flex-1"
                            />
                            <Button
                                onClick={handleRicerca}
                                className="h-12 px-6 gap-2"
                                disabled={!codice.trim() || loading}
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Search className="w-5 h-5" />
                                )}
                                Ricerca
                            </Button>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                                <p className="text-red-600 font-medium">{error}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Results - Two Columns */}
                {result && result.found && (
                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* LEFT: Production Chart */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Produzione Uova</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loadingProduction ? (
                                    <div className="flex items-center justify-center h-64">
                                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                    </div>
                                ) : chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <ComposedChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis
                                                dataKey="label"
                                                tick={{ fontSize: 10, fill: '#6b7280' }}
                                                interval="preserveStartEnd"
                                                stroke="#9ca3af"
                                            />
                                            <YAxis
                                                tick={{ fontSize: 10, fill: '#6b7280' }}
                                                tickFormatter={(value) => value.toLocaleString('it-IT')}
                                                stroke="#9ca3af"
                                                domain={[(dataMin: number) => Math.floor(dataMin * 0.5), (dataMax: number) => Math.ceil(dataMax * 1.1)]}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                            <Area
                                                type="monotone"
                                                dataKey="uova"
                                                name="Previsione da storico"
                                                stroke={getProductChartColor(result.lotto.Prodotto)}
                                                fill={getProductChartColor(result.lotto.Prodotto)}
                                                fillOpacity={0.6}
                                                strokeWidth={2}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="uovaIncubabili"
                                                name="Uova incubabili"
                                                stroke="#8b5cf6"
                                                strokeWidth={2}
                                                dot={{ r: 3 }}
                                                connectNulls={false}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-64 text-gray-400">
                                        Nessun dato di produzione disponibile
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* RIGHT: Lotto Details Table */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center justify-between">
                                    <span>Dettagli Lotto</span>
                                    <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{result.user_id}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <tbody className="divide-y">
                                            {formatLottoData(result.lotto).map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 text-sm font-medium text-gray-600">{row.label}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-900">{row.value}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Mortality Chart - Full Width Below */}
                {result && result.found && mortalityData.length > 0 && (
                    <div className="max-w-6xl mx-auto mt-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Mortalità</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={mortalityData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fontSize: 10, fill: '#6b7280' }}
                                            stroke="#9ca3af"
                                        />
                                        <YAxis
                                            tick={{ fontSize: 10, fill: '#6b7280' }}
                                            stroke="#9ca3af"
                                        />
                                        <Tooltip content={<MortalityTooltip />} />
                                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                        <Bar
                                            dataKey="gallineMorte"
                                            name="Galline Morte"
                                            fill="#f87171"
                                            radius={[2, 2, 0, 0]}
                                        />
                                        <Bar
                                            dataKey="galliMorti"
                                            name="Galli Morti"
                                            fill="#60a5fa"
                                            radius={[2, 2, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}
