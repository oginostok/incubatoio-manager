/**
 * T008 - Tabelle di Nascita
 * Visualizza le percentuali di nascita per prodotto per settimana (W24-W64)
 * Celle editabili con doppio-click, salvataggio automatico su blur
 */

import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/config";

const API_BASE = API_BASE_URL;

const PRODUCTS = [
    { id: "granpollo", label: "Granpollo", bgColor: "bg-granpollo-bright" },
    { id: "pollo70", label: "Pollo70", bgColor: "bg-pollo70-bright" },
    { id: "colorYeald", label: "Color Yeald", bgColor: "bg-colorYeald-bright" },
    { id: "ross", label: "Ross", bgColor: "bg-ross-bright" },
];

type BirthRatesData = Record<number, Record<string, number>>;

export default function BirthRatesTable() {
    const [data, setData] = useState<BirthRatesData>({});
    const [loading, setLoading] = useState(true);
    const [editingCell, setEditingCell] = useState<{ week: number; product: string } | null>(null);
    const [editValue, setEditValue] = useState("");
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load data from API
    useEffect(() => {
        fetchData();
    }, []);

    // Focus input when editing starts
    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingCell]);

    const fetchData = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/birth-rates`);
            const json = await res.json();
            setData(json.data || {});
        } catch (err) {
            console.error("Failed to load birth rates:", err);
        } finally {
            setLoading(false);
        }
    };

    const formatPercent = (value: number) => {
        return `${value.toFixed(2)}%`;
    };

    const handleDoubleClick = (week: number, product: string) => {
        const currentValue = data[week]?.[product] ?? 82.00;
        setEditingCell({ week, product });
        setEditValue(currentValue.toFixed(2));
    };

    const handleSave = async () => {
        if (!editingCell) return;

        const { week, product } = editingCell;
        const newRate = parseFloat(editValue);

        if (isNaN(newRate) || newRate < 0 || newRate > 100) {
            // Invalid value, reset
            setEditingCell(null);
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/api/birth-rates`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ week, product, rate: newRate }),
            });

            if (res.ok) {
                // Update local state
                setData((prev) => ({
                    ...prev,
                    [week]: {
                        ...prev[week],
                        [product]: newRate,
                    },
                }));
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

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <p className="text-gray-500">Caricamento...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header with T-ID */}
            <div className="p-4 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">Tabelle di Nascita</h2>
                <p className="text-xs text-gray-400">T008</p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ width: '100px' }}>
                                W
                            </th>
                            {PRODUCTS.map((product) => (
                                <th
                                    key={product.id}
                                    className={`px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider border-b ${product.bgColor}`}
                                >
                                    {product.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 64 - 24 + 1 }, (_, i) => 24 + i).map((week, index) => (
                            <tr
                                key={week}
                                className={`hover:bg-gray-200 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-100"
                                    }`}
                            >
                                <td
                                    className={`py-2 text-center font-medium text-gray-700 border-r ${index % 2 === 0 ? "bg-gray-50" : "bg-gray-150"
                                        }`}
                                    style={{ width: '100px' }}
                                >
                                    {week}
                                </td>
                                {PRODUCTS.map((product) => {
                                    const isEditing =
                                        editingCell?.week === week && editingCell?.product === product.id;
                                    const value = data[week]?.[product.id] ?? 82.00;

                                    return (
                                        <td
                                            key={product.id}
                                            className="px-2 py-2 text-center text-gray-600 font-mono cursor-pointer relative"
                                            onDoubleClick={() => handleDoubleClick(week, product.id)}
                                        >
                                            <span className={isEditing ? "invisible" : ""}>
                                                {formatPercent(value)}
                                            </span>
                                            {isEditing && (
                                                <input
                                                    ref={inputRef}
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={handleSave}
                                                    onKeyDown={handleKeyDown}
                                                    disabled={saving}
                                                    className="absolute inset-0 w-full h-full px-1 text-center border-2 border-blue-400 rounded focus:outline-none bg-white"
                                                />
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
