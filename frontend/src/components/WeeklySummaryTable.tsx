import { useState, useEffect, Fragment } from "react";
import { ChevronDown, ChevronRight, Egg, ShoppingCart, TrendingDown, AlertTriangle, Check, Plus, Trash2, PenSquare } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/config";
import { ManualAdjustmentsAPI } from "@/lib/api";
import type { WeeklySummary, SaleDetail, ManualAdjustment } from "@/types";

interface WeeklySummaryTableProps {
    data: WeeklySummary[];
    includeTradingData?: boolean; // Control whether to show trading data
    productFilter?: string;       // current product filter (per-product manual rows)
    onUpdate?: () => void;        // refresh parent (chart + table) after assigning a sale
}

interface SaleAllocationEditorProps {
    sale: SaleDetail;
    week: WeeklySummary;
    onSaved?: () => void;
}

function SaleAllocationEditor({ sale, week, onSaved }: SaleAllocationEditorProps) {
    // shed list comes from the production details of the same week+product
    const sheds = week.dettagli_produzione.filter(
        d => !sale.prodotto || d.prodotto === sale.prodotto
    );

    // local state: shedKey -> qty (string for empty handling)
    const initial: Record<string, string> = {};
    sheds.forEach(s => {
        const found = (sale.assegnazioni || []).find(a => a.allevamento === s.allevamento);
        initial[s.allevamento] = found ? String(found.quantita) : "";
    });
    const [values, setValues] = useState<Record<string, string>>(initial);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // reset state when the sale identity changes (e.g. user collapses & reopens another row)
    useEffect(() => {
        setValues(initial);
        setSaved(false);
        setError(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sale.vendita_id, week.periodo]);

    const fmt = (n: number) => new Intl.NumberFormat("it-IT").format(n);
    const assigned = Object.values(values).reduce((s, v) => s + (parseInt(v) || 0), 0);
    const target = sale.quantita;
    const diff = target - assigned;
    const overAllocated = assigned > target;

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const items = Object.entries(values)
                .map(([allevamento, q]) => ({ allevamento, quantita: parseInt(q) || 0 }))
                .filter(it => it.quantita > 0);
            if (sale.vendita_id === undefined) {
                throw new Error("vendita_id mancante — ricarica la pagina");
            }
            const res = await fetch(`${API_BASE_URL}/api/trading/vendite/assegnazioni`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vendita_id: sale.vendita_id,
                    items,
                }),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.detail || `HTTP ${res.status}`);
            }
            setSaved(true);
            onSaved?.();
            setTimeout(() => setSaved(false), 1500);
        } catch (e: any) {
            setError(e?.message || "Errore durante il salvataggio");
        } finally {
            setSaving(false);
        }
    };

    if (sheds.length === 0) {
        return <p className="text-xs text-muted-foreground italic">Nessun allevamento in produzione questa settimana.</p>;
    }

    return (
        <div className="mt-2 space-y-2">
            <div className="space-y-1.5">
                {sheds.map(s => {
                    const lorda = s.quantita_lorda ?? s.quantita;
                    return (
                        <div key={s.allevamento} className="flex items-center gap-2 text-xs">
                            <span className="flex-1 truncate">
                                <span className="font-medium">{s.allevamento}</span>
                                <span className="text-muted-foreground ml-2">(prod {fmt(lorda)})</span>
                            </span>
                            <input
                                type="number"
                                min={0}
                                step={100}
                                value={values[s.allevamento] ?? ""}
                                onChange={e => setValues(v => ({ ...v, [s.allevamento]: e.target.value }))}
                                placeholder="0"
                                className="w-24 px-2 py-1 border rounded font-mono text-right focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                    );
                })}
            </div>
            <div className={`text-xs flex items-center justify-between border-t pt-2 ${overAllocated ? "text-red-600" : diff !== 0 ? "text-amber-600" : "text-emerald-700"}`}>
                <span>
                    Assegnato: <span className="font-mono font-semibold">{fmt(assigned)}</span> / {fmt(target)}
                    {diff !== 0 && (
                        <span className="ml-2 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {overAllocated
                                ? `Eccesso di ${fmt(-diff)}`
                                : `Mancano ${fmt(diff)}`}
                        </span>
                    )}
                    {diff === 0 && assigned > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1"><Check className="w-3 h-3" /> Quadra</span>
                    )}
                </span>
                <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
                    {saving ? "Salvo…" : saved ? "Salvato ✓" : "Salva"}
                </Button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}

