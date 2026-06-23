import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, FileText, Pencil } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { IncubazioniAPI } from "@/lib/api";

interface IncubationBatch {
    id: number;
    prodotto: string;
    nome: string;
    origine: string;
    uova_partita: number;
    uova_utilizzate: number;
    eta: number;
    data_arrivo?: string;
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

    // Modifica richieste (pulcini richiesti per categoria) anche dopo il commit
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editVals, setEditVals] = useState<{ gp: number; p70: number; cy: number; ross: number }>(
        { gp: 0, p70: 0, cy: 0, ross: 0 }
    );
    const [savingEdit, setSavingEdit] = useState(false);

    const startEditRichieste = (inc: Incubation) => {
        setEditingId(inc.id);
        setEditVals({
            gp: inc.richiesta_granpollo || 0,
            p70: inc.richiesta_pollo70 || 0,
            cy: inc.richiesta_color_yeald || 0,
            ross: inc.richiesta_ross || 0,
        });
        setExpandedId(inc.id);
    };

    const saveRichieste = async (id: number) => {
        setSavingEdit(true);
        try {
            await IncubazioniAPI.updateIncubation(id, {
                richiesta_granpollo: editVals.gp,
                richiesta_pollo70: editVals.p70,
                richiesta_color_yeald: editVals.cy,
                richiesta_ross: editVals.ross,
            });
            setEditingId(null);
            await fetchIncubations();
        } catch (err) {
            console.error("Failed to update richieste", err);
            alert("Errore nel salvataggio delle richieste. Riprova.");
        } finally {
            setSavingEdit(false);
        }
    };

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

                        // Animali richiesti per prodotto
                        const richiestiPerProdotto: Record<string, number> = {
                            "Granpollo": incubation.richiesta_granpollo || 0,
                            "Pollo70": incubation.richiesta_pollo70 || 0,
                            "Color Yeald": incubation.richiesta_color_yeald || 0,
                            "Ross": incubation.richiesta_ross || 0,
                        };
                        // Prodotti da mostrare: quelli con una richiesta o con animali previsti
                        const prodottiPresenti = PRODUCT_ORDER.filter(
                            p => (richiestiPerProdotto[p] || 0) > 0 || (previstiPerProdotto[p] || 0) > 0
                        );

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

                                            {/* Animali richiesti vs previsti — sempre visibile, per prodotto */}
                                            {prodottiPresenti.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {prodottiPresenti.map(prod => {
                                                        const rich = richiestiPerProdotto[prod] || 0;
                                                        const prev = previstiPerProdotto[prod] || 0;
                                                        const diff = prev - rich;
                                                        return (
                                                            <div
                                                                key={prod}
                                                                className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs"
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                <span className={`px-2 py-0.5 rounded text-xs ${PRODUCT_COLORS[prod] || "bg-gray-100"}`}>{prod}</span>
                                                                <span className="text-gray-500">Rich.</span>
                                                                <span className="font-mono font-medium">{formatNumber(rich)}</span>
                                                                <span className="text-gray-400">→</span>
                                                                <span className="text-gray-500">Prev.</span>
                                                                <span className="font-mono font-medium text-green-700">{formatNumber(prev)}</span>
                                                                {rich > 0 && (
                                                                    <span className={`font-mono font-semibold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                        ({diff >= 0 ? '+' : ''}{formatNumber(diff)})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
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

                                        {/* Modifica richieste (pulcini richiesti per categoria) */}
                                        {editingId === incubation.id && (
                                            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                                                    <Pencil className="w-4 h-4" />
                                                    Pulcini richiesti per categoria
                                                </h4>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {([
                                                        { key: "gp" as const, label: "Granpollo" },
                                                        { key: "p70" as const, label: "Pollo70" },
                                                        { key: "cy" as const, label: "Color Yeald" },
                                                        { key: "ross" as const, label: "Ross" },
                                                    ]).map(({ key, label }) => (
                                                        <div key={key} className={`p-2 rounded-lg border ${PRODUCT_COLORS[label] || "bg-gray-100"}`}>
                                                            <label className="block text-xs font-medium mb-1">{label}</label>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                value={editVals[key] || ""}
                                                                onChange={e => setEditVals(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                                                                className="w-full px-2 py-1 border border-gray-300 rounded text-right font-mono text-sm text-gray-900"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-end gap-2 mt-3">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                                                        className="px-3 py-1.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        Annulla
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); saveRichieste(incubation.id); }}
                                                        disabled={savingEdit}
                                                        className="px-3 py-1.5 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        {savingEdit ? "Salvataggio..." : "Salva Richieste"}
                                                    </button>
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
                                                            <th className="px-2 py-2 text-center">Data Arrivo</th>
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
                                                                        <td className="px-2 py-2 text-center text-gray-500">{batch.data_arrivo ? formatDateLong(batch.data_arrivo) : "-"}</td>
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
                                                            <td colSpan={3} className="px-2 py-2"></td>
                                                            <td className="px-2 py-2 text-right font-mono text-green-700">
                                                                {formatNumber(totalPulcini)}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
                                            {editingId !== incubation.id && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); startEditRichieste(incubation); }}
                                                    className="px-4 py-2 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                    Modifica Richieste
                                                </button>
                                            )}
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm("Vuoi davvero annullare e cancellare questa incubazione? Le uova torneranno a magazzino.")) {
                                                        try {
                                                            await IncubazioniAPI.deleteIncubation(incubation.id);
                                                            fetchIncubations();
                                                        } catch (err) {
                                                            console.error("Failed to delete", err);
                                                            alert("Errore nella cancellazione: ricaricare la pagina o controllare connessione");
                                                        }
                                                    }
                                                }}
                                                className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Cancella Incubazione
                                            </button>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm("Vuoi riportare questa incubazione in fase di Modifica? Le uova torneranno a magazzino finché non la salvi di nuovo.")) {
                                                        try {
                                                            await IncubazioniAPI.uncommitIncubation(incubation.id);
                                                            fetchIncubations();
                                                        } catch (err) {
                                                            console.error("Failed to uncommit", err);
                                                            alert("Errore nella modifica: ricaricare la pagina o controllare connessione");
                                                        }
                                                    }
                                                }}
                                                className="px-4 py-2 text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Modifica (Riporta a Incubazione Uova)
                                            </button>
                                        </div>
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
