import { useState } from "react";
import type { Lotto } from "@/types";
import { AllevamentiAPI } from "@/lib/api";
import { getProductPastelBg } from "@/lib/productColors";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { X, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { CycleWeeklyTable } from "./CycleWeeklyTable";

interface ShedDetailPanelProps {
    lotti: Lotto[];
    onUpdate: () => void;
    onClose: () => void;
}

// Calculate age in weeks
function calculateAgeWeeks(yearStart: number, weekStart: number): number {
    const today = new Date();
    const startDate = getDateFromYearWeek(yearStart, weekStart);
    const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.floor(diffDays / 7));
}

function getDateFromYearWeek(year: number, week: number): Date {
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
    return monday;
}

const GENETICS_OPTIONS = ["JA57 STANDARD", "JA57K STANDARD", "JA57KI STANDARD", "JA87 STANDARD", "RANGER STANDARD", "ROSS 308 STANDARD"];
const PRODUCT_OPTIONS = ["Granpollo", "Pollo70", "Color Yeald", "Ross"];

export function ShedDetailPanel({ lotti, onUpdate, onClose }: ShedDetailPanelProps) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<Partial<Lotto>>({});
    const [expandedAdvanced, setExpandedAdvanced] = useState<number | null>(null);

    // Generate user-friendly Cycle ID
    const getUserId = (lotto: Lotto): string => {
        const id = lotto.id || 0;
        const allevamento = (lotto.Allevamento || 'XXX').substring(0, 3).toUpperCase();
        const anno = lotto.Anno_Start || new Date().getFullYear();
        const razzaParts = (lotto.Razza || 'N/A').split(' ');
        const razzaShort = razzaParts[0];
        return `${id}${allevamento}${anno}${razzaShort}`;
    };

    const handleEdit = (lotto: Lotto) => {
        setEditingId(lotto.id);
        setFormData(lotto);
    };

    const handleSave = async () => {
        if (editingId && formData) {
            try {
                await AllevamentiAPI.updateLotto(editingId, formData);
                setEditingId(null);
                setFormData({});
                onUpdate();
            } catch (error) {
                console.error("Failed to update lotto", error);
            }
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm("Sei sicuro di voler eliminare questo lotto?")) {
            try {
                await AllevamentiAPI.updateLotto(id, { Attivo: false });
                onUpdate();
                onClose();
            } catch (error) {
                console.error("Failed to delete lotto", error);
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-700">Dettagli Capannone</h4>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {lotti.map(lotto => {
                const isEditing = editingId === lotto.id;
                const ageWeeks = calculateAgeWeeks(lotto.Anno_Start, lotto.Sett_Start);

                return (
                    <div key={lotto.id} className={`${getProductPastelBg(lotto.Prodotto)} rounded-xl p-4 space-y-3`}>
                        {/* Section + User ID below */}
                        <div className="space-y-1">
                            {lotti.length > 1 && (
                                <div className="text-sm font-medium text-gray-500">Sezione: {lotto.Capannone}</div>
                            )}
                            <span className="text-[10px] font-mono text-gray-500" title="ID Ciclo">
                                {getUserId(lotto)}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {/* Genetica Gallina */}
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Genetica Gallina</label>
                                {isEditing ? (
                                    <Select
                                        value={formData.Razza}
                                        onValueChange={(val) => setFormData({ ...formData, Razza: val })}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {GENETICS_OPTIONS.map(g => (
                                                <SelectItem key={g} value={g}>{g}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="text-sm font-medium">{lotto.Razza}</div>
                                )}
                            </div>

                            {/* Genetica Gallo */}
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Genetica Gallo</label>
                                {isEditing ? (
                                    <Input
                                        value={formData.Razza_Gallo || ''}
                                        onChange={(e) => setFormData({ ...formData, Razza_Gallo: e.target.value })}
                                        className="h-9"
                                    />
                                ) : (
                                    <div className="text-sm font-medium">{lotto.Razza_Gallo || '-'}</div>
                                )}
                            </div>

                            {/* Prodotto */}
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Prodotto</label>
                                {isEditing ? (
                                    <Select
                                        value={formData.Prodotto}
                                        onValueChange={(val) => setFormData({ ...formData, Prodotto: val })}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PRODUCT_OPTIONS.map(p => (
                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="text-sm font-medium">{lotto.Prodotto}</div>
                                )}
                            </div>

                            {/* Capi */}
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Capi Presenti</label>
                                {isEditing ? (
                                    <Input
                                        type="number"
                                        value={formData.Capi}
                                        onChange={(e) => setFormData({ ...formData, Capi: parseInt(e.target.value) })}
                                        className="h-9"
                                        step={100}
                                    />
                                ) : (
                                    <div className="text-sm font-medium">{lotto.Capi != null ? lotto.Capi.toLocaleString('it-IT') : '-'}</div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {/* Anno Accasamento */}
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Anno Acc.</label>
                                <div className="text-sm font-medium">{lotto.Anno_Start}</div>
                            </div>

                            {/* Settimana Accasamento */}
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Settimana Acc.</label>
                                <div className="text-sm font-medium">{lotto.Sett_Start}</div>
                            </div>

                            {/* Età */}
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Età</label>
                                <div className="text-sm font-bold text-green-600">{ageWeeks} settimane</div>
                            </div>

                            {/* Data Fine */}
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Fine Ciclo</label>
                                {isEditing ? (
                                    <Input
                                        value={formData.Data_Fine_Prevista || ''}
                                        onChange={(e) => setFormData({ ...formData, Data_Fine_Prevista: e.target.value })}
                                        placeholder="YYYY/WW"
                                        className="h-9"
                                    />
                                ) : (
                                    <div className="text-sm font-medium">{lotto.Data_Fine_Prevista || '-'}</div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t">
                            {isEditing ? (
                                <>
                                    <Button size="sm" onClick={handleSave} variant="default">
                                        Salva
                                    </Button>
                                    <Button size="sm" onClick={() => setEditingId(null)} variant="outline">
                                        Annulla
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button size="sm" onClick={() => handleEdit(lotto)} variant="outline">
                                        Modifica
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => setExpandedAdvanced(expandedAdvanced === lotto.id ? null : lotto.id)}
                                        variant="outline"
                                        className="gap-1"
                                    >
                                        {expandedAdvanced === lotto.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        Dati avanzati
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => handleDelete(lotto.id)}
                                        variant="destructive"
                                        className="gap-1"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Elimina
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Advanced Weekly Data Table */}
                        {expandedAdvanced === lotto.id && (
                            <CycleWeeklyTable
                                lottoId={lotto.id}
                                annoStart={lotto.Anno_Start}
                                settStart={lotto.Sett_Start}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
