/**
 * T009 - Nascita Uova in Acquisto
 * Percentuali di nascita per uova acquistate (una sola riga, 4 prodotti)
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

type PurchaseRatesData = Record<string, number>;

export default function PurchaseBirthRatesTable() {
    const [data, setData] = useState<PurchaseRatesData>({});
    const [loading, setLoading] = useState(true);
    const [editingCell, setEditingCell] = useState<string | null>(null);
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
            const res = await fetch(`${API_BASE}/api/birth-rates/purchase`);
            const json = await res.json();
            setData(json.data || {});
        } catch (err) {
            console.error("Failed to load purchase birth rates:", err);
        } finally {
            setLoading(false);
        }
    };

    const formatPercent = (value: number) => {
        return `${value.toFixed(2)}%`;
    };

    const handleDoubleClick = (product: string) => {
        const currentValue = data[product] ?? 84.00;
        setEditingCell(product);
        setEditValue(currentValue.toFixed(2));
    };

    const handleSave = async () => {
        if (!editingCell) return;

        const product = editingCell;
        const newRate = parseFloat(editValue);

        if (isNaN(newRate) || newRate < 0 || newRate > 100) {
            setEditingCell(null);
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/api/birth-rates/purchase`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ product, rate: newRate }),
            });

            if (res.ok) {
                setData((prev) => ({
                    ...prev,
                    [product]: newRate,
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            {/* Header with T-ID */}
            <div className="p-4 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">Nascita Uova in Acquisto</h2>
                <p className="text-xs text-gray-400">T009</p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
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
                        <tr className="bg-white hover:bg-gray-200 transition-colors">
                            {PRODUCTS.map((product) => {
                                const isEditing = editingCell === product.id;
                                const value = data[product.id] ?? 84.00;

                                return (
                                    <td
                                        key={product.id}
                                        className="px-2 py-2 text-center text-gray-600 font-mono cursor-pointer relative"
                                        onDoubleClick={() => handleDoubleClick(product.id)}
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
                    </tbody>
                </table>
            </div>
        </div>
    );
}
