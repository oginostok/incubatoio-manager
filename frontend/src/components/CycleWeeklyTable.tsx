import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Settings, X, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

type ColType = 'number' | 'text';

interface Column {
    key: string;
    label: string;
    type: ColType;
}

const ALL_COLUMNS: Column[] = [
    { key: 'galline_morte', label: 'Gal. Morte', type: 'number' },
    { key: 'galli_morti', label: 'Gal. Morti', type: 'number' },
    { key: 'uova_incubabili', label: 'Uova Inc.', type: 'number' },
    { key: 'uova_seconda', label: 'Uova 2ª', type: 'number' },
    { key: 'tipo_mangime', label: 'Mangime', type: 'text' },
    { key: 'accensione_luce', label: 'Luce ON', type: 'text' },
    { key: 'spegnimento_luce', label: 'Luce OFF', type: 'text' },
];

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

interface DisplayRow {
    id: number | null;
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
    dataFinePrevista?: string;
}

const API_BASE = API_BASE_URL;

function calculateEndAge(annoStart: number, settStart: number, dataFinePrevista?: string): number {
    if (!dataFinePrevista) return 70;
    const match = dataFinePrevista.match(/^(\d{4})\/(\d{2})$/);
    if (!match) return 70;
    const endYear = parseInt(match[1]);
    const endWeek = parseInt(match[2]);
    const startAbs = annoStart * 52 + settStart;
    const endAbs = endYear * 52 + endWeek;
    return Math.max(25, Math.min(endAbs - startAbs, 110));
}

function getAnnoSettimana(annoStart: number, settStart: number, age: number): { anno: number; settimana: number } {
    const totalWeeks = settStart + age;
    const yearsToAdd = Math.floor((totalWeeks - 1) / 52);
    const settimana = ((totalWeeks - 1) % 52) + 1;
    return { anno: annoStart + yearsToAdd, settimana };
}

