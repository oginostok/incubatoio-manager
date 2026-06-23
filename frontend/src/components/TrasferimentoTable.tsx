import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { Plus, Calendar, ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { NatoFertileAPI } from '@/lib/api';

// Mapping nome partita -> TIPO della matrice Nato su Fertile
const TIPO_ALIASES: Record<string, string> = {
    'COLOR YEALD': 'CY',
    'COLORYEALD': 'CY',
};
const natoSfKey = (a: string, t: string) => `${a}|||${t}`;

// Nato su Fertile di default quando non c'è né valore in matrice né override:
// usato per i calcoli e mostrato in grigio finché l'utente non lo modifica.
const DEFAULT_NATO_SF = 93;

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
    richiesta_granpollo: number;
    richiesta_pollo70: number;
    richiesta_color_yeald: number;
    richiesta_ross: number;
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

const PRODUCT_COLORS: Record<string, string> = {
    "Granpollo": "bg-green-100 text-green-800 border-green-300",
    "Pollo70": "bg-blue-100 text-blue-800 border-blue-300",
    "Color Yeald": "bg-red-100 text-red-800 border-red-300",
    "Ross": "bg-orange-100 text-orange-800 border-orange-300",
};

// Ordine di visualizzazione dei prodotti nelle tabelle/riepiloghi
const PRODUCT_ORDER = ["Granpollo", "Pollo70", "Ross", "Color Yeald"];

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

export default function TrasferimentoTable() {
    const [incubazioni, setIncubazioni] = useState<Incubation[]>([]);
    const [trasferimenti, setTrasferimenti] = useState<Trasferimento[]>([]);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Modal state
    const [showPickerModal, setShowPickerModal] = useState(false);
    const [pickerIncId, setPickerIncId] = useState<string>('');

    // New card (not yet saved)
    const [newCardIncId, setNewCardIncId] = useState<number | null>(null);

    // Per-card editing: incubation_id -> { date, rows: { batch_id -> value } }
    const [editDate, setEditDate] = useState<Record<number, string>>({});
    const [editRows, setEditRows] = useState<Record<number, Record<number, string>>>({});
    const [saving, setSaving] = useState<number | null>(null);

    // Nato su Fertile previsto: valori matrice (default) + override per partita
    const [natoSfMatrix, setNatoSfMatrix] = useState<Record<string, number>>({});
    const [natoSfOverrides, setNatoSfOverrides] = useState<Record<number, number>>({});
    const [natoSfEdit, setNatoSfEdit] = useState<Record<number, string>>({});
    const [natoSfStatus, setNatoSfStatus] = useState<Record<number, 'saving' | 'success' | 'error'>>({});

    const load = async () => {
        try {
            const [trasRes, incRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/trasferimenti-incubazione`),
                fetch(`${API_BASE_URL}/api/incubazioni`),
            ]);
            const trasData: Trasferimento[] = await trasRes.json();
            const incData = await incRes.json();
            setTrasferimenti(trasData);
            setIncubazioni(incData.incubazioni || incData || []);
        } catch { /* ignore */ }
    };

    const loadNatoSf = async () => {
        try {
            const [matrix, overrides] = await Promise.all([
                NatoFertileAPI.getMatrix(),
                NatoFertileAPI.getBatchOverrides(),
            ]);
            const m: Record<string, number> = {};
            matrix.cells.forEach(c => { m[natoSfKey(c.allevamento, c.tipo)] = c.valore; });
            setNatoSfMatrix(m);
            setNatoSfOverrides(overrides);
        } catch { /* ignore */ }
    };

    useEffect(() => { load(); loadNatoSf(); }, []);

    // TIPO della partita per la matrice (es. "Color Yeald" -> "CY")
    const batchTipo = (b: IncubationBatch): string => {
        const t = (b.nome || '').trim().toUpperCase();
        return TIPO_ALIASES[t] || t;
    };

    // ALLEVAMENTO della partita: origine (senza "Acquisto - ") + capannone se presente
    const batchAllevamentoCandidates = (b: IncubationBatch): string[] => {
        const origine = (b.origine || '').trim().toUpperCase().replace(/^ACQUISTO\s*-\s*/, '').trim();
        const cap = (b.capannone || '').trim();
        const cands: string[] = [];
        if (cap) cands.push(`${origine} ${cap}`.toUpperCase());
        cands.push(origine);
        return cands;
    };

    // Valore Nato SF di default dalla matrice (undefined se nessun match)
    const natoSfDefault = (b: IncubationBatch): number | undefined => {
        const tipo = batchTipo(b);
        for (const a of batchAllevamentoCandidates(b)) {
            const v = natoSfMatrix[natoSfKey(a, tipo)];
            if (v !== undefined) return v;
        }
        return undefined;
    };

    // Valore effettivo Nato SF: override per partita, altrimenti default matrice
    const natoSfEffective = (b: IncubationBatch): number | undefined => {
        const ov = natoSfOverrides[b.id];
        return ov !== undefined ? ov : natoSfDefault(b);
    };

    // Salvataggio on-blur del Nato SF previsto per una partita
    const saveNatoSf = async (batchId: number) => {
        const raw = natoSfEdit[batchId];
        setNatoSfEdit(prev => { const n = { ...prev }; delete n[batchId]; return n; });
        if (raw === undefined) return; // nessuna modifica
        const cleaned = raw.replace('%', '').replace(',', '.').trim();
        const parsed = cleaned === '' ? null : parseFloat(cleaned);
        if (cleaned !== '' && isNaN(parsed as number)) return;
        setNatoSfStatus(s => ({ ...s, [batchId]: 'saving' }));
        try {
            await NatoFertileAPI.updateBatchOverride(batchId, parsed);
            setNatoSfOverrides(prev => {
                const n = { ...prev };
                if (parsed === null) delete n[batchId];
                else n[batchId] = parsed;
                return n;
            });
            setNatoSfStatus(s => ({ ...s, [batchId]: 'success' }));
            setTimeout(() => setNatoSfStatus(s => { const n = { ...s }; delete n[batchId]; return n; }), 1000);
        } catch {
            setNatoSfStatus(s => ({ ...s, [batchId]: 'error' }));
            setTimeout(() => setNatoSfStatus(s => { const n = { ...s }; delete n[batchId]; return n; }), 2000);
        }
    };

    // Build per-incubation maps
    const trasfByIncId: Record<number, Trasferimento[]> = {};
    for (const t of trasferimenti) {
        if (!trasfByIncId[t.incubation_id]) trasfByIncId[t.incubation_id] = [];
        trasfByIncId[t.incubation_id].push(t);
    }

    const incIdsWithTrasf = new Set(trasferimenti.map(t => t.incubation_id));
    const cardIds = new Set([...incIdsWithTrasf]);
    if (newCardIncId !== null) cardIds.add(newCardIncId);

    const sortedCardIds = [...cardIds].sort((a, b) => {
        const ia = incubazioni.find(i => i.id === a);
        const ib = incubazioni.find(i => i.id === b);
        if (!ia || !ib) return 0;
        return ib.data_incubazione.localeCompare(ia.data_incubazione);
    });

    // Expand/collapse card — pre-populates edit state from existing records on open
    const handleToggleExpand = (incId: number) => {
        if (expandedId === incId) {
            setExpandedId(null);
            return;
        }
        const existingRecords = trasferimenti.filter(t => t.incubation_id === incId);
        if (existingRecords.length > 0) {
            if (editDate[incId] === undefined) {
                setEditDate(prev => ({ ...prev, [incId]: existingRecords[0].data_trasferimento }));
            }
            if (editRows[incId] === undefined) {
                const rows: Record<number, string> = {};
                for (const t of existingRecords) {
                    if (t.batch_id !== null) rows[t.batch_id] = String(t.n_uova_trasferite);
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
        // Pre-set today's date for new cards
        const today = new Date().toISOString().split('T')[0];
        setEditDate(prev => ({ ...prev, [id]: prev[id] ?? today }));
        setShowPickerModal(false);
    };

    // Save card — merges editRows (user typed) with existing DB values as fallback
    const handleSaveCard = async (incId: number) => {
        const inc = incubazioni.find(i => i.id === incId);
        if (!inc) return;

        const date = editDate[incId] || (trasfByIncId[incId]?.[0]?.data_trasferimento) || '';
        if (!date) {
            alert('Inserisci la data del trasferimento prima di salvare.');
            return;
        }

        // Build merged values: editRows (user edits) take priority over existing DB records
        const existingByBatch: Record<number, number> = {};
        for (const t of (trasfByIncId[incId] || [])) {
            if (t.batch_id !== null) existingByBatch[t.batch_id] = t.n_uova_trasferite;
        }
        const localRows = editRows[incId] || {};
        const toSave: Array<{ batchId: number; value: number }> = [];
        for (const b of inc.batches) {
            const local = localRows[b.id];
            const existing = existingByBatch[b.id];
            const raw = local !== undefined ? local : (existing !== undefined ? String(existing) : '');
            if (raw !== '') toSave.push({ batchId: b.id, value: Number(raw) || 0 });
        }

        if (toSave.length === 0) {
            alert('Inserisci almeno un valore "Uova Trasferite" prima di salvare.');
            return;
        }

        setSaving(incId);
        try {
            // Delete existing records for this incubation, then recreate
            const existing = trasfByIncId[incId] || [];
            await Promise.all(
                existing.map(t =>
                    fetch(`${API_BASE_URL}/api/trasferimenti-incubazione/${t.id}`, { method: 'DELETE' })
                )
            );

            await Promise.all(
                toSave.map(({ batchId, value }) => {
                    const batch = inc.batches.find(b => b.id === batchId);
                    if (!batch) return Promise.resolve();
                    const uoveIncubate = batch.uova_utilizzate || batch.uova_partita;
                    const chiaro = Math.max(0, uoveIncubate - value);
                    return fetch(`${API_BASE_URL}/api/trasferimenti-incubazione`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            incubation_id: incId,
                            batch_id: batchId,
                            data_trasferimento: date,
                            n_uova_trasferite: value,
                            n_uova_scartate: chiaro,
                            incubatrice_origine: inc.incubatrici || '',
                            chioccia_destinazione: '',
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

    // Delete entire card (all records for that incubation)
    const handleDeleteCard = async (incId: number) => {
        const existing = trasfByIncId[incId] || [];
        if (existing.length === 0) {
            // Just a local new card, no confirmation needed
            if (newCardIncId === incId) setNewCardIncId(null);
            if (expandedId === incId) setExpandedId(null);
            return;
        }
        if (!confirm('Eliminare tutti i trasferimenti per questa incubazione?')) return;
        await Promise.all(
            existing.map(t =>
                fetch(`${API_BASE_URL}/api/trasferimenti-incubazione/${t.id}`, { method: 'DELETE' })
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
                    <h2 className="text-2xl font-bold text-gray-800">Trasferimento Uova</h2>
                </div>
                <Button
                    onClick={handleOpenPicker}
                    className="gap-2 bg-amber-600 hover:bg-amber-700"
                >
                    <Plus className="w-4 h-4" />
                    Nuovo Trasferimento
                </Button>
            </div>

            {/* Cards list */}
            {sortedCardIds.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                        <p className="text-amber-700 text-lg mb-2">Nessun trasferimento registrato</p>
                        <p className="text-gray-600">Clicca su "Nuovo Trasferimento" per iniziare</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedCardIds.map(incId => {
                        const inc = incubazioni.find(i => i.id === incId);
                        if (!inc) return null;

                        const existing = trasfByIncId[incId] || [];
                        const isNew = newCardIncId === incId && existing.length === 0;
                        const isExpanded = expandedId === incId;

                        // Build batch_id -> trasferimento map from existing records
                        const trasfByBatch: Record<number, Trasferimento> = {};
                        for (const t of existing) {
                            if (t.batch_id !== null) trasfByBatch[t.batch_id] = t;
                        }

                        // Card-level date
                        const cardDate = editDate[incId] ?? (existing[0]?.data_trasferimento ?? '');

                        // Summary for collapsed header
                        const totalIncubate = inc.batches.reduce((s, b) => s + (b.uova_utilizzate || b.uova_partita), 0);
                        const totalTrasferite = existing.reduce((s, t) => s + t.n_uova_trasferite, 0);
                        const pctHeader = totalIncubate > 0 && totalTrasferite > 0
                            ? (totalTrasferite / totalIncubate * 100).toFixed(1)
                            : null;

                        // Pulcini previsti per prodotto = somma (uova trasferite × Nato SF%) delle partite del prodotto
                        const previstiPerProdotto: Record<string, number> = {};
                        for (const b of inc.batches) {
                            const lv = editRows[incId]?.[b.id];
                            const er = trasfByBatch[b.id];
                            const dv = lv !== undefined ? lv : (er ? String(er.n_uova_trasferite) : '');
                            if (dv === '') continue;
                            const ut = Number(dv) || 0;
                            const edit = natoSfEdit[b.id];
                            const parsedEdit = edit !== undefined ? parseFloat(edit.replace(',', '.')) : NaN;
                            const effNum = !isNaN(parsedEdit) ? parsedEdit : (natoSfEffective(b) ?? DEFAULT_NATO_SF);
                            previstiPerProdotto[b.prodotto] = (previstiPerProdotto[b.prodotto] || 0) + Math.round(ut * effNum / 100);
                        }
                        // Richieste per prodotto: le stesse inserite in fase di incubazione
                        const richiestiPerProdotto: Record<string, number> = {
                            "Granpollo": inc.richiesta_granpollo || 0,
                            "Pollo70": inc.richiesta_pollo70 || 0,
                            "Color Yeald": inc.richiesta_color_yeald || 0,
                            "Ross": inc.richiesta_ross || 0,
                        };
                        const prodottiPresenti = PRODUCT_ORDER.filter(
                            p => (richiestiPerProdotto[p] || 0) > 0 || (previstiPerProdotto[p] || 0) > 0
                        );

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
                                                        Trasferito il {formatDateDisplay(cardDate)}
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
                                            {!isNew && pctHeader && (
                                                <span className="text-sm font-semibold text-blue-700 font-mono">
                                                    {pctHeader}% trasferiti
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

                                    {/* Richiesti vs previsti per prodotto — sempre visibile */}
                                    {prodottiPresenti.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {prodottiPresenti.map(prod => {
                                                const rich = richiestiPerProdotto[prod] || 0;
                                                const prev = previstiPerProdotto[prod] || 0;
                                                const diff = prev - rich;
                                                return (
                                                    <div
                                                        key={prod}
                                                        className="flex items-center gap-1.5 bg-white/70 border border-amber-200 rounded-lg px-2.5 py-1 text-xs"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        <span className={`px-2 py-0.5 rounded text-xs border ${PRODUCT_COLORS[prod] || "bg-gray-100"}`}>{prod}</span>
                                                        <span className="text-gray-500">Rich.</span>
                                                        <span className="font-mono font-medium">{formatNumber(rich)}</span>
                                                        <span className="text-gray-400">→</span>
                                                        <span className="text-gray-500">Prev.</span>
                                                        <span className="font-mono font-medium text-green-700">{formatNumber(prev)}</span>
                                                        {rich > 0 && (
                                                            <span className={`font-mono font-semibold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                ({diff >= 0 ? '+' : ''}{formatNumber(diff)})
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Expanded body */}
                                {isExpanded && (
                                    <div className="p-4 space-y-4">
                                        {/* Info row + date */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg text-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-500">Data trasferimento:</span>
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
                                        {inc.batches.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-gray-100">
                                                            <th className="px-3 py-2 text-left">Prodotto</th>
                                                            <th className="px-3 py-2 text-left">Nome</th>
                                                            <th className="px-3 py-2 text-left">Origine</th>
                                                            <th className="px-3 py-2 text-left">Capannone</th>
                                                            <th className="px-3 py-2 text-right">Uova Incubate</th>
                                                            <th className="px-3 py-2 text-right">Uova Trasferite</th>
                                                            <th className="px-3 py-2 text-right">Chiaro</th>
                                                            <th className="px-3 py-2 text-right">% Trasf.</th>
                                                            <th className="px-3 py-2 text-right">
                                                                <TooltipProvider delayDuration={100}>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="cursor-help border-b border-dotted border-gray-400">
                                                                                Nato SF
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>Nato Su fertile</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            </th>
                                                            <th className="px-3 py-2 text-right">Pulcini Previsti</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {[...inc.batches]
                                                            .sort((a, b) => {
                                                                // 1) Prodotto (ordine fisso), 2) Nome, 3) Origine, 4) Capannone
                                                                const p = PRODUCT_ORDER.indexOf(a.prodotto) - PRODUCT_ORDER.indexOf(b.prodotto);
                                                                if (p !== 0) return p;
                                                                const n = (a.nome || '').localeCompare(b.nome || '', 'it', { sensitivity: 'base' });
                                                                if (n !== 0) return n;
                                                                const o = (a.origine || '').localeCompare(b.origine || '', 'it', { sensitivity: 'base' });
                                                                if (o !== 0) return o;
                                                                return (a.capannone || '').localeCompare(b.capannone || '', 'it', { numeric: true, sensitivity: 'base' });
                                                            })
                                                            .map(batch => {
                                                            const uoveIncubate = batch.uova_utilizzate || batch.uova_partita;
                                                            const localVal = editRows[incId]?.[batch.id];
                                                            const existingRec = trasfByBatch[batch.id];
                                                            const displayVal = localVal !== undefined
                                                                ? localVal
                                                                : (existingRec ? String(existingRec.n_uova_trasferite) : '');

                                                            const uoveTrasf = displayVal !== '' ? Number(displayVal) : null;
                                                            const chiaro = uoveTrasf !== null ? Math.max(0, uoveIncubate - uoveTrasf) : null;
                                                            const pct = uoveTrasf !== null && uoveIncubate > 0
                                                                ? (uoveTrasf / uoveIncubate * 100).toFixed(1)
                                                                : null;

                                                            return (
                                                                <tr key={batch.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                                    <td className="px-3 py-2">
                                                                        <span className={`px-2 py-0.5 rounded text-xs border ${PRODUCT_COLORS[batch.prodotto] || 'bg-gray-100 text-gray-700'}`}>
                                                                            {batch.prodotto}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2">{batch.nome}</td>
                                                                    <td className="px-3 py-2 text-gray-500">{batch.origine}</td>
                                                                    <td className="px-3 py-2 text-gray-500">{batch.capannone || "—"}</td>
                                                                    <td className="px-3 py-2 text-right font-mono">{formatNumber(uoveIncubate)}</td>
                                                                    <td className="px-3 py-2 text-right">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max={uoveIncubate}
                                                                            className="w-28 px-2 py-1 border border-gray-300 rounded text-right font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                                                            value={displayVal}
                                                                            onChange={e => setEditRows(prev => ({
                                                                                ...prev,
                                                                                [incId]: { ...(prev[incId] || {}), [batch.id]: e.target.value },
                                                                            }))}
                                                                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                                                            placeholder="—"
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right font-mono text-red-500">
                                                                        {chiaro !== null ? formatNumber(chiaro) : '—'}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right font-mono text-blue-600">
                                                                        {pct !== null ? `${pct}%` : '—'}
                                                                    </td>
                                                                    {(() => {
                                                                        const effective = natoSfEffective(batch);
                                                                        const editing = natoSfEdit[batch.id];
                                                                        const hasRealValue = effective !== undefined;
                                                                        // Quando non c'è un valore reale mostriamo il default (93) in grigio.
                                                                        const isDefaultShown = !hasRealValue && editing === undefined;
                                                                        const inputValue = editing !== undefined
                                                                            ? editing
                                                                            : (hasRealValue ? effective.toFixed(2) : DEFAULT_NATO_SF.toFixed(2));
                                                                        const parsedEdit = editing !== undefined
                                                                            ? parseFloat(editing.replace(',', '.'))
                                                                            : NaN;
                                                                        const effNum = !isNaN(parsedEdit)
                                                                            ? parsedEdit
                                                                            : (hasRealValue ? effective : DEFAULT_NATO_SF);
                                                                        const pulcini = (uoveTrasf !== null && effNum !== undefined)
                                                                            ? Math.round(uoveTrasf * effNum / 100)
                                                                            : null;
                                                                        const st = natoSfStatus[batch.id];
                                                                        return (
                                                                            <>
                                                                                <td className="px-3 py-2 text-right">
                                                                                    <div className="flex items-center justify-end gap-1">
                                                                                        <input
                                                                                            type="text"
                                                                                            inputMode="decimal"
                                                                                            className={`w-20 px-2 py-1 border border-gray-300 rounded text-right font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${isDefaultShown ? 'text-gray-400' : 'text-gray-900'}`}
                                                                                            value={inputValue}
                                                                                            onChange={e => setNatoSfEdit(prev => ({ ...prev, [batch.id]: e.target.value }))}
                                                                                            onBlur={() => saveNatoSf(batch.id)}
                                                                                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                                                                            placeholder="—"
                                                                                        />
                                                                                        <span className="text-gray-400 text-xs w-3">
                                                                                            {st === 'saving' ? '…' : st === 'success' ? '✓' : st === 'error' ? '✗' : '%'}
                                                                                        </span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-3 py-2 text-right font-mono text-green-700 font-semibold">
                                                                                    {pulcini !== null ? formatNumber(pulcini) : '—'}
                                                                                </td>
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </tr>
                                                            );
                                                        })}

                                                        {/* Totals row (only if >1 batch) */}
                                                        {inc.batches.length > 1 && (() => {
                                                            let totInc = 0, totTrasf = 0, totCh = 0, totPulcini = 0;
                                                            for (const b of inc.batches) {
                                                                const uoveInc = b.uova_utilizzate || b.uova_partita;
                                                                const lv = editRows[incId]?.[b.id];
                                                                const er = trasfByBatch[b.id];
                                                                const dv = lv !== undefined ? lv : (er ? String(er.n_uova_trasferite) : '');
                                                                const ut = dv !== '' ? Number(dv) : 0;
                                                                totInc += uoveInc;
                                                                totTrasf += ut;
                                                                totCh += Math.max(0, uoveInc - ut);
                                                                // Pulcini previsti = uova trasferite x nato su fertile previsto
                                                                const edit = natoSfEdit[b.id];
                                                                const parsedEdit = edit !== undefined ? parseFloat(edit.replace(',', '.')) : NaN;
                                                                const effNum = !isNaN(parsedEdit) ? parsedEdit : (natoSfEffective(b) ?? DEFAULT_NATO_SF);
                                                                if (dv !== '' && effNum !== undefined) totPulcini += Math.round(ut * effNum / 100);
                                                            }
                                                            const pctTot = totInc > 0 ? (totTrasf / totInc * 100).toFixed(1) : null;
                                                            return (
                                                                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                                                    <td colSpan={4} className="px-3 py-2 text-right text-gray-600">Totale:</td>
                                                                    <td className="px-3 py-2 text-right font-mono">{formatNumber(totInc)}</td>
                                                                    <td className="px-3 py-2 text-right font-mono">{formatNumber(totTrasf)}</td>
                                                                    <td className="px-3 py-2 text-right font-mono text-red-500">{formatNumber(totCh)}</td>
                                                                    <td className="px-3 py-2 text-right font-mono text-blue-600">
                                                                        {pctTot ? `${pctTot}%` : '—'}
                                                                    </td>
                                                                    <td className="px-3 py-2"></td>
                                                                    <td className="px-3 py-2 text-right font-mono text-green-700">
                                                                        {totPulcini > 0 ? formatNumber(totPulcini) : '—'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })()}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 text-center py-4">
                                                Nessuna partita trovata per questa incubazione.
                                            </p>
                                        )}

                                        {/* Save */}
                                        <div className="flex justify-end pt-2 border-t border-gray-100">
                                            <Button
                                                onClick={() => handleSaveCard(incId)}
                                                disabled={saving === incId}
                                                className="bg-amber-600 hover:bg-amber-700"
                                            >
                                                {saving === incId ? 'Salvataggio...' : 'Salva Trasferimento'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Picker modal — only incubazione selection */}
            {showPickerModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Seleziona Incubazione</h3>
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
                            <option value="">Seleziona incubazione...</option>
                            {incubazioni.map(inc => (
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
