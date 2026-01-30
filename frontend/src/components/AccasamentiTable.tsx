import { useState, useEffect } from "react";
import type { Lotto, LottoCreate, FarmStructure } from "@/types";
import { AllevamentiAPI, ProductionTablesAPI } from "@/lib/api";
import { getProductPastelBg } from "@/lib/productColors";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Plus, Trash2, Check, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface AccasamentiTableProps {
    lotti: Lotto[];
    farmStructure: FarmStructure;
    onUpdate: () => void;
}

const PRODUCT_OPTIONS = ["Granpollo", "Pollo70", "Color Yeald", "Ross"];

type CellStatus = 'idle' | 'saving' | 'success' | 'error';

interface EditingCell {
    lottoId: number;
    field: keyof Lotto;
    value: any;
    originalValue: any;
}

interface DeleteConfirmation {
    show: boolean;
    lottoId: number | null;
}

const API_BASE = API_BASE_URL;

export function AccasamentiTable({ lotti, farmStructure, onUpdate }: AccasamentiTableProps) {
    const [showForm, setShowForm] = useState(false);
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
    const [cellStatus, setCellStatus] = useState<{ [key: string]: CellStatus }>({});
    const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmation>({ show: false, lottoId: null });
    const [productionCurveOptions, setProductionCurveOptions] = useState<string[]>([]);
    const [gallinaOptions, setGallinaOptions] = useState<string[]>([]);
    const [galloOptions, setGalloOptions] = useState<string[]>([]);

    // Cycle settings state
    const [etaInizioCiclo, setEtaInizioCiclo] = useState(24);
    const [etaFineCiclo, setEtaFineCiclo] = useState(64);

    const [formData, setFormData] = useState<LottoCreate>({
        Allevamento: Object.keys(farmStructure)[0] || "",
        Capannone: "1",
        Razza: "",
        Razza_Gallo: "",
        Prodotto: PRODUCT_OPTIONS[0],
        Capi: 10000,
        Anno_Start: new Date().getFullYear(),
        Sett_Start: 1,
        Data_Fine_Prevista: "",
        Curva_Produzione: "ROSS 308 STANDARD",
        Attivo: true,
    });

    // Fetch production table headers, genetics, and cycle settings on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch production curves
                const response = await ProductionTablesAPI.getProductionTables();
                if (response.columns) {
                    const curveOptions = response.columns.filter((col: string) => col !== "W");
                    setProductionCurveOptions(curveOptions);
                }

                // Fetch genetics from T006 (Gallina) and T007 (Gallo), plus cycle settings
                const [gallinaRes, galloRes, settingsRes] = await Promise.all([
                    fetch(`${API_BASE}/api/genetics`),
                    fetch(`${API_BASE}/api/genetics-gallo`),
                    fetch(`${API_BASE}/api/settings/cycle`)
                ]);
                const gallinaData = await gallinaRes.json();
                const galloData = await galloRes.json();
                const settingsData = await settingsRes.json();

                // Extract unique values for Gallina and Gallo
                const gallinaSet = new Set<string>();
                const galloSet = new Set<string>();

                gallinaData.forEach((row: { genetica_gallina: string }) => {
                    if (row.genetica_gallina) gallinaSet.add(row.genetica_gallina);
                });
                galloData.forEach((row: { nome: string }) => {
                    if (row.nome) galloSet.add(row.nome);
                });

                setGallinaOptions(Array.from(gallinaSet));
                setGalloOptions(Array.from(galloSet));

                // Set cycle settings
                setEtaInizioCiclo(settingsData.eta_inizio_ciclo || 24);
                setEtaFineCiclo(settingsData.eta_fine_ciclo || 64);

                // Set default form values if options exist
                if (gallinaSet.size > 0) {
                    setFormData(prev => ({ ...prev, Razza: Array.from(gallinaSet)[0] }));
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            }
        };
        fetchData();
    }, []);

    const getCellKey = (lottoId: number, field: keyof Lotto) => `${lottoId}-${field}`;

    // Calculate current week from start date
    const getCurrentWeek = (lotto: Lotto) => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentWeek = getWeekNumber(now);

        const startYear = lotto.Anno_Start;
        const startWeek = lotto.Sett_Start;

        // Simple calculation: weeks difference
        const yearDiff = currentYear - startYear;
        const weekDiff = currentWeek - startWeek;

        return (yearDiff * 52) + weekDiff;
    };

    const getWeekNumber = (date: Date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    const getLottoStatus = (lotto: Lotto): { label: string; color: string } => {
        const currentWeeks = getCurrentWeek(lotto);

        // If Data_Fine_Prevista is set and passed, it's closed
        if (lotto.Data_Fine_Prevista) {
            // Parse date and check if it's in the past
            const endDate = new Date(lotto.Data_Fine_Prevista);
            if (endDate < new Date()) {
                return { label: "Chiuso", color: "text-red-600" };
            }
        }

        // Less than 24 weeks since start = Previsto (not producing yet)
        if (currentWeeks < 24) {
            return { label: "Previsto", color: "text-blue-600" };
        }

        // Otherwise, in production
        return { label: "In produzione", color: "text-green-600" };
    };

    // Helper: Get Nascita Ripr. as YYYY/WW from Anno_Start and Sett_Start
    const getNascitaRipr = (lotto: Lotto): string => {
        const year = lotto.Anno_Start || new Date().getFullYear();
        const week = lotto.Sett_Start || 1;
        return `${year}/${week.toString().padStart(2, '0')}`;
    };

    // Helper: Add weeks to YYYY/WW format
    const addWeeksToYYYYWW = (yyyyww: string, weeksToAdd: number): string => {
        if (!yyyyww || !yyyyww.includes('/')) {
            return yyyyww;
        }
        const parts = yyyyww.split('/');
        let year = parseInt(parts[0], 10);
        let week = parseInt(parts[1], 10) + weeksToAdd;

        // Handle rollover
        while (week > 52) {
            week -= 52;
            year += 1;
        }
        while (week < 1) {
            week += 52;
            year -= 1;
        }

        return `${year}/${week.toString().padStart(2, '0')}`;
    };

    // Helper: Calculate Inizio Ciclo (Nascita + EtaInizioCiclo)
    const getInizioCiclo = (lotto: Lotto): string => {
        const nascita = getNascitaRipr(lotto);
        return addWeeksToYYYYWW(nascita, etaInizioCiclo);
    };

    // Helper: Get or calculate Fine Ciclo (default: Nascita + EtaFineCiclo, or user-modified value)
    const getFineCiclo = (lotto: Lotto): string => {
        // If user has set a custom value, use it
        if (lotto.Data_Fine_Prevista && lotto.Data_Fine_Prevista.includes('/')) {
            return lotto.Data_Fine_Prevista;
        }
        // Otherwise calculate default
        const nascita = getNascitaRipr(lotto);
        return addWeeksToYYYYWW(nascita, etaFineCiclo);
    };

    // Helper: Calculate Età Fine Ciclo (difference between Fine Ciclo and Nascita Ripr.)
    const getEtaFineCicloValue = (lotto: Lotto): number => {
        const nascita = getNascitaRipr(lotto);
        const fine = getFineCiclo(lotto);

        if (!nascita.includes('/') || !fine.includes('/')) {
            return etaFineCiclo;
        }

        const nascitaParts = nascita.split('/');
        const fineParts = fine.split('/');

        const nascitaYear = parseInt(nascitaParts[0], 10);
        const nascitaWeek = parseInt(nascitaParts[1], 10);
        const fineYear = parseInt(fineParts[0], 10);
        const fineWeek = parseInt(fineParts[1], 10);

        return (fineYear - nascitaYear) * 52 + (fineWeek - nascitaWeek);
    };

    // Helper: Generate user-friendly Cycle ID
    // Format: [id]-[Allevamento first 3 letters]-[Anno_Start]-[Razza short]
    const getUserId = (lotto: Lotto): string => {
        const id = lotto.id || 0;
        const allevamento = (lotto.Allevamento || 'XXX').substring(0, 3);
        const anno = lotto.Anno_Start || new Date().getFullYear();
        // Take first part of Razza before any space (e.g., "JA87 STANDARD" -> "JA87")
        const razzaParts = (lotto.Razza || 'N/A').split(' ');
        const razzaShort = razzaParts[0];
        return `${id}${allevamento.toUpperCase()}${anno}${razzaShort}`;
    };

    // Simple YYYY/WW adjustment with pure arithmetic
    const adjustEndDate = async (lotto: Lotto, weeks: number) => {
        if (!lotto.id) return;

        // Get current fine ciclo value (either saved or calculated default)
        const currentValue = getFineCiclo(lotto);

        let year: number;
        let week: number;

        // Parse current value - expect YYYY/WW format
        if (currentValue.includes('/')) {
            const parts = currentValue.split('/');
            year = parseInt(parts[0], 10);
            week = parseInt(parts[1], 10);
        } else {
            // Fallback: invalid state, should never happen with getFineCiclo
            return;
        }

        // Simple arithmetic: add/subtract weeks
        week = week + weeks;

        // Handle rollover using while loops for proper multi-year handling
        while (week > 52) {
            week -= 52;
            year += 1;
        }
        while (week < 1) {
            week += 52;
            year -= 1;
        }

        // Format as YYYY/WW
        const newDate = `${year}/${week.toString().padStart(2, '0')}`;

        // Save immediately
        const cellKey = getCellKey(lotto.id, 'Data_Fine_Prevista');
        setCellStatus(prev => ({ ...prev, [cellKey]: 'saving' }));

        try {
            await AllevamentiAPI.updateLotto(lotto.id, { Data_Fine_Prevista: newDate });
            setCellStatus(prev => ({ ...prev, [cellKey]: 'success' }));

            setTimeout(() => {
                setCellStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[cellKey];
                    return newStatus;
                });
            }, 1000);

            onUpdate();
        } catch (error) {
            console.error("Failed to update end date", error);
            setCellStatus(prev => ({ ...prev, [cellKey]: 'error' }));

            setTimeout(() => {
                setCellStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[cellKey];
                    return newStatus;
                });
            }, 2000);
        }
    };



    const handleDoubleClick = (lotto: Lotto, field: keyof Lotto) => {
        if (!lotto.id) return;
        setEditingCell({
            lottoId: lotto.id,
            field,
            value: lotto[field],
            originalValue: lotto[field]
        });
    };

    const handleCellBlur = async () => {
        if (!editingCell) return;

        const { lottoId, field, value, originalValue } = editingCell;

        // If value hasn't changed, just close the editor
        if (value === originalValue) {
            setEditingCell(null);
            return;
        }

        // Save the changes
        const cellKey = getCellKey(lottoId, field);
        setCellStatus(prev => ({ ...prev, [cellKey]: 'saving' }));

        try {
            await AllevamentiAPI.updateLotto(lottoId, { [field]: value });
            setCellStatus(prev => ({ ...prev, [cellKey]: 'success' }));

            // Clear success indicator after 1 second
            setTimeout(() => {
                setCellStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[cellKey];
                    return newStatus;
                });
            }, 1000);

            setEditingCell(null);
            onUpdate();
        } catch (error) {
            console.error("Failed to update lotto", error);
            setCellStatus(prev => ({ ...prev, [cellKey]: 'error' }));

            // Clear error indicator after 2 seconds and rollback
            setTimeout(() => {
                setCellStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[cellKey];
                    return newStatus;
                });
                setEditingCell(null);
            }, 2000);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCellBlur();
        } else if (e.key === 'Escape') {
            setEditingCell(null);
        }
    };

    const renderEditableCell = (lotto: Lotto, field: keyof Lotto, type: 'text' | 'number' | 'select' = 'text', options?: string[]) => {
        if (!lotto.id) return null;

        const cellKey = getCellKey(lotto.id, field);
        const status = cellStatus[cellKey] || 'idle';
        const isEditing = editingCell?.lottoId === lotto.id && editingCell?.field === field;
        const value = lotto[field];

        // Status indicator classes
        const getBorderClass = () => {
            if (status === 'saving') return 'border-blue-400 ring-2 ring-blue-200';
            if (status === 'success') return 'border-green-500 ring-2 ring-green-200';
            if (status === 'error') return 'border-red-500 ring-2 ring-red-200';
            if (isEditing) return 'border-blue-400 ring-2 ring-blue-200';
            return 'border-transparent';
        };

        if (isEditing && type === 'select' && options) {
            // Save function that works directly with the value (not dependent on editingCell state)
            const saveSelectValue = async (newValue: string) => {
                const { lottoId, field, originalValue } = editingCell;

                // If value hasn't changed, just close
                if (newValue === originalValue) {
                    setEditingCell(null);
                    return;
                }

                // Save the changes
                const cellKey = getCellKey(lottoId, field);
                setCellStatus(prev => ({ ...prev, [cellKey]: 'saving' }));
                setEditingCell(null); // Close immediately

                try {
                    await AllevamentiAPI.updateLotto(lottoId, { [field]: newValue });
                    setCellStatus(prev => ({ ...prev, [cellKey]: 'success' }));

                    setTimeout(() => {
                        setCellStatus(prev => {
                            const newStatus = { ...prev };
                            delete newStatus[cellKey];
                            return newStatus;
                        });
                    }, 1000);

                    onUpdate();
                } catch (error) {
                    console.error("Failed to update lotto", error);
                    setCellStatus(prev => ({ ...prev, [cellKey]: 'error' }));

                    setTimeout(() => {
                        setCellStatus(prev => {
                            const newStatus = { ...prev };
                            delete newStatus[cellKey];
                            return newStatus;
                        });
                    }, 2000);
                }
            };

            return (
                <div className="relative w-full">
                    <Select
                        value={editingCell.value || ""}
                        onValueChange={(val) => {
                            // Save directly with the new value - don't depend on state
                            saveSelectValue(val);
                        }}
                        onOpenChange={(open) => {
                            // If closing without selecting (clicking outside), cancel edit
                            if (!open) {
                                setEditingCell(null);
                            }
                        }}
                        defaultOpen={true}
                    >
                        <SelectTrigger className={`h-8 w-full ${getBorderClass()}`} autoFocus>
                            <SelectValue placeholder="Seleziona..." />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );
        }

        if (isEditing) {
            return (
                <div className="relative w-full">
                    <Input
                        type={type}
                        value={editingCell.value || ''}
                        onChange={(e) => setEditingCell({
                            ...editingCell,
                            value: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value
                        })}
                        onBlur={handleCellBlur}
                        onKeyDown={handleKeyDown}
                        className={`h-8 w-full ${getBorderClass()}`}
                        autoFocus
                        min={type === 'number' && field === 'Sett_Start' ? 1 : undefined}
                        max={type === 'number' && field === 'Sett_Start' ? 52 : undefined}
                    />
                </div>
            );
        }

        return (
            <div
                onDoubleClick={() => handleDoubleClick(lotto, field)}
                className={`cursor-pointer hover:bg-gray-50 px-2 py-1 rounded transition-all border-2 ${getBorderClass()} relative group w-full min-h-[32px] flex items-center`}
                title="Doppio click per modificare"
            >
                {status === 'saving' && <Loader2 className="w-3 h-3 animate-spin absolute right-1 top-1 text-blue-500" />}
                {status === 'success' && <Check className="w-3 h-3 absolute right-1 top-1 text-green-600" />}
                {status === 'error' && <X className="w-3 h-3 absolute right-1 top-1 text-red-600" />}
                <span className="truncate">{type === 'number' && typeof value === 'number' ? value.toLocaleString('it-IT') : (value || '-')}</span>
            </div>
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await AllevamentiAPI.createLotto(formData);
            setShowForm(false);
            setFormData({
                Allevamento: Object.keys(farmStructure)[0] || "",
                Capannone: "1",
                Razza: gallinaOptions[0] || "",
                Razza_Gallo: "",
                Prodotto: PRODUCT_OPTIONS[0],
                Capi: 10000,
                Anno_Start: new Date().getFullYear(),
                Sett_Start: 1,
                Data_Fine_Prevista: "",
                Curva_Produzione: "ROSS 308 STANDARD",
                Attivo: true,
            });
            onUpdate();
        } catch (error) {
            console.error("Failed to create lotto", error);
        }
    };

    const handleDeleteClick = (id: number) => {
        setDeleteConfirm({ show: true, lottoId: id });
    };

    const handleDeleteConfirm = async () => {
        if (deleteConfirm.lottoId) {
            try {
                await AllevamentiAPI.deleteLotto(deleteConfirm.lottoId);
                setDeleteConfirm({ show: false, lottoId: null });
                onUpdate();
            } catch (error) {
                console.error("Failed to delete lotto", error);
            }
        }
    };

    const handleDeleteCancel = () => {
        setDeleteConfirm({ show: false, lottoId: null });
    };

    const activeLotti = lotti
        .filter(l => l.Attivo && l.id !== undefined && l.id !== null)
        .sort((a, b) => {
            if (a.Anno_Start !== b.Anno_Start) return b.Anno_Start - a.Anno_Start;
            return b.Sett_Start - a.Sett_Start;
        });

    return (
        <div className="space-y-6">
            {/* Delete Confirmation Modal */}
            {deleteConfirm.show && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-96">
                        <CardHeader>
                            <CardTitle className="text-red-600">Conferma Eliminazione</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-gray-700">L'azione non può essere annullata. Confermi cancellazione?</p>
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={handleDeleteCancel}>
                                    Annulla
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDeleteConfirm}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    Confermo
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Impostazioni Accasamenti</h2>
                    <p className="text-xs text-gray-400">T001</p>
                    <p className="text-gray-500">Gestisci tutti i lotti di allevamento - Doppio click per modificare</p>
                </div>
                <Button onClick={() => setShowForm(!showForm)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nuovo Accasamento
                </Button>
            </div>

            {/* Form for New Lotto */}
            {showForm && (
                <Card>
                    <CardHeader>
                        <CardTitle>Aggiungi Nuovo Accasamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-sm font-medium block mb-2">Allevamento</label>
                                    <Select
                                        value={formData.Allevamento}
                                        onValueChange={(val) => setFormData({ ...formData, Allevamento: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(farmStructure).map(farm => (
                                                <SelectItem key={farm} value={farm}>{farm}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium block mb-2">Capannone</label>
                                    <Input
                                        value={formData.Capannone}
                                        onChange={(e) => setFormData({ ...formData, Capannone: e.target.value })}
                                        placeholder="es. 1, 1A, 2B"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium block mb-2">Gallina</label>
                                    <Select
                                        value={formData.Razza}
                                        onValueChange={(val) => setFormData({ ...formData, Razza: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {gallinaOptions.map((g: string) => (
                                                <SelectItem key={g} value={g}>{g}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium block mb-2">Prodotto</label>
                                    <Select
                                        value={formData.Prodotto}
                                        onValueChange={(val) => setFormData({ ...formData, Prodotto: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PRODUCT_OPTIONS.map(p => (
                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium block mb-2">Capi</label>
                                    <Input
                                        type="number"
                                        value={formData.Capi}
                                        onChange={(e) => setFormData({ ...formData, Capi: parseInt(e.target.value) })}
                                        step={500}
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium block mb-2">Anno Acc.</label>
                                    <Input
                                        type="number"
                                        value={formData.Anno_Start}
                                        onChange={(e) => setFormData({ ...formData, Anno_Start: parseInt(e.target.value) })}
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium block mb-2">Settimana Acc.</label>
                                    <Input
                                        type="number"
                                        value={formData.Sett_Start}
                                        onChange={(e) => setFormData({ ...formData, Sett_Start: parseInt(e.target.value) })}
                                        min={1}
                                        max={52}
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium block mb-2">Gallo</label>
                                    <Select
                                        value={formData.Razza_Gallo || ""}
                                        onValueChange={(val) => setFormData({ ...formData, Razza_Gallo: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Opzionale" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {galloOptions.map((g: string) => (
                                                <SelectItem key={g} value={g}>{g}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium block mb-2">Usa dati di:</label>
                                    <Select
                                        value={formData.Curva_Produzione || ""}
                                        onValueChange={(val) => setFormData({ ...formData, Curva_Produzione: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleziona curva" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {productionCurveOptions.map(curve => (
                                                <SelectItem key={curve} value={curve}>{curve}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit">Aggiungi</Button>
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                                    Annulla
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Lotti Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full table-fixed">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allevamento</th>
                                    <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cap.</th>
                                    <th className="w-40 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gallina</th>
                                    <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gallo</th>
                                    <th className="w-40 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usa dati di:</th>
                                    <th className="w-28 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prodotto</th>
                                    <th className="w-24 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Capi</th>
                                    <th className="w-24 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase" title="Inserire data nascita pulcini">Nascita Ripr.</th>
                                    <th className="w-24 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase" title="Entrata in produzione del capannone. Questa impostazione è modificabile nel menu Impostazioni Genetiche">Inizio Ciclo</th>
                                    <th className="w-40 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Fine Ciclo</th>
                                    <th className="w-20 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Età Fine</th>
                                    <th className="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stato</th>
                                    <th className="w-24 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {activeLotti.length === 0 ? (
                                    <tr>
                                        <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                                            Nessun lotto attivo. Aggiungi un nuovo accasamento.
                                        </td>
                                    </tr>
                                ) : (
                                    activeLotti.map(lotto => {
                                        const status = getLottoStatus(lotto);
                                        const cellKey = lotto.id ? getCellKey(lotto.id, 'Data_Fine_Prevista') : '';
                                        const dateStatus = cellStatus[cellKey] || 'idle';

                                        return lotto.id && (
                                            <tr key={lotto.id} className={`hover:${getProductPastelBg(lotto.Prodotto)}`}>
                                                <td className="px-4 py-3 text-sm font-medium">
                                                    {renderEditableCell(lotto, 'Allevamento', 'select', Object.keys(farmStructure))}
                                                    <span className="block text-[10px] text-gray-400 font-mono mt-0.5" title="ID Ciclo">
                                                        {getUserId(lotto)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {renderEditableCell(lotto, 'Capannone', 'text')}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {renderEditableCell(lotto, 'Razza', 'select', gallinaOptions)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500">
                                                    {renderEditableCell(lotto, 'Razza_Gallo', 'select', galloOptions)}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {renderEditableCell(lotto, 'Curva_Produzione', 'select', productionCurveOptions)}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {renderEditableCell(lotto, 'Prodotto', 'select', PRODUCT_OPTIONS)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right font-mono">
                                                    {renderEditableCell(lotto, 'Capi', 'number')}
                                                </td>
                                                {/* Nascita Ripr. - Combined display with tooltip */}
                                                <td className="px-4 py-3 text-sm text-center" title="Inserire data nascita pulcini">
                                                    <div
                                                        className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                                                        onDoubleClick={() => handleDoubleClick(lotto, 'Anno_Start')}
                                                    >
                                                        {getNascitaRipr(lotto)}
                                                    </div>
                                                </td>
                                                {/* Inizio Ciclo - Read only, calculated */}
                                                <td
                                                    className="px-4 py-3 text-sm text-center text-gray-500"
                                                    title="Entrata in produzione del capannone. Questa impostazione è modificabile nel menu Impostazioni Genetiche"
                                                >
                                                    {getInizioCiclo(lotto)}
                                                </td>
                                                {/* Fine Ciclo - Editable with buttons */}
                                                <td className="px-4 py-3 text-sm text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                adjustEndDate(lotto, -1);
                                                            }}
                                                            className="h-6 w-6 p-0 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center border-0 cursor-pointer relative z-10 pointer-events-auto"
                                                            title="Riduci di 1 settimana"
                                                        >
                                                            <ChevronLeft className="w-4 h-4 pointer-events-none" />
                                                        </button>
                                                        <div className="relative min-w-[80px] text-center">
                                                            {dateStatus === 'saving' && <Loader2 className="w-3 h-3 animate-spin absolute -left-4 top-1/2 -translate-y-1/2 text-blue-500" />}
                                                            {dateStatus === 'success' && <Check className="w-3 h-3 absolute -left-4 top-1/2 -translate-y-1/2 text-green-600" />}
                                                            <span className="font-mono">{getFineCiclo(lotto)}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                adjustEndDate(lotto, 1);
                                                            }}
                                                            className="h-6 w-6 p-0 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center border-0 cursor-pointer relative z-10 pointer-events-auto"
                                                            title="Aumenta di 1 settimana"
                                                        >
                                                            <ChevronRight className="w-4 h-4 pointer-events-none" />
                                                        </button>
                                                    </div>
                                                </td>
                                                {/* Età Fine Ciclo - Calculated */}
                                                <td className="px-4 py-3 text-sm text-center font-mono text-gray-600">
                                                    {getEtaFineCicloValue(lotto)}
                                                </td>
                                                {/* Stato */}
                                                <td className="px-4 py-3 text-sm text-center">
                                                    <span className={`font-semibold ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteClick(lotto.id)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
