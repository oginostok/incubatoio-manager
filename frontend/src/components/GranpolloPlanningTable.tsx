/**
 * T010 - Pianificazione Nascite Granpollo
 * Calcola previsioni nascite basate su produzioni, acquisti, vendite e birth rates
 */

import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/config";

const API_BASE = API_BASE_URL;

interface ProductionDetail {
    allevamento: string;
    eta: number;
    uova: number;
}

interface PlanningRow {
    settimana_nascita: string;
    anno: number;
    settimana: number;
    uova_prodotte: number;
    uova_acquistate: number;
    uova_vendute: number;
    uova_totali: number;
    animali_possibili: number;
    richiesta_guidi: number;
    altri_clienti: number;
    mancanze_esubero: number;
    production_details: ProductionDetail[];
    purchase_details: PurchaseDetail[];
    animali_calc_details: AnimaliCalcDetail[];
}

interface PurchaseDetail {
    azienda: string;
    quantita: number;
}

interface AnimaliCalcDetail {
    source: string;
    uova: number;
    eta: number | null;
    rate_percent: number;
    animali: number;
}

interface EditingCell {
    anno: number;
    settimana: number;
    field: "richiesta_guidi" | "altri_clienti";
}

interface GranpolloPlanningTableProps {
    showTooltips?: boolean;
}

