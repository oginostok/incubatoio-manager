/**
 * T015 - Totali Uova in Magazzino
 * Riepilogo totali uova per prodotto
 */

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";

const API_BASE = API_BASE_URL;

// Product options with colors - from RULES.md
const PRODUCTS = [
    { id: "Granpollo", label: "Granpollo", bgColor: "bg-granpollo-bright" },
    { id: "Pollo70", label: "Pollo70", bgColor: "bg-pollo70-bright" },
    { id: "Color Yeald", label: "Color Yeald", bgColor: "bg-colorYeald-bright" },
    { id: "Ross", label: "Ross", bgColor: "bg-ross-bright" },
];

interface EggStorageEntry {
    id: number;
    prodotto: string;
    numero: number;
}

interface EggStorageTotalsTableProps {
    refreshTrigger?: number;
}

export default function EggStorageTotalsTable({ refreshTrigger = 0 }: EggStorageTotalsTableProps) {
    const [entries, setEntries] = useState<EggStorageEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEntries();
    }, []);

    // Refetch when refreshTrigger changes (triggered by T014 data changes)
    useEffect(() => {
        if (refreshTrigger > 0) {
            fetchEntries();
        }
    }, [refreshTrigger]);

    const fetchEntries = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/magazzino-uova`);
            const data = await res.json();
            setEntries(data || []);
        } catch (err) {
            console.error("Failed to load egg storage:", err);
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (num: number): string => {
        // Use explicit dot as thousand separator (Italian format: xxx.xxx)
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    // Calculate totals per product
    const getTotalForProduct = (productId: string): number => {
        return entries
            .filter(e => e.prodotto === productId)
            .reduce((sum, e) => sum + e.numero, 0);
    };

    // Calculate grand total
    const grandTotal = entries.reduce((sum, e) => sum + e.numero, 0);

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <p className="text-gray-500 text-sm">Caricamento...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">Totali Uova in Magazzino</h2>
                <p className="text-xs text-gray-400">T015</p>
            </div>

            {/* Table */}
            <table className="w-full text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Prodotto
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                            Totale Uova
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {PRODUCTS.map((product, index) => {
                        const total = getTotalForProduct(product.id);
                        return (
                            <tr key={product.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                <td className="px-4 py-2">
                                    <span className={`inline-block px-3 py-1 rounded-full text-white text-xs font-medium ${product.bgColor}`}>
                                        {product.label}
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-right text-gray-700 font-mono">
                                    {formatNumber(total)}
                                </td>
                            </tr>
                        );
                    })}
                    {/* Grand Total Row */}
                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                        <td className="px-4 py-3 text-gray-800">
                            TOTALE
                        </td>
                        <td className="px-4 py-3 text-right text-gray-800 font-mono">
                            {formatNumber(grandTotal)}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