interface ManualRowsEditorProps {
    week: WeeklySummary;
    productFilter?: string;
    onUpdate?: () => void;
}

function ManualRowsEditor({ week, productFilter, onUpdate }: ManualRowsEditorProps) {
    const rows = week.dettagli_manuali ?? [];
    const fmt = (n: number) => new Intl.NumberFormat("it-IT").format(n);

    const [adding, setAdding] = useState(false);
    const [newDesc, setNewDesc] = useState("");
    const [newQty, setNewQty] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editDesc, setEditDesc] = useState("");
    const [editQty, setEditQty] = useState("");

    const handleAdd = async () => {
        const qty = parseInt(newQty);
        if (!qty || qty === 0) {
            setError("Quantità deve essere diversa da 0");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await ManualAdjustmentsAPI.create({
                anno: week.anno,
                settimana: week.settimana,
                prodotto: productFilter || "",
                descrizione: newDesc.trim(),
                quantita: qty,
            });
            setNewDesc("");
            setNewQty("");
            setAdding(false);
            onUpdate?.();
        } catch (e: any) {
            setError(e?.response?.data?.detail || e?.message || "Errore");
        } finally {
            setBusy(false);
        }
    };

    const startEdit = (row: ManualAdjustment) => {
        setEditingId(row.id);
        setEditDesc(row.descrizione);
        setEditQty(String(row.quantita));
    };

    const handleSaveEdit = async (id: number) => {
        const qty = parseInt(editQty);
        if (!qty || qty === 0) {
            setError("Quantità deve essere diversa da 0");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await ManualAdjustmentsAPI.update(id, {
                descrizione: editDesc.trim(),
                quantita: qty,
            });
            setEditingId(null);
            onUpdate?.();
        } catch (e: any) {
            setError(e?.response?.data?.detail || e?.message || "Errore");
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Eliminare la riga manuale?")) return;
        setBusy(true);
        setError(null);
        try {
            await ManualAdjustmentsAPI.remove(id);
            onUpdate?.();
        } catch (e: any) {
            setError(e?.response?.data?.detail || e?.message || "Errore");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-4 pt-3 border-t border-dashed">
            <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Righe manuali (incrementano la produzione)
                </div>
                {!adding && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => setAdding(true)}
                    >
                        <Plus className="w-3 h-3" /> Aggiungi
                    </Button>
                )}
            </div>

            {rows.length === 0 && !adding && (
                <p className="text-xs text-muted-foreground italic">Nessuna riga manuale per questa settimana.</p>
            )}

            <div className="space-y-1.5">
                {rows.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 text-xs">
                        {editingId === r.id ? (
                            <>
                                <input
                                    type="text"
                                    value={editDesc}
                                    onChange={(e) => setEditDesc(e.target.value)}
                                    placeholder="Descrizione"
                                    className="flex-1 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <input
                                    type="number"
                                    value={editQty}
                                    onChange={(e) => setEditQty(e.target.value)}
                                    placeholder="Qta"
                                    step={100}
                                    className="w-24 px-2 py-1 border rounded font-mono text-right text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleSaveEdit(r.id)} disabled={busy}>
                                    Salva
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)} disabled={busy}>
                                    ✕
                                </Button>
                            </>
                        ) : (
                            <>
                                <span className="flex-1 truncate">
                                    {r.descrizione || <em className="text-muted-foreground">(senza descrizione)</em>}
                                </span>
                                <span className={`font-mono font-semibold ${r.quantita > 0 ? "text-emerald-700" : "text-red-600"}`}>
                                    {r.quantita > 0 ? "+" : ""}{fmt(r.quantita)}
                                </span>
                                <button
                                    onClick={() => startEdit(r)}
                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Modifica"
                                >
                                    <PenSquare className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(r.id)}
                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Elimina"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </>
                        )}
                    </div>
                ))}

                {adding && (
                    <div className="flex items-center gap-2 text-xs pt-2">
                        <input
                            type="text"
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            placeholder="Descrizione (opzionale)"
                            className="flex-1 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                            autoFocus
                        />
                        <input
                            type="number"
                            value={newQty}
                            onChange={(e) => setNewQty(e.target.value)}
                            placeholder="Quantità"
                            step={100}
                            className="w-28 px-2 py-1 border rounded font-mono text-right text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleAdd} disabled={busy}>
                            {busy ? "..." : "Aggiungi"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAdding(false); setNewDesc(""); setNewQty(""); setError(null); }} disabled={busy}>
                            ✕
                        </Button>
                    </div>
                )}
            </div>

            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
    );
}


