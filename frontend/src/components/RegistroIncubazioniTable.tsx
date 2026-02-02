import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

interface IncubationBatch {
    id: number;
    prodotto: string;
    nome: string;
    origine: string;
    uova_partita: number;
    uova_utilizzate: number;
    eta: number;
    storico_override: number | null;
    egg_storage_id: number;
}

interface Incubation {
    id: number;
    data_incubazione: string;
    data_schiusa: string;
    pre_incubazione_ore: number;
    partenza_macchine: string;
    operatore: string;
    incubatrici: string;
    richiesta_granpollo: number;
    richiesta_pollo70: number;
    richiesta_color_yeald: number;
    richiesta_ross: number;
    committed: boolean;
    batches: IncubationBatch[];
}

const PRODUCT_COLORS: Record<string, string> = {
    "Granpollo": "bg-granpollo-bright text-white",
    "Pollo70": "bg-pollo70-bright text-white",
    "Color Yeald": "bg-colorYeald-bright text-white",
    "Ross": "bg-ross-bright text-white"
};

const PRODUCT_ORDER = ["Granpollo", "Pollo70", "Color Yeald", "Ross"];

const formatNumber = (num: number): string => {
    return num.toLocaleString("it-IT", { useGrouping: true });
};

const formatDateLong = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("it-IT", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
};