export default function GranpolloPlanningTable({ showTooltips = true }: GranpolloPlanningTableProps) {
    const [data, setData] = useState<PlanningRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasVendite, setHasVendite] = useState(false);
    const [hasAcquisti, setHasAcquisti] = useState(false);
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
    const [editValue, setEditValue] = useState("");
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingCell]);

    const fetchData = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/chick-planning/granpollo`);
            const json = await res.json();
            setData(json.data || []);
            setHasVendite(json.has_vendite || false);
            setHasAcquisti(json.has_acquisti || false);
        } catch (err) {
            console.error("Failed to load planning data:", err);
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (value: number) => {
        return value.toLocaleString("it-IT", { useGrouping: true });
    };

    const handleDoubleClick = (row: PlanningRow, field: "richiesta_guidi" | "altri_clienti") => {
        setEditingCell({ anno: row.anno, settimana: row.settimana, field });
        setEditValue(row[field].toString());
    };

    const handleSave = async () => {
        if (!editingCell) return;

        const { anno, settimana, field } = editingCell;
        const newValue = parseInt(editValue.replace(/\./g, "").replace(/,/g, ""));

        if (isNaN(newValue) || newValue < 0) {
            setEditingCell(null);
            return;
        }

        setSaving(true);
        try {
            const payload: Record<string, number> = { anno, settimana };
            payload[field] = newValue;

            const res = await fetch(`${API_BASE}/api/chick-planning/granpollo`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                // Update local data
                setData((prev) =>
                    prev.map((row) => {
                        if (row.anno === anno && row.settimana === settimana) {
                            const updated = { ...row, [field]: newValue };
                            // Recalculate mancanze_esubero
                            updated.mancanze_esubero =
                                updated.animali_possibili - updated.richiesta_guidi - updated.altri_clienti;
                            return updated;
                        }
                        return row;
                    })
                );
            }
        } catch (err) {
            console.error("Failed to save:", err);
        } finally {
            setSaving(false);
            setEditingCell(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSave();
        } else if (e.key === "Escape") {
            setEditingCell(null);
        }
    };

    const getMancanzaStyle = (value: number) => {
        if (value >= 0) {
            return "bg-green-100 text-green-800";
        } else {
            return "bg-red-100 text-red-800";
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <p className="text-gray-500">Caricamento...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-granpollo-bright">
                <h2 className="text-xl font-bold text-white">Pianificazione Nascite - Granpollo</h2>
                <p className="text-xs text-green-100">T010</p>
            </div>

            {/* Table */}
            <div>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b">
                                Sett. Nascita
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b">
                                Uova Prodotte
                            </th>
                            {hasAcquisti && (
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b">
                                    Uova Acquistate
                                </th>
                            )}
                            {hasVendite && (
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b">
                                    Uova Vendute
                                </th>
                            )}
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b bg-gray-100">
                                Uova Totali
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b bg-green-50">
                                Animali Possibili
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b bg-blue-50">
                                Richiesta Guidi
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b bg-blue-50">
                                Altri Clienti
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b">
                                Mancanze/Esubero
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, index) => {
                            const isEditingGuidi =
                                editingCell?.anno === row.anno &&
                                editingCell?.settimana === row.settimana &&
                                editingCell?.field === "richiesta_guidi";
                            const isEditingAltri =
                                editingCell?.anno === row.anno &&
                                editingCell?.settimana === row.settimana &&
                                editingCell?.field === "altri_clienti";

                            return (
                                <tr
                                    key={`${row.anno}-${row.settimana}`}
                                    className={`hover:bg-gray-100 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                                        }`}
                                >
                                    <td className="px-3 py-2 text-center font-medium text-gray-700">
                                        {row.settimana_nascita}
                                    </td>
                                    {/* Uova Prodotte with tooltip */}
                                    <td className={`px-3 py-2 text-right font-mono text-gray-600 relative ${showTooltips ? "group cursor-help" : ""}`}>
                                        {formatNumber(row.uova_prodotte)}
                                        {showTooltips && row.production_details && row.production_details.length > 0 && (
                                            <div className="absolute z-50 invisible group-hover:visible bg-gray-900 text-white text-xs rounded-lg py-2 px-3 left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap shadow-lg">
                                                <div className="font-semibold mb-1 border-b border-gray-700 pb-1">
                                                    Produzione {row.settimana_nascita}
                                                </div>
                                                {row.production_details.map((detail, idx) => (
                                                    <div key={idx} className="py-0.5">
                                                        {detail.allevamento}: {formatNumber(detail.uova)} - Età W{detail.eta}
                                                    </div>
                                                ))}
                                                <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-900" />
                                            </div>
                                        )}
                                    </td>
                                    {/* Uova Acquistate with tooltip - conditionally shown */}
                                    {hasAcquisti && (
                                        <td className={`px-3 py-2 text-right font-mono text-gray-600 relative ${showTooltips && row.purchase_details?.length > 0 ? "group cursor-help" : ""}`}>
                                            {formatNumber(row.uova_acquistate)}
                                            {showTooltips && row.purchase_details && row.purchase_details.length > 0 && (
                                                <div className="absolute z-50 invisible group-hover:visible bg-gray-900 text-white text-xs rounded-lg py-2 px-3 left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap shadow-lg">
                                                    <div className="font-semibold mb-1 border-b border-gray-700 pb-1">
                                                        Acquisti {row.settimana_nascita}
                                                    </div>
                                                    {row.purchase_details.map((detail, idx) => (
                                                        <div key={idx} className="py-0.5">
                                                            {detail.azienda}: {formatNumber(detail.quantita)}
                                                        </div>
                                                    ))}
                                                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-900" />
                                                </div>
                                            )}
                                        </td>
                                    )}
                                    {hasVendite && (
                                        <td className="px-3 py-2 text-right font-mono text-gray-600">
                                            {formatNumber(row.uova_vendute)}
                                        </td>
                                    )}
                                    <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800 bg-gray-100">
                                        {formatNumber(row.uova_totali)}
                                    </td>
                                    {/* Animali Possibili with calc tooltip */}
                                    <td className={`px-3 py-2 text-right font-mono font-semibold text-green-700 bg-green-50 relative ${showTooltips && row.animali_calc_details?.length > 0 ? "group cursor-help" : ""}`}>
                                        {formatNumber(row.animali_possibili)}
                                        {showTooltips && row.animali_calc_details && row.animali_calc_details.length > 0 && (
                                            <div className="absolute z-50 invisible group-hover:visible bg-gray-900 text-white text-xs rounded-lg py-2 px-3 left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap shadow-lg">
                                                <div className="font-semibold mb-1 border-b border-gray-700 pb-1">
                                                    Calcolo Animali Possibili
                                                </div>
                                                {row.animali_calc_details.map((detail, idx) => (
                                                    <div key={idx} className="py-0.5">
                                                        {detail.source}: {formatNumber(detail.uova)} {detail.eta !== null ? `W${detail.eta}` : ""} × {detail.rate_percent.toFixed(0)}% = {formatNumber(detail.animali)}
                                                    </div>
                                                ))}
                                                <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-900" />
                                            </div>
                                        )}
                                    </td>

                                    {/* Editable: Richiesta Guidi */}
                                    <td
                                        className="px-3 py-2 text-right font-mono text-blue-700 bg-blue-50 cursor-pointer relative"
                                        onDoubleClick={() => handleDoubleClick(row, "richiesta_guidi")}
                                    >
                                        <span className={isEditingGuidi ? "invisible" : ""}>
                                            {formatNumber(row.richiesta_guidi)}
                                        </span>
                                        {isEditingGuidi && (
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={handleSave}
                                                onKeyDown={handleKeyDown}
                                                disabled={saving}
                                                className="absolute inset-0 w-full h-full px-1 text-right border-2 border-blue-400 rounded focus:outline-none bg-white"
                                            />
                                        )}
                                    </td>

                                    {/* Editable: Altri Clienti */}
                                    <td
                                        className="px-3 py-2 text-right font-mono text-blue-700 bg-blue-50 cursor-pointer relative"
                                        onDoubleClick={() => handleDoubleClick(row, "altri_clienti")}
                                    >
                                        <span className={isEditingAltri ? "invisible" : ""}>
                                            {formatNumber(row.altri_clienti)}
                                        </span>
                                        {isEditingAltri && (
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={handleSave}
                                                onKeyDown={handleKeyDown}
                                                disabled={saving}
                                                className="absolute inset-0 w-full h-full px-1 text-right border-2 border-blue-400 rounded focus:outline-none bg-white"
                                            />
                                        )}
                                    </td>

                                    {/* Mancanze/Esubero with conditional colors */}
                                    <td
                                        className={`px-3 py-2 text-right font-mono font-semibold ${getMancanzaStyle(
                                            row.mancanze_esubero
                                        )}`}
                                    >
                                        {formatNumber(row.mancanze_esubero)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
