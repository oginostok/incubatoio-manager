/**
 * T006 - Impostazioni Genetiche Gallina
 * T007 - Impostazioni Genetiche Gallo
 * Two side-by-side editable tables for managing genetics
 */
import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Plus, Trash2, Loader2, Check, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

interface GallinaRow {
    id: number;
    genetica_gallina: string;
}

interface GalloRow {
    id: number;
    nome: string;
}

type CellStatus = 'idle' | 'saving' | 'success' | 'error';

const API_BASE = API_BASE_URL;

// Reusable single-column genetics table component
interface SingleGeneticsTableProps {
    title: string;
    tableId: string;
    data: { id: number; value: string }[];
    onAdd: () => Promise<void>;
    onDelete: (id: number) => Promise<void>;
    onUpdate: (id: number, value: string) => Promise<void>;
}

function SingleGeneticsTable({ title, tableId, data, onAdd, onDelete, onUpdate }: SingleGeneticsTableProps) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");
    const [cellStatus, setCellStatus] = useState<{ [key: number]: CellStatus }>({});

    const handleDoubleClick = (id: number, value: string) => {
        setEditingId(id);
        setEditValue(value);
    };

    const handleBlur = async () => {
        if (editingId === null) return;

        const originalItem = data.find(d => d.id === editingId);
        if (!originalItem || editValue === originalItem.value) {
            setEditingId(null);
            return;
        }

        setCellStatus(prev => ({ ...prev, [editingId]: 'saving' }));
        try {
            await onUpdate(editingId, editValue);
            setCellStatus(prev => ({ ...prev, [editingId]: 'success' }));
            setTimeout(() => {
                setCellStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[editingId];
                    return newStatus;
                });
            }, 1000);
        } catch {
            setCellStatus(prev => ({ ...prev, [editingId]: 'error' }));
            setTimeout(() => {
                setCellStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[editingId];
                    return newStatus;
                });
            }, 2000);
        } finally {
            setEditingId(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleBlur();
        } else if (e.key === 'Escape') {
            setEditingId(null);
        }
    };

    const getBorderClass = (id: number) => {
        const status = cellStatus[id] || 'idle';
        if (status === 'saving') return 'border-blue-400 ring-2 ring-blue-200';
        if (status === 'success') return 'border-green-500 ring-2 ring-green-200';
        if (status === 'error') return 'border-red-500 ring-2 ring-red-200';
        if (editingId === id) return 'border-blue-400 ring-2 ring-blue-200';
        return 'border-transparent';
    };

    // Sort alphabetically, with empty/"-" at the end
    const sortedData = [...data].sort((a, b) => {
        const isEmptyA = a.value === '' || a.value === '-';
        const isEmptyB = b.value === '' || b.value === '-';
        if (isEmptyA && !isEmptyB) return 1;
        if (!isEmptyA && isEmptyB) return -1;
        return a.value.localeCompare(b.value);
    });

    return (
        <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    <p className="text-xs text-gray-400">{tableId}</p>
                </div>
                <Button onClick={onAdd} size="sm" className="gap-1">
                    <Plus className="w-3 h-3" />
                    Aggiungi
                </Button>
            </div>
            <Card>
                <CardContent className="p-0">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Nome
                                </th>
                                <th className="w-16 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">

                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {sortedData.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                                        Nessuna genetica. Aggiungi una nuova riga.
                                    </td>
                                </tr>
                            ) : (
                                sortedData.map(row => (
                                    <tr key={row.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2">
                                            {editingId === row.id ? (
                                                <Input
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={handleBlur}
                                                    onKeyDown={handleKeyDown}
                                                    className={`h-8 ${getBorderClass(row.id)}`}
                                                    autoFocus
                                                />
                                            ) : (
                                                <div
                                                    onDoubleClick={() => handleDoubleClick(row.id, row.value)}
                                                    className={`cursor-pointer hover:bg-gray-100 px-3 py-2 rounded transition-all border-2 ${getBorderClass(row.id)} relative min-h-[32px] flex items-center`}
                                                    title="Doppio click per modificare"
                                                >
                                                    {cellStatus[row.id] === 'saving' && <Loader2 className="w-3 h-3 animate-spin absolute right-1 top-1/2 -translate-y-1/2 text-blue-500" />}
                                                    {cellStatus[row.id] === 'success' && <Check className="w-3 h-3 absolute right-1 top-1/2 -translate-y-1/2 text-green-600" />}
                                                    {cellStatus[row.id] === 'error' && <X className="w-3 h-3 absolute right-1 top-1/2 -translate-y-1/2 text-red-600" />}
                                                    <span className="truncate">{row.value || '-'}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => onDelete(row.id)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}

export function GeneticsSettingsTable() {
    const [gallinaData, setGallinaData] = useState<GallinaRow[]>([]);
    const [galloData, setGalloData] = useState<GalloRow[]>([]);
    const [loading, setLoading] = useState(true);

    // Cycle settings state
    const [etaInizioCiclo, setEtaInizioCiclo] = useState(24);
    const [etaFineCiclo, setEtaFineCiclo] = useState(64);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [settingsStatus, setSettingsStatus] = useState<{ [key: string]: CellStatus }>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [gallinaRes, galloRes, settingsRes] = await Promise.all([
                fetch(`${API_BASE}/api/genetics`),
                fetch(`${API_BASE}/api/genetics-gallo`),
                fetch(`${API_BASE}/api/settings/cycle`)
            ]);
            const gallinaResult = await gallinaRes.json();
            const galloResult = await galloRes.json();
            const settingsResult = await settingsRes.json();

            setGallinaData(gallinaResult);
            setGalloData(galloResult);
            setEtaInizioCiclo(settingsResult.eta_inizio_ciclo || 24);
            setEtaFineCiclo(settingsResult.eta_fine_ciclo || 64);
        } catch (error) {
            console.error("Failed to fetch genetics data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Gallina handlers
    const handleAddGallina = async () => {
        const response = await fetch(`${API_BASE}/api/genetics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ genetica_gallina: '' })
        });
        const newRow = await response.json();
        setGallinaData([...gallinaData, newRow]);
    };

    const handleDeleteGallina = async (id: number) => {
        await fetch(`${API_BASE}/api/genetics/${id}`, { method: 'DELETE' });
        setGallinaData(gallinaData.filter(row => row.id !== id));
    };

    const handleUpdateGallina = async (id: number, value: string) => {
        await fetch(`${API_BASE}/api/genetics/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ genetica_gallina: value })
        });
        setGallinaData(gallinaData.map(row => row.id === id ? { ...row, genetica_gallina: value } : row));
    };

    // Gallo handlers
    const handleAddGallo = async () => {
        const response = await fetch(`${API_BASE}/api/genetics-gallo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: '' })
        });
        const newRow = await response.json();
        setGalloData([...galloData, newRow]);
    };

    const handleDeleteGallo = async (id: number) => {
        await fetch(`${API_BASE}/api/genetics-gallo/${id}`, { method: 'DELETE' });
        setGalloData(galloData.filter(row => row.id !== id));
    };

    const handleUpdateGallo = async (id: number, value: string) => {
        await fetch(`${API_BASE}/api/genetics-gallo/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: value })
        });
        setGalloData(galloData.map(row => row.id === id ? { ...row, nome: value } : row));
    };

    // Cycle settings handlers
    const handleSettingsDoubleClick = (field: string, value: number) => {
        setEditingField(field);
        setEditValue(String(value));
    };

    const handleSettingsBlur = async () => {
        if (!editingField) return;

        const newValue = parseInt(editValue, 10);
        if (isNaN(newValue)) {
            setEditingField(null);
            return;
        }

        setSettingsStatus(prev => ({ ...prev, [editingField]: 'saving' }));

        try {
            const payload = editingField === 'eta_inizio_ciclo'
                ? { eta_inizio_ciclo: newValue }
                : { eta_fine_ciclo: newValue };

            await fetch(`${API_BASE}/api/settings/cycle`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (editingField === 'eta_inizio_ciclo') {
                setEtaInizioCiclo(newValue);
            } else {
                setEtaFineCiclo(newValue);
            }

            setSettingsStatus(prev => ({ ...prev, [editingField]: 'success' }));
            setTimeout(() => {
                setSettingsStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[editingField!];
                    return newStatus;
                });
            }, 1000);
        } catch {
            setSettingsStatus(prev => ({ ...prev, [editingField]: 'error' }));
            setTimeout(() => {
                setSettingsStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[editingField!];
                    return newStatus;
                });
            }, 2000);
        } finally {
            setEditingField(null);
        }
    };

    const handleSettingsKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSettingsBlur();
        } else if (e.key === 'Escape') {
            setEditingField(null);
        }
    };

    const getSettingsBorderClass = (field: string) => {
        const status = settingsStatus[field] || 'idle';
        if (status === 'saving') return 'border-blue-400 ring-2 ring-blue-200';
        if (status === 'success') return 'border-green-500 ring-2 ring-green-200';
        if (status === 'error') return 'border-red-500 ring-2 ring-red-200';
        if (editingField === field) return 'border-blue-400 ring-2 ring-blue-200';
        return 'border-gray-200';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
        );
    }

    // Transform data to common format for the reusable component
    const gallinaItems = gallinaData.map(row => ({ id: row.id, value: row.genetica_gallina || '' }));
    const galloItems = galloData.map(row => ({ id: row.id, value: row.nome || '' }));

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Impostazioni Genetiche</h2>
                <p className="text-gray-500">Configura le genetiche disponibili - Doppio click per modificare</p>
            </div>

            <div className="flex gap-6">
                <SingleGeneticsTable
                    title="Genetica Gallina"
                    tableId="T006"
                    data={gallinaItems}
                    onAdd={handleAddGallina}
                    onDelete={handleDeleteGallina}
                    onUpdate={handleUpdateGallina}
                />
                <SingleGeneticsTable
                    title="Genetica Gallo"
                    tableId="T007"
                    data={galloItems}
                    onAdd={handleAddGallo}
                    onDelete={handleDeleteGallo}
                    onUpdate={handleUpdateGallo}
                />
            </div>

            {/* Cycle Settings Section */}
            <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Impostazione Ciclo Standard</h3>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-8">
                            {/* Età inizio ciclo */}
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-gray-700">Età inizio ciclo:</label>
                                {editingField === 'eta_inizio_ciclo' ? (
                                    <Input
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={handleSettingsBlur}
                                        onKeyDown={handleSettingsKeyDown}
                                        className={`w-20 h-9 text-center ${getSettingsBorderClass('eta_inizio_ciclo')}`}
                                        autoFocus
                                    />
                                ) : (
                                    <div
                                        onDoubleClick={() => handleSettingsDoubleClick('eta_inizio_ciclo', etaInizioCiclo)}
                                        className={`w-20 h-9 flex items-center justify-center cursor-pointer hover:bg-gray-100 rounded border-2 transition-all ${getSettingsBorderClass('eta_inizio_ciclo')} relative`}
                                        title="Doppio click per modificare"
                                    >
                                        {settingsStatus['eta_inizio_ciclo'] === 'saving' && <Loader2 className="w-3 h-3 animate-spin absolute right-1 text-blue-500" />}
                                        {settingsStatus['eta_inizio_ciclo'] === 'success' && <Check className="w-3 h-3 absolute right-1 text-green-600" />}
                                        <span className="font-mono font-medium">{etaInizioCiclo}</span>
                                    </div>
                                )}
                                <span className="text-sm text-gray-500">settimane</span>
                            </div>

                            {/* Età fine ciclo */}
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-gray-700">Età fine ciclo:</label>
                                {editingField === 'eta_fine_ciclo' ? (
                                    <Input
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={handleSettingsBlur}
                                        onKeyDown={handleSettingsKeyDown}
                                        className={`w-20 h-9 text-center ${getSettingsBorderClass('eta_fine_ciclo')}`}
                                        autoFocus
                                    />
                                ) : (
                                    <div
                                        onDoubleClick={() => handleSettingsDoubleClick('eta_fine_ciclo', etaFineCiclo)}
                                        className={`w-20 h-9 flex items-center justify-center cursor-pointer hover:bg-gray-100 rounded border-2 transition-all ${getSettingsBorderClass('eta_fine_ciclo')} relative`}
                                        title="Doppio click per modificare"
                                    >
                                        {settingsStatus['eta_fine_ciclo'] === 'saving' && <Loader2 className="w-3 h-3 animate-spin absolute right-1 text-blue-500" />}
                                        {settingsStatus['eta_fine_ciclo'] === 'success' && <Check className="w-3 h-3 absolute right-1 text-green-600" />}
                                        <span className="font-mono font-medium">{etaFineCiclo}</span>
                                    </div>
                                )}
                                <span className="text-sm text-gray-500">settimane</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

