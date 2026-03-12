import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";

const API_BASE = API_BASE_URL;

interface OccupancyData {
    anno: number;
    settimana: number;
    uova_totali: number;
    capacita_massima: number;
    percentuale: number;
}

export default function IncubatorOccupancyTable() {
    const [data, setData] = useState<OccupancyData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/incubazioni/occupancy/weekly`);
            const json = await res.json();
            setData(json || []);
        } catch (err) {
            console.error("Failed to load occupancy data:", err);
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (value: number) => {
        return value.toLocaleString("it-IT", { useGrouping: true });
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Caricamento occupazione...</div>;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded">T017</span>
                    <h3 className="font-semibold text-gray-800">Occupazione Incubatoio</h3>
                </div>
            </div>

            <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-sm text-left relative border-collapse">
                    <thead className="text-xs uppercase bg-gray-50 text-gray-600 sticky top-0 z-10 shadow-sm border-b">
                        <tr>
                            <th className="px-3 py-2 text-center border-r font-medium text-gray-700 bg-gray-100 sticky left-0 z-20 w-24">
                                Settimana
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b bg-gray-50 min-w-[120px]">
                                Uova in Incubazione
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b bg-gray-50 min-w-[120px]">
                                Capacità Massima
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b bg-gray-50 min-w-[100px]">
                                Stato
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                    Nessun dato di occupazione disponibile
                                </td>
                            </tr>
                        ) : (
                            data.map((row, index) => {
                                // Determine color based on percentage
                                let pctColor = "text-green-600";
                                let bgPctColor = "bg-green-50";
                                if (row.percentuale >= 95) {
                                    pctColor = "text-red-600";
                                    bgPctColor = "bg-red-50";
                                } else if (row.percentuale >= 80) {
                                    pctColor = "text-amber-600";
                                    bgPctColor = "bg-amber-50";
                                }

                                return (
                                    <tr
                                        key={`${row.anno}-${row.settimana}`}
                                        className={`hover:bg-gray-100 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                                    >
                                        <td className="px-3 py-2 text-center font-medium text-gray-700 sticky left-0 bg-inherit border-r">
                                            {row.anno}/{row.settimana.toString().padStart(2, '0')}
                                        </td>
                                        <td className="px-3 py-2 text-center font-mono text-gray-600">
                                            {formatNumber(row.uova_totali)}
                                        </td>
                                        <td className="px-3 py-2 text-center font-mono text-gray-500">
                                            {formatNumber(row.capacita_massima)}
                                        </td>
                                        <td className={`px-3 py-2 text-center font-mono font-semibold ${pctColor} ${bgPctColor}`}>
                                            {row.percentuale.toFixed(1)}%
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