export function CycleWeeklyTable({ lottoId, annoStart, settStart, dataFinePrevista }: CycleWeeklyTableProps) {
    const [data, setData] = useState<WeeklyData[]>([]);
    const [displayRows, setDisplayRows] = useState<DisplayRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCell, setEditingCell] = useState<{ rowEta: number; field: string } | null>(null);
    const [isEditingColumns, setIsEditingColumns] = useState(false);
    const pendingValue = useRef<{ rowEta: number; field: string; value: string | number } | null>(null);

    const endAge = calculateEndAge(annoStart, settStart, dataFinePrevista);

    // Column visibility persisted in localStorage per lotto
    const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() => {
        const saved = localStorage.getItem(`cwt_cols_${lottoId}`);
        if (saved) {
            try { return JSON.parse(saved); } catch {}
        }
        return ALL_COLUMNS.map(c => c.key);
    });

    const visibleColumns = ALL_COLUMNS.filter(c => visibleColumnKeys.includes(c.key));
    const hiddenColumns = ALL_COLUMNS.filter(c => !visibleColumnKeys.includes(c.key));

    const removeColumn = (key: string) => {
        const next = visibleColumnKeys.filter(k => k !== key);
        setVisibleColumnKeys(next);
        localStorage.setItem(`cwt_cols_${lottoId}`, JSON.stringify(next));
    };

    const addColumn = (key: string) => {
        // Preserve original column order
        const next = ALL_COLUMNS.map(c => c.key).filter(k => visibleColumnKeys.includes(k) || k === key);
        setVisibleColumnKeys(next);
        localStorage.setItem(`cwt_cols_${lottoId}`, JSON.stringify(next));
    };

    useEffect(() => {
        fetchData();
    }, [lottoId]);

    // Rebuild display rows whenever real data or range changes
    useEffect(() => {
        const dataByAge = new Map(data.map(d => [d.eta_animali, d]));
        const rows: DisplayRow[] = [];
        for (let age = 20; age <= endAge; age++) {
            const existing = dataByAge.get(age);
            if (existing) {
                rows.push({ ...existing });
            } else {
                const { anno, settimana } = getAnnoSettimana(annoStart, settStart, age);
                rows.push({
                    id: null,
                    lotto_id: lottoId,
                    eta_animali: age,
                    anno,
                    settimana,
                    galline_morte: 0,
                    galli_morti: 0,
                    uova_incubabili: 0,
                    uova_seconda: 0,
                    tipo_mangime: '',
                    accensione_luce: '',
                    spegnimento_luce: '',
                });
            }
        }
        setDisplayRows(rows);
    }, [data, endAge, annoStart, settStart, lottoId]);

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

    const handleCellChange = (rowEta: number, field: string, value: string | number) => {
        pendingValue.current = { rowEta, field, value };
        setDisplayRows(prev => prev.map(row =>
            row.eta_animali === rowEta ? { ...row, [field]: value } : row
        ));
    };

    const saveOnBlur = async () => {
        if (!pendingValue.current) return;
        const { rowEta, field, value } = pendingValue.current;
        pendingValue.current = null;
        setEditingCell(null);

        const row = displayRows.find(r => r.eta_animali === rowEta);
        if (!row) return;

        if (row.id === null) {
            // Create new row in backend
            try {
                const response = await fetch(`${API_BASE}/api/allevamenti/lotti/${lottoId}/weekly-data`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ eta_animali: rowEta, [field]: value })
                });
                if (response.ok) {
                    const result = await response.json();
                    setData(prev => [...prev, result.data]);
                    setDisplayRows(prev => prev.map(r =>
                        r.eta_animali === rowEta ? { ...result.data } : r
                    ));
                }
            } catch (error) {
                console.error("Failed to create row", error);
            }
        } else {
            // Update existing row
            try {
                await fetch(`${API_BASE}/api/allevamenti/lotti/${lottoId}/weekly-data/${row.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ [field]: value })
                });
            } catch (error) {
                console.error("Failed to save", error);
            }
        }
    };

    const formatWSolare = (anno: number, settimana: number) =>
        `${anno}/${String(settimana).padStart(2, '0')}`;

    const renderEditableCell = (row: DisplayRow, field: string, type: ColType = 'number') => {
        const isEditing = editingCell?.rowEta === row.eta_animali && editingCell?.field === field;
        const rawValue = (row as Record<string, unknown>)[field];
        const isPhantom = row.id === null;

        if (isEditing) {
            return (
                <input
                    type={type}
                    value={rawValue as string | number}
                    onChange={(e) => handleCellChange(
                        row.eta_animali, field,
                        type === 'number' ? parseInt(e.target.value) || 0 : e.target.value
                    )}
                    onBlur={saveOnBlur}
                    onKeyDown={(e) => e.key === 'Enter' && saveOnBlur()}
                    autoFocus
                    className="w-full h-5 px-1 text-xs border border-blue-400 rounded bg-white focus:outline-none"
                />
            );
        }

        const displayVal = isPhantom
            ? '-'
            : (type === 'number' ? rawValue : (rawValue || '-'));

        return (
            <span
                onDoubleClick={() => setEditingCell({ rowEta: row.eta_animali, field })}
                className="cursor-pointer hover:bg-white/50 px-1 py-0.5 rounded block h-5 truncate"
            >
                {displayVal as React.ReactNode}
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
                <h5 className="text-sm font-semibold text-gray-600">
                    Dati Settimanali <span className="text-gray-400 font-normal">(W20 – W{endAge})</span>
                </h5>
                <Button
                    size="sm"
                    variant={isEditingColumns ? "default" : "outline"}
                    onClick={() => setIsEditingColumns(!isEditingColumns)}
                    className="gap-1 h-7"
                >
                    <Settings className="w-3 h-3" />
                    {isEditingColumns ? "Fatto" : "Modifica tabella"}
                </Button>
            </div>

            <div className="overflow-auto max-h-[400px] border border-gray-100 rounded">
                <table className="w-full text-xs table-fixed">
                    <thead className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
                        <tr>
                            <th className="w-10 px-2 py-1.5 text-left font-medium text-gray-600">Età</th>
                            <th className="w-16 px-2 py-1.5 text-left font-medium text-gray-600">W Solare</th>
                            {visibleColumns.map(col => (
                                <th key={col.key} className="w-14 px-2 py-1.5 text-left font-medium text-gray-600">
                                    {isEditingColumns ? (
                                        <div className="flex items-center gap-0.5">
                                            <span className="truncate">{col.label}</span>
                                            <button
                                                onClick={() => removeColumn(col.key)}
                                                className="text-red-400 hover:text-red-600 flex-shrink-0"
                                                title={`Rimuovi colonna ${col.label}`}
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : col.label}
                                </th>
                            ))}
                            {isEditingColumns && hiddenColumns.length > 0 && (
                                <th className="px-2 py-1.5 w-20">
                                    <select
                                        className="text-xs bg-blue-50 border border-blue-200 rounded px-1 py-0.5 text-blue-600 cursor-pointer w-full"
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                addColumn(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                        value=""
                                    >
                                        <option value="">+ Aggiungi</option>
                                        {hiddenColumns.map(col => (
                                            <option key={col.key} value={col.key}>{col.label}</option>
                                        ))}
                                    </select>
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {displayRows.map(row => (
                            <tr
                                key={row.eta_animali}
                                className={`${row.id === null ? 'text-gray-300' : 'hover:bg-white/50'}`}
                            >
                                <td className="px-2 py-1 font-mono font-medium text-gray-700">{row.eta_animali}</td>
                                <td className="px-2 py-1 font-mono text-gray-400">{formatWSolare(row.anno, row.settimana)}</td>
                                {visibleColumns.map(col => (
                                    <td key={col.key} className="px-2 py-1">
                                        {renderEditableCell(row, col.key, col.type)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="text-[10px] text-gray-400">Doppio click per modificare. Salvataggio automatico.</p>
        </div>
    );
}
