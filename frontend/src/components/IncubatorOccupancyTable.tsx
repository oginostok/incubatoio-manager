/**
 * T017 - Piano Incubazione Settimanale
 * Weekly incubation planning table with dynamic "Conto Incubazione" columns.
 */

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";

const API_BASE = API_BASE_URL;
const MAX_INCUBABILE = 387200;

const SETTINGS_KEY = "t017_settings";

interface Conto {
    id: number;
    nome: string;
    ordine: number;
    active: boolean;
}

interface PlanningRow {
    anno: number;
    settimana: number;
    settimana_label: string;
    granpollo: number;
    pollo70: number;
    coloryeald: number;
    ross: number;
    conto_values: Record<number, number>;
    zona_faraone: number;
    somma_incubato: number;
    posti_restanti: number;
    occupazione: number;
}

interface EditingCell {
    anno: number;
    settimana: number;
    field: string;
}

interface T017Settings {
    numWeeks: number;
    polmone: number;
}

function loadSettings(): T017Settings {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) return JSON.parse(saved);
    } catch {}
    return { numWeeks: 52, polmone: 30000 };
}

function saveSettings(s: T017Settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export default function IncubatorOccupancyTable() {
    const [rows, setRows] = useState<PlanningRow[]>([]);
    const [conti, setConti] = useState<Conto[]>([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<T017Settings>(loadSettings);

    // Settings modal
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [draftSettings, setDraftSettings] = useState<T017Settings>(loadSettings);

    // Conti modal
    const [showContiModal, setShowContiModal] = useState(false);
    const [newContoName, setNewContoName] = useState("");
    const [renamingId, setRenamingId] = useState<number | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [confirmDeleteContoId, setConfirmDeleteContoId] = useState<number | null>(null);

    // Inline editing
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
    const [editValue, setEditValue] = useState("");

    useEffect(() => {
        fetchData(settings);
    }, []);

    const generateFallbackRows = (numWeeks: number): PlanningRow[] => {
        const tmp = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
        tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
        const currentWeek = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        let year = tmp.getUTCFullYear();
        let week = currentWeek;
        const rows: PlanningRow[] = [];
        for (let i = 0; i < numWeeks; i++) {
            rows.push({
                anno: year, settimana: week,
                settimana_label: `${year}/${String(week).padStart(2, "0")}`,
                granpollo: 0, pollo70: 0, coloryeald: 0, ross: 0,
                conto_values: {}, zona_faraone: 0,
                somma_incubato: 0, posti_restanti: MAX_INCUBABILE, occupazione: 0,
            });
            week++;
            if (week > 52) { week = 1; year++; }
        }
        return rows;
    };

    const fetchData = async (s: T017Settings) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/incubation-planning/data?num_weeks=${s.numWeeks}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setConti(json.conti || []);
            setRows(json.rows?.length > 0 ? json.rows : generateFallbackRows(s.numWeeks));
        } catch (err) {
            console.error("Failed to load incubation planning data:", err);
            setRows(generateFallbackRows(s.numWeeks));
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (value: number) =>
        value.toLocaleString("it-IT", { useGrouping: true });

    // ---- Settings ----

    const handleSaveSettings = () => {
        const s = {
            numWeeks: Math.max(1, Math.min(104, draftSettings.numWeeks || 52)),
            polmone: Math.max(0, draftSettings.polmone || 30000),
        };
        saveSettings(s);
        setSettings(s);
        setShowSettingsModal(false);
        fetchData(s);
    };

    // ---- Conti management ----

    const handleAddConto = async () => {
        if (!newContoName.trim()) return;
        try {
            await fetch(`${API_BASE}/api/incubation-planning/conti`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nome: newContoName.trim() }),
            });
            setNewContoName("");
            fetchData(settings);
        } catch (err) {
            console.error("Failed to add conto:", err);
        }
    };

    const handleRenameConto = async (id: number) => {
        if (!renameValue.trim()) return;
        try {
            await fetch(`${API_BASE}/api/incubation-planning/conti/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nome: renameValue.trim() }),
            });
            setRenamingId(null);
            fetchData(settings);
        } catch (err) {
            console.error("Failed to rename conto:", err);
        }
    };

    const handleDeleteConto = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE}/api/incubation-planning/conti/${id}`, { method: "DELETE" });
            if (!res.ok) { alert((await res.json()).detail || "Impossibile eliminare"); return; }
            setConfirmDeleteContoId(null);
            fetchData(settings);
        } catch (err) {
            console.error("Failed to delete conto:", err);
        }
    };

    // ---- Inline cell editing ----

    const handleDoubleClick = (anno: number, settimana: number, field: string, currentValue: number) => {
        setEditingCell({ anno, settimana, field });
        setEditValue(currentValue.toString());
    };

    const handleCellSave = async () => {
        if (!editingCell) return;
        const quantita = parseInt(editValue) || 0;
        const conto_id = editingCell.field.startsWith("conto_")
            ? parseInt(editingCell.field.replace("conto_", ""))
            : null;
        try {
            await fetch(`${API_BASE}/api/incubation-planning/data`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ anno: editingCell.anno, settimana: editingCell.settimana, conto_id, quantita }),
            });
            setEditingCell(null);
            fetchData(settings);
        } catch (err) {
            console.error("Failed to save planning data:", err);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleCellSave();
        else if (e.key === "Escape") setEditingCell(null);
    };

    // ---- Color helpers ----

    const getPossiStyle = (posti: number) => {
        if (posti < 0) return { bg: "bg-pink-100", text: "text-red-800 font-bold" };
        if (posti < settings.polmone) return { bg: "bg-yellow-100", text: "text-yellow-800" };
        return { bg: "", text: "text-gray-700" };
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <p className="text-gray-500">Caricamento...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-600 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Piano Incubazione Settimanale</h2>
                    <p className="text-xs text-gray-300">T017</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setDraftSettings({ ...settings }); setShowSettingsModal(true); }}
                        className="px-4 py-2 bg-white/20 text-white border border-white/30 rounded-lg font-medium hover:bg-white/30 transition-colors flex items-center gap-2"
                    >
                        <span>⚙</span>
                        Impostazioni
                    </button>
                    <button
                        onClick={() => setShowContiModal(true)}
                        className="px-4 py-2 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                    >
                        Modifica Conto Incubazione
                    </button>
                </div>
            </div>

            {/* Settings Modal */}
            {showSettingsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-96 shadow-2xl">
                        <h3 className="text-lg font-bold mb-5">Impostazioni T017</h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Settimane da visualizzare
                            </label>
                            <input
                                type="number"
                                min={1} max={104}
                                value={draftSettings.numWeeks}
                                onChange={(e) => setDraftSettings(d => ({ ...d, numWeeks: parseInt(e.target.value) || 52 }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none"
                            />
                            <p className="text-xs text-gray-400 mt-1">Default: 52 (max 104)</p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Soglia Polmone (Posti Restanti)
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={draftSettings.polmone}
                                onChange={(e) => setDraftSettings(d => ({ ...d, polmone: parseInt(e.target.value) || 30000 }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Se Posti Restanti &lt; soglia → sfondo giallo. Default: 30.000
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSettingsModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                            >
                                Salva e Aggiorna
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Conti Modal */}
            {showContiModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-[480px] shadow-2xl max-h-[80vh] flex flex-col">
                        <h3 className="text-lg font-bold mb-4">Gestione Conti Incubazione</h3>

                        <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                            {conti.map((c) => (
                                <div key={c.id} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                                    {renamingId === c.id ? (
                                        <>
                                            <input
                                                type="text"
                                                value={renameValue}
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleRenameConto(c.id);
                                                    if (e.key === "Escape") setRenamingId(null);
                                                }}
                                                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-gray-400 focus:outline-none text-sm"
                                                autoFocus
                                            />
                                            <button onClick={() => handleRenameConto(c.id)} className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700">Salva</button>
                                            <button onClick={() => setRenamingId(null)} className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">Annulla</button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex-1 text-sm text-gray-800">{c.nome}</span>
                                            <button onClick={() => { setRenamingId(c.id); setRenameValue(c.nome); }} className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">Rinomina</button>
                                            {confirmDeleteContoId === c.id ? (
                                                <>
                                                    <span className="text-xs text-red-600">Sicuro?</span>
                                                    <button onClick={() => handleDeleteConto(c.id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">Elimina</button>
                                                    <button onClick={() => setConfirmDeleteContoId(null)} className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">No</button>
                                                </>
                                            ) : (
                                                <button onClick={() => setConfirmDeleteContoId(c.id)} className="px-2 py-1 text-gray-400 hover:text-red-500 text-lg font-bold leading-none" title="Elimina">×</button>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newContoName}
                                onChange={(e) => setNewContoName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleAddConto(); }}
                                placeholder="Nome nuovo conto..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
                            />
                            <button onClick={handleAddConto} className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">+ Aggiungi</button>
                        </div>

                        <button onClick={() => setShowContiModal(false)} className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Chiudi</button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm table-fixed">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 uppercase border-b border-gray-200 sticky left-0 bg-gray-100 w-24 z-20">
                                Sett. Incub.
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b border-gray-200 bg-gray-50 w-28">Granpollo</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b border-gray-200 bg-gray-50 w-28">Pollo70</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b border-gray-200 bg-gray-50 w-28">Color Yeald</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b border-gray-200 bg-gray-50 w-28">Ross</th>
                            {conti.map((c) => (
                                <th key={c.id} className="px-3 py-2 text-center text-xs font-medium text-gray-700 border-b border-gray-200 bg-yellow-50 w-28">{c.nome}</th>
                            ))}
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase border-b border-gray-200 bg-purple-50 w-28">Zona Faraone</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 uppercase border-b border-gray-200 bg-gray-200 w-32">Somma Incubato</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 uppercase border-b border-gray-200 bg-gray-100 w-32">Posti Restanti</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 uppercase border-b border-gray-200 bg-gray-100 w-28">Occupazione</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => {
                            const postiStyle = getPossiStyle(row.posti_restanti);
                            return (
                                <tr key={`${row.anno}-${row.settimana}`} className={`hover:bg-gray-100 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                                    <td className="px-3 py-2 text-center font-medium text-gray-700 sticky left-0 bg-inherit border-r border-gray-200">
                                        {row.settimana_label}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-gray-600">{formatNumber(row.granpollo)}</td>
                                    <td className="px-3 py-2 text-right font-mono text-gray-600">{formatNumber(row.pollo70)}</td>
                                    <td className="px-3 py-2 text-right font-mono text-gray-600">{formatNumber(row.coloryeald)}</td>
                                    <td className="px-3 py-2 text-right font-mono text-gray-600">{formatNumber(row.ross)}</td>

                                    {conti.map((c) => {
                                        const field = `conto_${c.id}`;
                                        const isEditing = editingCell?.anno === row.anno && editingCell?.settimana === row.settimana && editingCell?.field === field;
                                        const value = row.conto_values[c.id] ?? 0;
                                        return (
                                            <td key={c.id} className="px-1 py-1 bg-yellow-50 cursor-pointer hover:bg-yellow-100 h-9" onDoubleClick={() => handleDoubleClick(row.anno, row.settimana, field, value)}>
                                                {isEditing ? (
                                                    <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleCellSave} onKeyDown={handleKeyDown}
                                                        className="w-full h-full px-2 text-right font-mono text-sm bg-white border border-yellow-400 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500 box-border" autoFocus />
                                                ) : (
                                                    <div className="px-2 text-right font-mono text-sm">{formatNumber(value)}</div>
                                                )}
                                            </td>
                                        );
                                    })}

                                    {(() => {
                                        const isEditing = editingCell?.anno === row.anno && editingCell?.settimana === row.settimana && editingCell?.field === "zona_faraone";
                                        return (
                                            <td className="px-1 py-1 bg-purple-50 cursor-pointer hover:bg-purple-100 h-9" onDoubleClick={() => handleDoubleClick(row.anno, row.settimana, "zona_faraone", row.zona_faraone)}>
                                                {isEditing ? (
                                                    <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleCellSave} onKeyDown={handleKeyDown}
                                                        className="w-full h-full px-2 text-right font-mono text-sm bg-white border border-purple-400 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 box-border" autoFocus />
                                                ) : (
                                                    <div className="px-2 text-right font-mono text-sm">{formatNumber(row.zona_faraone)}</div>
                                                )}
                                            </td>
                                        );
                                    })()}

                                    <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800 bg-gray-200">{formatNumber(row.somma_incubato)}</td>
                                    <td className={`px-3 py-2 text-right font-mono ${postiStyle.bg} ${postiStyle.text}`}>{formatNumber(row.posti_restanti)}</td>
                                    <td className="px-3 py-2 text-center font-mono text-gray-700">{row.occupazione.toFixed(1)}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="p-3 border-t border-gray-100 flex items-center gap-6 text-xs text-gray-500 bg-gray-50 flex-wrap">
                <span>Doppio click su celle gialle/viola per modificare</span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-pink-100 inline-block border border-pink-300" />
                    Oltre capacità massima ({formatNumber(MAX_INCUBABILE)})
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-yellow-100 inline-block border border-yellow-300" />
                    Polmone &lt; {formatNumber(settings.polmone)}
                </span>
                <span className="text-gray-400 ml-auto">{rows.length} settimane • Cap. max: {formatNumber(MAX_INCUBABILE)}</span>
            </div>
        </div>
    );
}
