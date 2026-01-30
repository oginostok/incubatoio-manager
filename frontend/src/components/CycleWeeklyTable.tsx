import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Plus, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

interface WeeklyData {
    id: number;
    lotto_id: number;
    eta_animali: number;
    anno: number;
    settimana: number;
    galline_morte: number;
    galli_morti: number;
    uova_incubabili: number;
    uova_seconda: number;
    tipo_mangime: string;
    accensione_luce: string;
    spegnimento_luce: string;
}

interface CycleWeeklyTableProps {
    lottoId: number;
    annoStart: number;
    settStart: number;
}

const API_BASE = API_BASE_URL;

export function CycleWeeklyTable({ lottoId, annoStart: _annoStart, settStart: _settStart }: CycleWeeklyTableProps) {
    const [data, setData] = useState<WeeklyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCell, setEditingCell] = useState<{ rowId: number; field: string } | null>(null);
    const pendingValue = useRef<{ rowId: number; field: string; value: string | number } | null>(null);

    // Fetch data on mount
    useEffect(() => {
        fetchData();
    }, [lottoId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/allevamenti/lotti/${lottoId}/weekly-data`);
            if (response.ok) {
                const result = await response.json();
                setData(result.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch weekly data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRow = async () => {
        // Find the next eta_animali (start at 19 or max + 1)
        const maxEta = data.length > 0 ? Math.max(...data.map(d => d.eta_animali)) : 18;
        const nextEta = maxEta + 1;

        try {
            const response = await fetch(`${API_BASE}/api/allevamenti/lotti/${lottoId}/weekly-data`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ eta_animali: nextEta })
            });
            if (response.ok) {
                await fetchData();
            }
        } catch (error) {
            console.error("Failed to add row", error);
        }
    };

    const handleCellChange = (rowId: number, field: string, value: string | number) => {
        // Store pending value for save on blur
        pendingValue.current = { rowId, field, value };

        // Update local display immediately
        setData(prev => prev.map(row =>
            row.id === rowId ? { ...row, [field]: value } : row
        ));
    };

    const saveOnBlur = async () => {
        if (!pendingValue.current) return;

        const { rowId, field, value } = pendingValue.current;
        pendingValue.current = null;
        setEditingCell(null);

        try {
            await fetch(`${API_BASE}/api/allevamenti/lotti/${lottoId}/weekly-data/${rowId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: value })
            });
        } catch (error) {
            console.error("Failed to save", error);
        }
    };

    const formatWSolare = (anno: number, settimana: number) => {
        return `${anno}/${String(settimana).padStart(2, '0')}`;
    };

    const renderEditableCell = (
        row: WeeklyData,
        field: keyof WeeklyData,
        type: 'number' | 'text' = 'number'
    ) => {
        const isEditing = editingCell?.rowId === row.id && editingCell?.field === field;
        const value = row[field];

        if (isEditing) {
            return (
                <input
                    type={type}
                    value={value}
                    onChange={(e) => handleCellChange(row.id, field, type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
                    onBlur={saveOnBlur}
                    onKeyDown={(e) => e.key === 'Enter' && saveOnBlur()}
                    autoFocus
                    className="w-full h-5 px-1 text-xs border border-blue-400 rounded bg-white focus:outline-none"
                />
            );
        }

        return (
            <span
                onDoubleClick={() => setEditingCell({ rowId: row.id, field })}
                className="cursor-pointer hover:bg-white/50 px-1 py-0.5 rounded block h-5 truncate"
            >
                {value || '-'}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-3 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
                <h5 className="text-sm font-semibold text-gray-600">Dati Settimanali</h5>
                <Button size="sm" variant="outline" onClick={handleAddRow} className="gap-1 h-7">
                    <Plus className="w-3 h-3" />
                    Aggiungi
                </Button>
            </div>

            {data.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                    Nessun dato. Clicca "Aggiungi" per iniziare.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs table-fixed">
                        <thead>
                            <tr className="bg-gray-100/80">
                                <th className="w-10 px-2 py-1.5 text-left font-medium text-gray-600">Età</th>
                                <th className="w-16 px-2 py-1.5 text-left font-medium text-gray-600">W Solare</th>
                                <th className="w-14 px-2 py-1.5 text-left font-medium text-gray-600">Gal. Morte</th>
                                <th className="w-14 px-2 py-1.5 text-left font-medium text-gray-600">Gal. Morti</th>
                                <th className="w-14 px-2 py-1.5 text-left font-medium text-gray-600">Uova Inc.</th>
                                <th className="w-14 px-2 py-1.5 text-left font-medium text-gray-600">Uova 2ª</th>
                                <th className="w-16 px-2 py-1.5 text-left font-medium text-gray-600">Mangime</th>
                                <th className="w-14 px-2 py-1.5 text-left font-medium text-gray-600">Luce ON</th>
                                <th className="w-14 px-2 py-1.5 text-left font-medium text-gray-600">Luce OFF</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map(row => (
                                <tr key={row.id} className="hover:bg-white/50">
                                    <td className="px-2 py-1 font-mono font-medium">{row.eta_animali}</td>
                                    <td className="px-2 py-1 font-mono text-gray-500">{formatWSolare(row.anno, row.settimana)}</td>
                                    <td className="px-2 py-1">{renderEditableCell(row, 'galline_morte', 'number')}</td>
                                    <td className="px-2 py-1">{renderEditableCell(row, 'galli_morti', 'number')}</td>
                                    <td className="px-2 py-1">{renderEditableCell(row, 'uova_incubabili', 'number')}</td>
                                    <td className="px-2 py-1">{renderEditableCell(row, 'uova_seconda', 'number')}</td>
                                    <td className="px-2 py-1">{renderEditableCell(row, 'tipo_mangime', 'text')}</td>
                                    <td className="px-2 py-1">{renderEditableCell(row, 'accensione_luce', 'text')}</td>
                                    <td className="px-2 py-1">{renderEditableCell(row, 'spegnimento_luce', 'text')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <p className="text-[10px] text-gray-400">Doppio click per modificare. Salvataggio automatico.</p>
        </div>
    );
}
