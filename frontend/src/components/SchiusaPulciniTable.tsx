import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { Plus, Calendar, ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';
import { Button } from './ui/button';

interface IncubationBatch {
    id: number;
    prodotto: string;
    nome: string;
    origine: string;
    capannone: string;
    uova_partita: number;
    uova_utilizzate: number;
}

interface Incubation {
    id: number;
    data_incubazione: string;
    data_schiusa: string;
    incubatrici: string | null;
    operatore: string | null;
    batches: IncubationBatch[];
}

interface Trasferimento {
    id: number;
    incubation_id: number;
    batch_id: number | null;
    data_trasferimento: string;
    n_uova_trasferite: number;
    n_uova_scartate: number;
}

interface Schiusa {
    id: number;
    incubation_id: number;
    batch_id: number | null;
    data_schiusa: string;
    n_pulcini_nati: number;
    n_uova_trasferite_rif: number;
    n_uova_incubate: number;
    nato_su_incubato: number;
    nato_su_fertile: number;
}

const PRODUCT_COLORS: Record<string, string> = {
    "Granpollo": "bg-green-100 text-green-800 border-green-300",
    "Pollo70": "bg-blue-100 text-blue-800 border-blue-300",
    "Color Yeald": "bg-red-100 text-red-800 border-red-300",
    "Ross": "bg-orange-100 text-orange-800 border-orange-300",
};

const formatNumber = (n: number) =>
    n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const days = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
    const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
        "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

export default function SchiusaPulciniTable() {
    const [incubazioni, setIncubazioni] = useState<Incubation[]>([]);
    const [trasferimenti, setTrasferimenti] = useState<Trasferimento[]>([]);
    const [schiuse, setSchiuse] = useState<Schiusa[]>([]);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Modal state
    const [showPickerModal, setShowPickerModal] = useState(false);
    const [pickerIncId, setPickerIncId] = useState<string>('');

    // New card (not yet saved)
    const [newCardIncId, setNewCardIncId] = useState<number | null>(null);

    // Per-card editing: incubation_id -> { batch_id -> pulcini_nati value }
    const [editDate, setEditDate] = useState<Record<number, string>>({});
    const [editRows, setEditRows] = useState<Record<number, Record<number, string>>>({});
    const [saving, setSaving] = useState<number | null>(null);

    const load = async () => {
        try {
            const [schRes, incRes, trasRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/schiusa-pulcini`),
                fetch(`${API_BASE_URL}/api/incubazioni`),
                fetch(`${API_BASE_URL}/api/trasferimenti-incubazione`),
            ]);
            setSchiuse(await schRes.json());
            const incData = await incRes.json();
            setIncubazioni(incData.incubazioni || incData || []);
            setTrasferimenti(await trasRes.json());
        } catch { /* ignore */ }
    };

    useEffect(() => { load(); }, []);

    // Build per-incubation maps
    const trasfByIncId: Record<number, Trasferimento[]> = {};
    for (const t of trasferimenti) {
        if (!trasfByIncId[t.incubation_id]) trasfByIncId[t.incubation_id] = [];
        trasfByIncId[t.incubation_id].push(t);
    }

    const schiuseByIncId: Record<number, Schiusa[]> = {};
    for (const s of schiuse) {
        if (!schiuseByIncId[s.incubation_id]) schiuseByIncId[s.incubation_id] = [];
        schiuseByIncId[s.incubation_id].push(s);
    }

    const incIdsWithSchiusa = new Set(schiuse.map(s => s.incubation_id));
    const cardIds = new Set([...incIdsWithSchiusa]);
    if (newCardIncId !== null) cardIds.add(newCardIncId);

    const sortedCardIds = [...cardIds].sort((a, b) => {
        const ia = incubazioni.find(i => i.id === a);
        const ib = incubazioni.find(i => i.id === b);
        if (!ia || !ib) return 0;
        return ib.data_incubazione.localeCompare(ia.data_incubazione);
    });

    // Picker: only incubazioni that have been transferred
    const incIdsWithTrasf = new Set(trasferimenti.map(t => t.incubation_id));
    const pickerOptions = incubazioni.filter(i => incIdsWithTrasf.has(i.id));

    // Expand/collapse card — pre-populates edit state from existing records on open
    const handleToggleExpand = (incId: number) => {
        if (expandedId === incId) {
            setExpandedId(null);
            return;
        }
        const existingRecords = schiuse.filter(s => s.incubation_id === incId);
        if (existingRecords.length > 0) {
            if (editDate[incId] === undefined) {
                setEditDate(prev => ({ ...prev, [incId]: existingRecords[0].data_schiusa }));
            }
            if (editRows[incId] === undefined) {
                const rows: Record<number, string> = {};
                for (const s of existingRecords) {
                    if (s.batch_id !== null) rows[s.batch_id] = String(s.n_pulcini_nati);
                }
                setEditRows(prev => ({ ...prev, [incId]: rows }));
            }
        }
        setExpandedId(incId);
    };

    // Picker
    const handleOpenPicker = () => {
        setPickerIncId('');
        setShowPickerModal(true);
    };

    const handlePickerConfirm = () => {
        if (!pickerIncId) return;
        const id = Number(pickerIncId);
        setNewCardIncId(id);
        setExpandedId(id);
        const today = new Date().toISOString().split('T')[0];
        setEditDate(prev => ({ ...prev, [id]: prev[id] ?? today }));
        setShowPickerModal(false);
    };

    // Save card
    const handleSaveCard = async (incId: number) => {
        const inc = incubazioni.find(i => i.id === incId);
        if (!inc) return;

        const date = editDate[incId] || (schiuseByIncId[incId]?.[0]?.data_schiusa) || '';
        if (!date) {
            alert('Inserisci la data della schiusa prima di salvare.');
            return;
        }

        const trasfRecords = trasfByIncId[incId] || [];
        if (trasfRecords.length === 0) {
            alert('Nessun trasferimento trovato per questa incubazione.');
            return;
        }

        // Build existing schiusa by batch for merge
        const existingByBatch: Record<number, number> = {};
        for (const s of (schiuseByIncId[incId] || [])) {
            if (s.batch_id !== null) existingByBatch[s.batch_id] = s.n_pulcini_nati;
        }

        const localRows = editRows[incId] || {};
        const toSave: Array<{ trasfRec: Trasferimento; value: number }> = [];

        for (const trasfRec of trasfRecords) {
            if (trasfRec.batch_id === null) continue;
            const local = localRows[trasfRec.batch_id];
            const existing = existingByBatch[trasfRec.batch_id];
            const raw = local !== undefined ? local : (existing !== undefined ? String(existing) : '');
            if (raw !== '') toSave.push({ trasfRec, value: Number(raw) || 0 });
        }

        if (toSave.length === 0) {
            alert('Inserisci almeno un valore "Pulcini nati" prima di salvare.');
            return;
        }

        setSaving(incId);
        try {
            // Delete existing schiusa records for this incubazione, then recreate
            const existingSchiuse = schiuseByIncId[incId] || [];
            await Promise.all(
                existingSchiuse.map(s =>
                    fetch(`${API_BASE_URL}/api/schiusa-pulcini/${s.id}`, { method: 'DELETE' })
                )
            );

            await Promise.all(
                toSave.map(({ trasfRec, value }) => {
                    const uovaIncubate = trasfRec.n_uova_trasferite + (trasfRec.n_uova_scartate || 0);
                    return fetch(`${API_BASE_URL}/api/schiusa-pulcini`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            incubation_id: incId,
                            batch_id: trasfRec.batch_id,
                            trasferimento_id: trasfRec.id,
                            data_schiusa: date,
                            n_pulcini_nati: value,
                            n_uova_trasferite_rif: trasfRec.n_uova_trasferite,
                            n_uova_incubate: uovaIncubate,
                            destinazione: '',
                            note: '',
                        }),
                    });
                })
            );

            if (newCardIncId === incId) setNewCardIncId(null);
            await load();
        } finally {
            setSaving(null);
        }
    };

    // Delete entire card (all schiusa records for that incubazione)
    const handleDeleteCard = async (incId: number) => {
        const existing = schiuseByIncId[incId] || [];
        if (existing.length === 0) {
            if (newCardIncId === incId) setNewCardIncId(null);
            if (expandedId === incId) setExpandedId(null);
            return;
        }
        if (!confirm('Eliminare tutti i dati di schiusa per questa incubazione?')) return;
        await Promise.all(
            existing.map(s =>
                fetch(`${API_BASE_URL}/api/schiusa-pulcini/${s.id}`, { method: 'DELETE' })
            )
        );
        if (newCardIncId === incId) setNewCardIncId(null);
        if (expandedId === incId) setExpandedId(null);
        await load();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Schiusa Pulcini</h2>
                </div>
                <Button
                    onClick={handleOpenPicker}
                    className="gap-2 bg-amber-600 hover:bg-amber-700"
                >
                    <Plus className="w-4 h-4" />
                    Nuova Schiusa
                </Button>
            </div>

            {/* Cards list */}
            {sortedCardIds.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                        <p className="text-amber-700 text-lg mb-2">Nessuna schiusa registrata</p>
                        <p className="text-gray-600">Clicca su "Nuova Schiusa" per iniziare</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedCardIds.map(incId => {
                        const inc = incubazioni.find(i => i.id === incId);
                        if (!inc) return null;

                        const existingSchiuse = schiuseByIncId[incId] || [];
                        const trasfRecords = trasfByIncId[incId] || [];
                        const isNew = newCardIncId === incId && existingSchiuse.length === 0;
                        const isExpanded = expandedId === incId;

                        // Build lookup maps for the card
                        const schiusaByBatch: Record<number, Schiusa> = {};
                        for (const s of existingSchiuse) {
                            if (s.batch_id !== null) schiusaByBatch[s.batch_id] = s;
                        }

                        const cardDate = editDate[incId] ?? (existingSchiuse[0]?.data_schiusa ?? '');

                        // Summary for collapsed header
                        const totalPulcini = existingSchiuse.reduce((s, r) => s + r.n_pulcini_nati, 0);
                        const totalTrasferite = trasfRecords.reduce((s, t) => s + t.n_uova_trasferite, 0);
                        const pctFertile = totalPulcini > 0 && totalTrasferite > 0
                            ? (totalPulcini / totalTrasferite * 100).toFixed(1)
                            : null;

                        return (
                            <div
                                key={incId}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                            >
                                {/* Card header */}
                                <div
                                    className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 cursor-pointer hover:from-amber-100 hover:to-orange-100 transition-colors"
                                    onClick={() => handleToggleExpand(incId)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-5 h-5 text-amber-600" />
                                                <span className="font-semibold text-gray-800">
                                                    Incubazione del {formatDateDisplay(inc.data_incubazione)}
                                                </span>
                                            </div>
                                            <span className="text-gray-400">→</span>
                                            <span className="text-amber-700 text-sm">
                                                🐣 Schiusa: {formatDateDisplay(inc.data_schiusa)}
                                            </span>
                                            {!isNew && cardDate && (
                                                <>
                                                    <span className="text-gray-400">·</span>
                                                    <span className="text-gray-500 text-sm">
                                                        Schiusa il {formatDateDisplay(cardDate)}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {isNew && (
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-800">
                                                    Nuovo
                                                </span>
                                            )}
                                            {!isNew && totalPulcini > 0 && (
                                                <span className="text-sm font-semibold text-green-700 font-mono">
                                                    {formatNumber(totalPulcini)} pulcini
                                                    {pctFertile && ` · ${pctFertile}% fertile`}
                                                </span>
                                            )}
                                            <button
                                                onClick={e => { e.stopPropagation(); handleDeleteCard(incId); }}
                                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            {isExpanded
                                                ? <ChevronUp className="w-5 h-5 text-gray-400" />
                                                : <ChevronDown className="w-5 h-5 text-gray-400" />
                                            }
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded body */}
                                {isExpanded && (
                                    <div className="p-4 space-y-4">
                                        {/* Info row + date */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg text-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-500">Data schiusa:</span>
                                                <input
                                                    type="date"
                                                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                                    value={cardDate}
                                                    onChange={e => setEditDate(prev => ({ ...prev, [incId]: e.target.value }))}
                                                />
                                            </div>
                                            <div className="flex items-center gap-4 text-gray-500">
                                                {inc.operatore && (
                                                    <span>Operatore: <strong className="text-gray-700">{inc.operatore}</strong></span>
                                                )}
                                                {inc.incubatrici && (
                                                    <span>Macchine: <strong className="text-gray-700">{inc.incubatrici}</strong></span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Batch table */}
                                        {trasfRecords.filter(t => t.batch_id !== null).length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-gray-100">
                                                            <th className="px-3 py-2 text-left">Prodotto</th>
                                                            <th className="px-3 py-2 text-left">Nome</th>
                                                            <th className="px-3 py-2 text-left">Origine</th>
                                                            <th className="px-3 py-2 text-left">Capannone</th>
                                                            <th className="px-3 py-2 text-right">Uova Trasferite</th>
                                                            <th className="px-3 py-2 text-right">Pulcini nati</th>
                                                            <th className="px-3 py-2 text-right">Nato su Incubato</th>
                                                            <th className="px-3 py-2 text-right">Nato su Fertile</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {trasfRecords.map(trasfRec => {
                                                            if (trasfRec.batch_id === null) return null;
                                                            const batch = inc.batches.find(b => b.id === trasfRec.batch_id);
                                                            const uovaTrasf = trasfRec.n_uova_trasferite;
                                                            const uovaIncubate = uovaTrasf + (trasfRec.n_uova_scartate || 0);

                                                            const localVal = editRows[incId]?.[trasfRec.batch_id];
                                                            const existingRec = schiusaByBatch[trasfRec.batch_id];
                                                            const displayVal = localVal !== undefined
                                                                ? localVal
                                                                : (existingRec ? String(existingRec.n_pulcini_nati) : '');

                                                            const pulcini = displayVal !== '' ? Number(displayVal) : null;
                                                            const natoSuInc = pulcini !== null && uovaIncubate > 0
                                                                ? (pulcini / uovaIncubate * 100).toFixed(1)
                                                                : null;
                                                            const natoSuFert = pulcini !== null && uovaTrasf > 0
                                                                ? (pulcini / uovaTrasf * 100).toFixed(1)
                                                                : null;

                                                            return (
                                                                <tr key={trasfRec.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                                    <td className="px-3 py-2">
                                                                        <span className={`px-2 py-0.5 rounded text-xs border ${PRODUCT_COLORS[batch?.prodotto || ''] || 'bg-gray-100 text-gray-700'}`}>
                                                                            {batch?.prodotto || '—'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2">{batch?.nome || '—'}</td>
                                                                    <td className="px-3 py-2 text-gray-500">{batch?.origine || '—'}</td>
                                                                    <td className="px-3 py-2 text-gray-500">{batch?.capannone || '—'}</td>
                                                                    <td className="px-3 py-2 text-right font-mono">{formatNumber(uovaTrasf)}</td>
                                                                    <td className="px-3 py-2 text-right">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            className="w-28 px-2 py-1 border border-gray-300 rounded text-right font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                                                            value={displayVal}
                                                                            onChange={e => setEditRows(prev => ({
                                                                                ...prev,
                                                                                [incId]: { ...(prev[incId] || {}), [trasfRec.batch_id!]: e.target.value },
                                                                            }))}
                                                                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                                                            placeholder="—"
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right font-mono text-blue-600">
                                                                        {natoSuInc !== null ? `${natoSuInc}%` : '—'}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right font-mono text-green-600">
                                                                        {natoSuFert !== null ? `${natoSuFert}%` : '—'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}

                                                        {/* Totals row (only if >1 batch with batch_id) */}
                                                        {trasfRecords.filter(t => t.batch_id !== null).length > 1 && (() => {
                                                            let totTrasf = 0, totInc = 0, totPulcini = 0;
                                                            for (const t of trasfRecords) {
                                                                if (t.batch_id === null) continue;
                                                                totTrasf += t.n_uova_trasferite;
                                                                totInc += t.n_uova_trasferite + (t.n_uova_scartate || 0);
                                                                const lv = editRows[incId]?.[t.batch_id];
                                                                const er = schiusaByBatch[t.batch_id];
                                                                const dv = lv !== undefined ? lv : (er ? String(er.n_pulcini_nati) : '');
                                                                totPulcini += dv !== '' ? Number(dv) : 0;
                                                            }
                                                            const pctIncTot = totInc > 0 ? (totPulcini / totInc * 100).toFixed(1) : null;
                                                            const pctFertTot = totTrasf > 0 ? (totPulcini / totTrasf * 100).toFixed(1) : null;
                                                            return (
                                                                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                                                    <td colSpan={4} className="px-3 py-2 text-right text-gray-600">Totale:</td>
                                                                    <td className="px-3 py-2 text-right font-mono">{formatNumber(totTrasf)}</td>
                                                                    <td className="px-3 py-2 text-right font-mono">{formatNumber(totPulcini)}</td>
                                                                    <td className="px-3 py-2 text-right font-mono text-blue-600">
                                                                        {pctIncTot ? `${pctIncTot}%` : '—'}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right font-mono text-green-600">
                                                                        {pctFertTot ? `${pctFertTot}%` : '—'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })()}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 text-center py-4">
                                                Nessun trasferimento trovato per questa incubazione.
                                            </p>
                                        )}

                                        {/* Save */}
                                        <div className="flex justify-end pt-2 border-t border-gray-100">
                                            <Button
                                                onClick={() => handleSaveCard(incId)}
                                                disabled={saving === incId}
                                                className="bg-amber-600 hover:bg-amber-700"
                                            >
                                                {saving === incId ? 'Salvataggio...' : 'Salva Schiusa'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Picker modal — selects incubazione with trasferimento */}
            {showPickerModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Seleziona Trasferimento</h3>
                            <button
                                onClick={() => setShowPickerModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm mb-6"
                            value={pickerIncId}
                            onChange={e => setPickerIncId(e.target.value)}
                        >
                            <option value="">Seleziona incubazione trasferita...</option>
                            {pickerOptions.map(inc => (
                                <option key={inc.id} value={inc.id}>
                                    #{inc.id} — {inc.data_incubazione}
                                    {inc.incubatrici ? ` (macchine: ${inc.incubatrici})` : ''}
                                </option>
                            ))}
                        </select>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowPickerModal(false)}>
                                Annulla
                            </Button>
                            <Button
                                onClick={handlePickerConfirm}
                                disabled={!pickerIncId}
                                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                            >
                                Conferma
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