export default function RegistroIncubazioniTable() {
    const [incubations, setIncubations] = useState<Incubation[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        fetchIncubations();
    }, []);

    const fetchIncubations = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/incubazioni`);
            if (response.ok) {
                const data = await response.json();
                // Filter only committed incubations
                setIncubations(data.filter((inc: Incubation) => inc.committed));
            }
        } catch (error) {
            console.error("Failed to fetch incubations", error);
        } finally {
            setLoading(false);
        }
    };

    const getStorico = (storico_override: number | null): number => {
        return storico_override ?? 82;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                        <FileText className="w-6 h-6 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Registro Incubazioni</h2>
                </div>
                <span className="text-sm text-gray-500">{incubations.length} incubazioni registrate</span>
            </div>

            {/* Registry List */}
            {incubations.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 text-lg">Nessuna incubazione nel registro</p>
                        <p className="text-gray-500 text-sm mt-1">
                            Le incubazioni appariranno qui dopo essere state salvate
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {incubations.map(incubation => {
                        const totalUova = incubation.batches.reduce(
                            (sum, b) => sum + (b.uova_utilizzate || 0), 0
                        );
                        const totalPulcini = incubation.batches.reduce((sum, b) => {
                            const storico = getStorico(b.storico_override);
                            return sum + Math.round((b.uova_utilizzate || 0) * (storico / 100));
                        }, 0);

                        // Calculate predicted animals per product
                        const previstiPerProdotto = incubation.batches.reduce((acc, b) => {
                            const storico = getStorico(b.storico_override);
                            const previsti = Math.round((b.uova_utilizzate || 0) * (storico / 100));
                            acc[b.prodotto] = (acc[b.prodotto] || 0) + previsti;
                            return acc;
                        }, {} as Record<string, number>);

                        // Calculate difference (previsti - richiesti)
                        const diffGranpollo = (previstiPerProdotto["Granpollo"] || 0) - (incubation.richiesta_granpollo || 0);
                        const diffPollo70 = (previstiPerProdotto["Pollo70"] || 0) - (incubation.richiesta_pollo70 || 0);
                        const diffColorYeald = (previstiPerProdotto["Color Yeald"] || 0) - (incubation.richiesta_color_yeald || 0);
                        const diffRoss = (previstiPerProdotto["Ross"] || 0) - (incubation.richiesta_ross || 0);

                        return (
                            <div
                                key={incubation.id}
                                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                            >
                                {/* Summary Row */}
                                <div
                                    onClick={() => setExpandedId(expandedId === incubation.id ? null : incubation.id)}
                                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-800">
                                                Incubazione del {formatDateLong(incubation.data_incubazione)} - Schiusa del {formatDateLong(incubation.data_schiusa)}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Uova <span className="font-mono font-semibold">[{formatNumber(totalUova)}]</span> -
                                                Pulcini <span className="font-mono font-semibold text-green-700">[{formatNumber(totalPulcini)}]</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {expandedId === incubation.id ? (
                                                <ChevronUp className="w-5 h-5 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-gray-400" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedId === incubation.id && (
                                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                                        {/* Incubation Details */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4 bg-white p-3 rounded-lg">
                                            <div>
                                                <span className="text-gray-500">Pre-incubazione:</span>
                                                <span className="ml-2 font-medium">{incubation.pre_incubazione_ore || 0} ore</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Partenza:</span>
                                                <span className="ml-2 font-medium">{incubation.partenza_macchine || "-"}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Operatore:</span>
                                                <span className="ml-2 font-medium">{incubation.operatore || "-"}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Incubatrici:</span>
                                                <span className="ml-2 font-medium">{incubation.incubatrici || "-"}</span>
                                            </div>
                                        </div>

                                        {/* Richiesta Animali */}
                                        {(incubation.richiesta_granpollo > 0 || incubation.richiesta_pollo70 > 0 ||
                                            incubation.richiesta_color_yeald > 0 || incubation.richiesta_ross > 0) && (
                                                <div className="mb-4 bg-amber-50 p-3 rounded-lg">
                                                    <h4 className="text-sm font-medium text-amber-800 mb-2">Richiesta vs Previsti:</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                                        {incubation.richiesta_granpollo > 0 && (
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className={`px-2 py-0.5 rounded text-xs ${PRODUCT_COLORS["Granpollo"]}`}>Granpollo</span>
                                                                <span className="font-mono">{formatNumber(incubation.richiesta_granpollo)}</span>
                                                                <span className="text-gray-400">→</span>
                                                                <span className="font-mono">{formatNumber(previstiPerProdotto["Granpollo"] || 0)}</span>
                                                                <span className={`font-mono font-semibold ${diffGranpollo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    ({diffGranpollo >= 0 ? '+' : ''}{formatNumber(diffGranpollo)})
                                                                </span>
                                                            </div>
                                                        )}
                                                        {incubation.richiesta_pollo70 > 0 && (
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className={`px-2 py-0.5 rounded text-xs ${PRODUCT_COLORS["Pollo70"]}`}>Pollo70</span>
                                                                <span className="font-mono">{formatNumber(incubation.richiesta_pollo70)}</span>
                                                                <span className="text-gray-400">→</span>
                                                                <span className="font-mono">{formatNumber(previstiPerProdotto["Pollo70"] || 0)}</span>
                                                                <span className={`font-mono font-semibold ${diffPollo70 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    ({diffPollo70 >= 0 ? '+' : ''}{formatNumber(diffPollo70)})
                                                                </span>
                                                            </div>
                                                        )}
                                                        {incubation.richiesta_color_yeald > 0 && (
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className={`px-2 py-0.5 rounded text-xs ${PRODUCT_COLORS["Color Yeald"]}`}>Color Yeald</span>
                                                                <span className="font-mono">{formatNumber(incubation.richiesta_color_yeald)}</span>
                                                                <span className="text-gray-400">→</span>
                                                                <span className="font-mono">{formatNumber(previstiPerProdotto["Color Yeald"] || 0)}</span>
                                                                <span className={`font-mono font-semibold ${diffColorYeald >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    ({diffColorYeald >= 0 ? '+' : ''}{formatNumber(diffColorYeald)})
                                                                </span>
                                                            </div>
                                                        )}
                                                        {incubation.richiesta_ross > 0 && (
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className={`px-2 py-0.5 rounded text-xs ${PRODUCT_COLORS["Ross"]}`}>Ross</span>
                                                                <span className="font-mono">{formatNumber(incubation.richiesta_ross)}</span>
                                                                <span className="text-gray-400">→</span>
                                                                <span className="font-mono">{formatNumber(previstiPerProdotto["Ross"] || 0)}</span>
                                                                <span className={`font-mono font-semibold ${diffRoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    ({diffRoss >= 0 ? '+' : ''}{formatNumber(diffRoss)})
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                        {/* Batches Table */}
                                        {incubation.batches && incubation.batches.length > 0 && (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-gray-200">
                                                            <th className="px-2 py-2 text-left">Prodotto</th>
                                                            <th className="px-2 py-2 text-left">Nome</th>
                                                            <th className="px-2 py-2 text-left">Origine</th>
                                                            <th className="px-2 py-2 text-right">Uova Partita</th>
                                                            <th className="px-2 py-2 text-right">Uova Utilizzate</th>
                                                            <th className="px-2 py-2 text-center">Età</th>
                                                            <th className="px-2 py-2 text-right">Storico %</th>
                                                            <th className="px-2 py-2 text-right">Prev. Animali</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {[...incubation.batches]
                                                            .sort((a, b) => PRODUCT_ORDER.indexOf(a.prodotto) - PRODUCT_ORDER.indexOf(b.prodotto))
                                                            .map(batch => {
                                                                const storico = getStorico(batch.storico_override);
                                                                const previsioneAnimali = Math.round((batch.uova_utilizzate || 0) * (storico / 100));

                                                                return (
                                                                    <tr key={batch.id} className="border-b hover:bg-gray-100">
                                                                        <td className="px-2 py-2">
                                                                            <span className={`px-2 py-1 rounded text-xs ${PRODUCT_COLORS[batch.prodotto] || "bg-gray-100"}`}>
                                                                                {batch.prodotto}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-2 py-2">{batch.nome}</td>
                                                                        <td className="px-2 py-2 text-gray-600">{batch.origine}</td>
                                                                        <td className="px-2 py-2 text-right font-mono">{formatNumber(batch.uova_partita)}</td>
                                                                        <td className="px-2 py-2 text-right font-mono">{formatNumber(batch.uova_utilizzate || 0)}</td>
                                                                        <td className="px-2 py-2 text-center">{batch.eta} sett.</td>
                                                                        <td className="px-2 py-2 text-right font-mono">{storico}%</td>
                                                                        <td className="px-2 py-2 text-right font-mono font-bold text-green-700">{formatNumber(previsioneAnimali)}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        {/* Totals Row */}
                                                        <tr className="bg-gray-200 font-bold border-t-2">
                                                            <td colSpan={4} className="px-2 py-2 text-right">Totale:</td>
                                                            <td className="px-2 py-2 text-right font-mono">
                                                                {formatNumber(totalUova)}
                                                            </td>
                                                            <td colSpan={2} className="px-2 py-2"></td>
                                                            <td className="px-2 py-2 text-right font-mono text-green-700">
                                                                {formatNumber(totalPulcini)}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