export function WeeklySummaryTable({ data, includeTradingData = true, productFilter, onUpdate }: WeeklySummaryTableProps) {
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const toggleRow = (periodo: string) => {
        setExpandedRow(expandedRow === periodo ? null : periodo);
    };

    const fmt = (n: number) => new Intl.NumberFormat("it-IT").format(n);

    return (
        <div className="rounded-md border bg-card">
            <p className="text-xs text-gray-400 px-4 pt-2">T002</p>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Periodo</TableHead>
                        <TableHead className="text-right">Produzione</TableHead>
                        {includeTradingData && <TableHead className="text-right">Acquisti</TableHead>}
                        {includeTradingData && <TableHead className="text-right">Vendite</TableHead>}
                        <TableHead className="text-right font-bold">Totale Netto</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row) => (
                        <Fragment key={row.periodo}>
                            <TableRow
                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => toggleRow(row.periodo)}
                                data-state={expandedRow === row.periodo ? "selected" : undefined}
                            >
                                <TableCell>
                                    {expandedRow === row.periodo ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </TableCell>
                                <TableCell className="font-medium">{row.periodo}</TableCell>
                                <TableCell className="text-right">
                                    {row.produzione_totale > 0 ? (
                                        <Badge variant="secondary" className="font-mono text-green-700 bg-green-50 hover:bg-green-100 border-green-200">
                                            {fmt(row.produzione_totale)}
                                        </Badge>
                                    ) : "-"}
                                </TableCell>
                                {includeTradingData && (
                                    <TableCell className="text-right">
                                        {row.acquisti_totale > 0 ? (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="font-mono text-blue-600 cursor-help border-b border-dashed border-blue-400">
                                                            {fmt(row.acquisti_totale)}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left" className="max-w-xs">
                                                        <div className="space-y-1">
                                                            <p className="font-semibold text-xs mb-2">Dettaglio Acquisti:</p>
                                                            {row.dettagli_acquisti.map((d, i) => (
                                                                <p key={i} className="text-xs">
                                                                    {d.azienda} - {fmt(d.quantita)}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : "-"}
                                    </TableCell>
                                )}
                                {includeTradingData && (
                                    <TableCell className="text-right text-muted-foreground">
                                        {row.vendite_totale > 0 ? fmt(row.vendite_totale) : "-"}
                                    </TableCell>
                                )}
                                <TableCell className="text-right font-bold text-lg">
                                    {fmt(includeTradingData ? row.totale_netto : row.produzione_totale)}
                                </TableCell>
                            </TableRow>

                            {expandedRow === row.periodo && (
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableCell colSpan={includeTradingData ? 6 : 4} className="p-4">
                                        <div className={`grid grid-cols-1 ${includeTradingData ? 'md:grid-cols-2 lg:grid-cols-3' : ''} gap-6 animate-in slide-in-from-top-2 duration-200`}>

                                            {/* PRODUCTION DETAILS - always visible */}
                                            <Card className="shadow-sm border-l-4 border-l-green-500">
                                                <CardContent className="pt-6">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <Egg className="w-5 h-5 text-green-600" />
                                                        <h3 className="font-semibold text-lg">Dettaglio Produzione</h3>
                                                    </div>

                                                    {row.dettagli_produzione.length > 0 ? (
                                                        <div className="space-y-3">
                                                            {row.dettagli_produzione.map((d, i) => (
                                                                <div key={i} className="flex justify-between items-center text-sm border-b border-dashed pb-2 last:border-0 last:pb-0">
                                                                    <div>
                                                                        <span className="font-medium text-foreground">{d.allevamento}</span>
                                                                        <div className="text-xs text-muted-foreground">Età: {d.eta} settimane</div>
                                                                        {(d.razza || d.razza_gallo) && (
                                                                            <div className="text-xs text-muted-foreground">
                                                                                {d.razza && <span>Gallina: {d.razza}</span>}
                                                                                {d.razza && d.razza_gallo && <span className="mx-1">·</span>}
                                                                                {d.razza_gallo && <span>Gallo: {d.razza_gallo}</span>}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="font-mono font-bold text-green-700">
                                                                        {fmt(d.quantita)}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground italic">Nessuna produzione attiva</p>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            {/* PURCHASE DETAILS - only when trading data enabled and there are purchases */}
                                            {includeTradingData && row.dettagli_acquisti.length > 0 && (
                                                <Card className="shadow-sm border-l-4 border-l-blue-500">
                                                    <CardContent className="pt-6">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <ShoppingCart className="w-5 h-5 text-blue-600" />
                                                            <h3 className="font-semibold text-lg">Dettaglio Acquisti</h3>
                                                        </div>

                                                        <div className="space-y-3">
                                                            {row.dettagli_acquisti.map((d, i) => (
                                                                <div key={i} className="flex justify-between items-center text-sm border-b border-dashed pb-2 last:border-0 last:pb-0">
                                                                    <span className="font-medium text-foreground">{d.azienda}</span>
                                                                    <div className="font-mono font-bold text-blue-600">
                                                                        {fmt(d.quantita)}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {/* SALE DETAILS - always visible when trading data enabled (so manual rows can be added) */}
                                            {includeTradingData && (
                                                <Card className="shadow-sm border-l-4 border-l-orange-500">
                                                    <CardContent className="pt-6">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <TrendingDown className="w-5 h-5 text-orange-600" />
                                                            <h3 className="font-semibold text-lg">Dettaglio Vendite</h3>
                                                        </div>

                                                        {row.dettagli_vendite.length > 0 ? (
                                                            <div className="space-y-5">
                                                                {row.dettagli_vendite.map((d, i) => (
                                                                    <div key={d.vendita_id ?? i} className="text-sm border-b border-dashed pb-3 last:border-0 last:pb-0">
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="font-medium text-foreground">
                                                                                {d.azienda}
                                                                                {d.prodotto && <span className="text-muted-foreground ml-2 text-xs">({d.prodotto})</span>}
                                                                            </span>
                                                                            <div className="font-mono font-bold text-orange-600">
                                                                                {fmt(d.quantita)}
                                                                            </div>
                                                                        </div>
                                                                        <SaleAllocationEditor sale={d} week={row} onSaved={onUpdate} />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground italic">Nessuna vendita registrata.</p>
                                                        )}

                                                        <ManualRowsEditor week={row} productFilter={productFilter} onUpdate={onUpdate} />
                                                    </CardContent>
                                                </Card>
                                            )}

                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </Fragment>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
