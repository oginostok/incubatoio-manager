/**
 * SchedaSettimanale
 * Replica della scheda cartacea "Scheda Settimanale di Raccolta Dati — RIPRODUTTORI"
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { Save, Check, AlertCircle, Loader2 } from "lucide-react";
import { AllevamentiAPI, SchedaAPI } from "@/lib/api";
import type { Lotto } from "@/types";
import { TreatmentsCalendar } from "@/components/TreatmentsCalendar";

// ---------- TYPES ----------
interface DailyRow {
    mortalitaMaschi: string;
    mortalitaFemmine: string;
    tempMin: string;
    tempMax: string;
    luceDa: string;
    luceA: string;
    uovaCova: string;
    uovaScarto: string;
    razioneMaschi: string;
    razioneFemmine: string;
    acquaConsumata: string;
}

interface Pesi {
    pesoGalline: string;
    pesoGallineAtteso: string;
    pesoGalli: string;
    pesoGalliAtteso: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ---------- CONSTANTS ----------
const GIORNI_LABELS = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];
const MESI_ABBR = ["GEN", "FEB", "MAR", "APR", "MAG", "GIU", "LUG", "AGO", "SET", "OTT", "NOV", "DIC"];

const EMPTY_ROW: DailyRow = {
    mortalitaMaschi: "",
    mortalitaFemmine: "",
    tempMin: "",
    tempMax: "",
    luceDa: "",
    luceA: "",
    uovaCova: "",
    uovaScarto: "",
    razioneMaschi: "",
    razioneFemmine: "",
    acquaConsumata: "",
};

// ---------- HELPERS ----------
function getISOWeekYear(date: Date): { week: number; year: number } {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const year = d.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const week = Math.round(((d.getTime() - jan1.getTime()) / 86400000 + ((jan1.getDay() + 6) % 7)) / 7) + 1;
    return { week, year };
}

function getWeekDates(week: number, year: number): Date[] {
    const jan4 = new Date(year, 0, 4);
    const jan4Day = (jan4.getDay() + 6) % 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - jan4Day + (week - 1) * 7);
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

function calcEtaSettimane(
    lottoAnnoStart: number,
    lottoSettStart: number,
    targetWeek: number,
    targetYear: number
): number {
    const start = getWeekDates(lottoSettStart, lottoAnnoStart)[0];
    const target = getWeekDates(targetWeek, targetYear)[0];
    return Math.round((target.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

function strOrEmpty(v: number | null | undefined): string {
    return v != null ? v.toString() : "";
}

// ---------- STYLES ----------
const inputBase =
    "w-full bg-transparent text-center text-sm outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-300 rounded px-1 py-1.5 transition-colors";
const headerInput =
    "bg-white/80 border border-gray-300 rounded px-2 py-1 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all";
const selectInput =
    "bg-white/80 border border-gray-300 rounded px-2 py-1 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all cursor-pointer flex-1";
const readonlyField =
    "bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm font-medium text-gray-500 select-none flex-1 min-h-[30px] flex items-center";
const thBase =
    "px-2 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wide border border-gray-300";
const tdBase = "px-1 py-0.5 border border-gray-200 text-center";
const sectionTitle =
    "text-sm font-bold text-gray-700 uppercase tracking-wider bg-gray-100 px-3 py-2 border border-gray-300";

// ---------- COMPONENT ----------
export function SchedaSettimanale() {
    // -- Data from DB --
    const [lotti, setLotti] = useState<Lotto[]>([]);

    useEffect(() => {
        AllevamentiAPI.getLotti().then(setLotti).catch(console.error);
    }, []);

    // -- Week selector (default = current ISO week) --
    const { week: nowWeek, year: nowYear } = useMemo(() => getISOWeekYear(new Date()), []);
    const [settimana, setSettimana] = useState(nowWeek.toString().padStart(2, "0"));
    const [anno, setAnno] = useState(nowYear.toString());

    // -- Farm selection --
    const [selectedAllevamento, setSelectedAllevamento] = useState("");
    const [selectedCapannone, setSelectedCapannone] = useState("");

    // -- Editable animal counts --
    const [gallinePresenti, setGallinePresenti] = useState("");
    const [galliPresenti, setGalliPresenti] = useState("");
    const [galliBox, setGalliBox] = useState("");

    // -- Daily rows (LUN → DOM) --
    const [rows, setRows] = useState<DailyRow[]>(Array.from({ length: 7 }, () => ({ ...EMPTY_ROW })));

    // -- Pesi --
    const [pesi, setPesi] = useState<Pesi>({
        pesoGalline: "",
        pesoGallineAtteso: "",
        pesoGalli: "",
        pesoGalliAtteso: "",
    });

    // -- Note --
    const [note, setNote] = useState("");

    // -- Save state --
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

    // -- Derived: allevamenti (escludi fase pollastra) --
    const allevamenti = useMemo(() => {
        const base = lotti.filter((l) => !l.Fase || l.Fase === null);
        return [...new Set(base.map((l) => l.Allevamento))].sort();
    }, [lotti]);

    // -- Derived: capannoni per allevamento selezionato --
    const capannoni = useMemo(() => {
        if (!selectedAllevamento) return [];
        return lotti
            .filter((l) => l.Allevamento === selectedAllevamento && (!l.Fase || l.Fase === null))
            .map((l) => l.Capannone)
            .filter((c, i, arr) => arr.indexOf(c) === i)
            .sort((a, b) => Number(a) - Number(b));
    }, [lotti, selectedAllevamento]);

    // -- Lotto selezionato --
    const selectedLotto = useMemo<Lotto | null>(() => {
        if (!selectedAllevamento || !selectedCapannone) return null;
        return (
            lotti.find(
                (l) =>
                    l.Allevamento === selectedAllevamento &&
                    l.Capannone === selectedCapannone &&
                    (!l.Fase || l.Fase === null)
            ) ?? null
        );
    }, [lotti, selectedAllevamento, selectedCapannone]);

    // Reset capannone quando cambia allevamento
    useEffect(() => {
        setSelectedCapannone("");
    }, [selectedAllevamento]);

    // -- Carica scheda da DB quando cambiano allevamento/capannone/settimana/anno --
    useEffect(() => {
        if (!selectedAllevamento || !selectedCapannone) return;
        const w = parseInt(settimana) || 0;
        const y = parseInt(anno) || 0;
        if (!w || !y) return;

        SchedaAPI.load(selectedAllevamento, selectedCapannone, y, w).then((data) => {
            if (data) {
                // Carica dati salvati
                setGallinePresenti(strOrEmpty(data.galline_presenti));
                setGalliPresenti(strOrEmpty(data.galli_presenti));
                setGalliBox(strOrEmpty(data.galli_box));
                setNote(data.note || "");
                setPesi({
                    pesoGalline: strOrEmpty(data.peso_galline),
                    pesoGallineAtteso: strOrEmpty(data.peso_galline_atteso),
                    pesoGalli: strOrEmpty(data.peso_galli),
                    pesoGalliAtteso: strOrEmpty(data.peso_galli_atteso),
                });
                if (Array.isArray(data.righe) && data.righe.length === 7) {
                    setRows(
                        data.righe.map((r: Record<string, unknown>) => ({
                            mortalitaMaschi: strOrEmpty(r.mortalita_maschi as number),
                            mortalitaFemmine: strOrEmpty(r.mortalita_femmine as number),
                            tempMin: strOrEmpty(r.temp_min as number),
                            tempMax: strOrEmpty(r.temp_max as number),
                            luceDa: (r.luce_da as string) || "",
                            luceA: (r.luce_a as string) || "",
                            uovaCova: strOrEmpty(r.uova_cova as number),
                            uovaScarto: strOrEmpty(r.uova_scarto as number),
                            razioneMaschi: strOrEmpty(r.razione_maschi as number),
                            razioneFemmine: strOrEmpty(r.razione_femmine as number),
                            acquaConsumata: strOrEmpty(r.acqua_consumata as number),
                        }))
                    );
                }
                setSaveStatus("idle");
            } else {
                // Nessun record salvato: pre-popola da lotto se disponibile
                setGallinePresenti(selectedLotto ? selectedLotto.Capi.toString() : "");
                setGalliPresenti("");
                setGalliBox("");
                setNote("");
                setPesi({ pesoGalline: "", pesoGallineAtteso: "", pesoGalli: "", pesoGalliAtteso: "" });
                setRows(Array.from({ length: 7 }, () => ({ ...EMPTY_ROW })));
                setTrattamenti([{ prodotto: "", da: "", a: "" }, { prodotto: "", da: "", a: "" }]);
                setSaveStatus("idle");
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAllevamento, selectedCapannone, settimana, anno]);

    // -- Computed: età in settimane --
    const etaSettimane = useMemo(() => {
        if (!selectedLotto) return "";
        const w = parseInt(settimana) || 0;
        const y = parseInt(anno) || 0;
        if (!w || !y) return "";
        const eta = calcEtaSettimane(selectedLotto.Anno_Start, selectedLotto.Sett_Start, w, y);
        return eta >= 0 ? eta.toString() : "0";
    }, [selectedLotto, settimana, anno]);

    // -- Computed: % Galli (galli / galline * 100) --
    const percGalli = useMemo(() => {
        const g = parseFloat(galliPresenti) || 0;
        const f = parseFloat(gallinePresenti) || 0;
        if (f === 0) return "";
        return ((g / f) * 100).toFixed(1);
    }, [galliPresenti, gallinePresenti]);

    // -- Computed: % deposizione --
    const percDeposizione = useMemo(() => {
        const galline = parseFloat(gallinePresenti) || 0;
        if (galline === 0) return Array(7).fill("");
        return rows.map((r) => {
            const cova = parseFloat(r.uovaCova) || 0;
            return cova > 0 ? ((cova / galline) * 100).toFixed(1) : "";
        });
    }, [rows, gallinePresenti]);

    // -- Computed: date della settimana selezionata (LUN-DOM) --
    const weekDates = useMemo(() => {
        const w = Math.max(1, Math.min(53, parseInt(settimana) || 1));
        const y = parseInt(anno) || new Date().getFullYear();
        return getWeekDates(w, y);
    }, [settimana, anno]);

    // -- Save --
    const canSave = !!selectedAllevamento && !!selectedCapannone;

    const handleSave = useCallback(async () => {
        if (!canSave) return;
        const w = parseInt(settimana) || 1;
        const y = parseInt(anno) || new Date().getFullYear();

        setSaveStatus("saving");
        try {
            await SchedaAPI.save({
                allevamento: selectedAllevamento,
                capannone: selectedCapannone,
                anno: y,
                settimana: w,
                lotto_id: selectedLotto?.id ?? null,
                galline_presenti: parseInt(gallinePresenti) || 0,
                galli_presenti: parseInt(galliPresenti) || 0,
                galli_box: parseInt(galliBox) || 0,
                righe: rows.map((r) => ({
                    mortalita_maschi: r.mortalitaMaschi !== "" ? parseInt(r.mortalitaMaschi) : null,
                    mortalita_femmine: r.mortalitaFemmine !== "" ? parseInt(r.mortalitaFemmine) : null,
                    temp_min: r.tempMin !== "" ? parseFloat(r.tempMin) : null,
                    temp_max: r.tempMax !== "" ? parseFloat(r.tempMax) : null,
                    luce_da: r.luceDa || "",
                    luce_a: r.luceA || "",
                    uova_cova: r.uovaCova !== "" ? parseInt(r.uovaCova) : null,
                    uova_scarto: r.uovaScarto !== "" ? parseInt(r.uovaScarto) : null,
                    razione_maschi: r.razioneMaschi !== "" ? parseInt(r.razioneMaschi) : null,
                    razione_femmine: r.razioneFemmine !== "" ? parseInt(r.razioneFemmine) : null,
                    acqua_consumata: r.acquaConsumata !== "" ? parseFloat(r.acquaConsumata) : null,
                })),
                peso_galline: pesi.pesoGalline !== "" ? parseFloat(pesi.pesoGalline) : null,
                peso_galline_atteso: pesi.pesoGallineAtteso !== "" ? parseFloat(pesi.pesoGallineAtteso) : null,
                peso_galli: pesi.pesoGalli !== "" ? parseFloat(pesi.pesoGalli) : null,
                peso_galli_atteso: pesi.pesoGalliAtteso !== "" ? parseFloat(pesi.pesoGalliAtteso) : null,
                note,
            });
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 2500);
        } catch {
            setSaveStatus("error");
            setTimeout(() => setSaveStatus("idle"), 3000);
        }
    }, [
        canSave, selectedAllevamento, selectedCapannone, anno, settimana,
        selectedLotto, gallinePresenti, galliPresenti, galliBox,
        rows, pesi, note,
    ]);

    // -- Helpers --
    const updateRow = (idx: number, field: keyof DailyRow, value: string) =>
        setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));

    const updatePesi = (field: keyof Pesi, value: string) =>
        setPesi((prev) => ({ ...prev, [field]: value }));

    const fmtDate = (d: Date) =>
        `${d.getDate().toString().padStart(2, "0")} ${MESI_ABBR[d.getMonth()]}`;

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">
            {/* ========== TITLE + SALVA ========== */}
            <div className="flex items-start justify-between gap-4 mb-2">
                {/* Spacer sinistro */}
                <div className="flex-1" />
                {/* Titolo centrato */}
                <div className="text-center flex-1">
                    <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
                        Scheda Settimanale di Raccolta Dati
                    </h2>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">
                        RIPRODUTTORI
                    </p>
                </div>
                {/* Pulsante SALVA a destra */}
                <div className="flex-1 flex justify-end items-start pt-1">
                    <button
                        onClick={handleSave}
                        disabled={!canSave || saveStatus === "saving"}
                        className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm
                            ${!canSave
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : saveStatus === "saving"
                                ? "bg-blue-400 text-white cursor-wait"
                                : saveStatus === "saved"
                                ? "bg-green-500 text-white"
                                : saveStatus === "error"
                                ? "bg-red-500 text-white"
                                : "bg-amber-600 hover:bg-amber-700 text-white"
                            }`}
                    >
                        {saveStatus === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saveStatus === "saved" && <Check className="w-4 h-4" />}
                        {saveStatus === "error" && <AlertCircle className="w-4 h-4" />}
                        {(saveStatus === "idle" || saveStatus === "saving") && saveStatus !== "saving" && (
                            <Save className="w-4 h-4" />
                        )}
                        {saveStatus === "idle" && "Salva"}
                        {saveStatus === "saving" && "Salvataggio…"}
                        {saveStatus === "saved" && "Salvato!"}
                        {saveStatus === "error" && "Errore!"}
                    </button>
                </div>
            </div>

            {/* ========== HEADER ========== */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                    {/* Colonna sinistra */}
                    <div className="space-y-3">
                        {/* Allevamento */}
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold text-gray-600 w-40 shrink-0">
                                Allevamento
                            </label>
                            <select
                                className={selectInput}
                                value={selectedAllevamento}
                                onChange={(e) => setSelectedAllevamento(e.target.value)}
                            >
                                <option value="">— Seleziona —</option>
                                {allevamenti.map((a) => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>

                        {/* Capannone */}
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold text-gray-600 w-40 shrink-0">
                                Capannone
                            </label>
                            <select
                                className={
                                    selectInput +
                                    (!selectedAllevamento ? " opacity-50 cursor-not-allowed" : "")
                                }
                                value={selectedCapannone}
                                onChange={(e) => setSelectedCapannone(e.target.value)}
                                disabled={!selectedAllevamento}
                            >
                                <option value="">— Seleziona —</option>
                                {capannoni.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* Età in Settimane (readonly) */}
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold text-gray-600 w-40 shrink-0">
                                Età in Settimane
                            </label>
                            <div className={readonlyField}>
                                {etaSettimane ? `${etaSettimane} sett.` : "—"}
                            </div>
                        </div>
                    </div>

                    {/* Colonna destra */}
                    <div className="space-y-3">
                        {/* Razze (readonly) */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-gray-500 w-28 shrink-0">
                                    Razza Galline
                                </label>
                                <div className={readonlyField}>
                                    {selectedLotto?.Razza || "—"}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-gray-500 w-28 shrink-0">
                                    Razza Galli
                                </label>
                                <div className={readonlyField}>
                                    {selectedLotto?.Razza_Gallo || "—"}
                                </div>
                            </div>
                        </div>

                        {/* Galline + Galli + % Galli + Galli Box */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-gray-500 w-28 shrink-0">
                                    Galline presenti
                                </label>
                                <input
                                    className={headerInput + " flex-1"}
                                    value={gallinePresenti}
                                    onChange={(e) => setGallinePresenti(e.target.value)}
                                    placeholder="n. galline"
                                    type="number"
                                    min={0}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-gray-500 w-28 shrink-0">
                                    Galli presenti
                                </label>
                                <input
                                    className={headerInput + " flex-1"}
                                    value={galliPresenti}
                                    onChange={(e) => setGalliPresenti(e.target.value)}
                                    placeholder="n. galli"
                                    type="number"
                                    min={0}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-gray-500 w-28 shrink-0">
                                    % Galli
                                </label>
                                <div className="bg-red-50 border border-red-200 rounded px-3 py-1 text-sm font-bold text-red-700 min-w-[80px] text-center">
                                    {percGalli ? `${percGalli}%` : "—"}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-gray-500 w-28 shrink-0">
                                    Galli Box
                                </label>
                                <input
                                    className={headerInput + " flex-1"}
                                    value={galliBox}
                                    onChange={(e) => setGalliBox(e.target.value)}
                                    placeholder="n. galli box"
                                    type="number"
                                    min={0}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== SETTIMANA REGISTRATA ========== */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center gap-6 flex-wrap">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        Settimana registrata
                    </h3>
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-semibold text-gray-600">Settimana</label>
                            <input
                                className={headerInput + " w-16 text-center"}
                                value={settimana}
                                onChange={(e) => setSettimana(e.target.value.replace(/\D/g, "").slice(0, 2))}
                                placeholder="WW"
                                maxLength={2}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-semibold text-gray-600">Anno</label>
                            <input
                                className={headerInput + " w-20 text-center"}
                                value={anno}
                                onChange={(e) => setAnno(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                placeholder="YYYY"
                                maxLength={4}
                            />
                        </div>
                        {weekDates.length === 7 && (
                            <span className="text-sm text-gray-500 font-medium">
                                {fmtDate(weekDates[0])} — {fmtDate(weekDates[6])}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ========== TABELLA GIORNALIERA ========== */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[1100px]">
                        <thead>
                            <tr className="bg-gradient-to-b from-gray-100 to-gray-50">
                                <th className={thBase} rowSpan={2}></th>
                                <th className={thBase} rowSpan={2}>Data</th>
                                <th className={thBase + " bg-red-50"} colSpan={2}>Mortalità</th>
                                <th className={thBase + " bg-orange-50"} colSpan={2}>Temperatura</th>
                                <th className={thBase + " bg-yellow-50"} colSpan={2}>Luce</th>
                                <th className={thBase + " bg-green-50"} colSpan={2}>Uova</th>
                                <th className={thBase + " bg-blue-50"} colSpan={2}>Razione grammi/gg</th>
                                <th className={thBase + " bg-cyan-50"} rowSpan={2}>Acqua<br />Consumata</th>
                                <th className={thBase + " bg-purple-50"} rowSpan={2}>%DEPOS</th>
                            </tr>
                            <tr className="bg-gradient-to-b from-gray-50 to-white">
                                <th className={thBase + " bg-red-50 text-red-700"}>Maschi</th>
                                <th className={thBase + " bg-red-50 text-red-700"}>Femmine</th>
                                <th className={thBase + " bg-orange-50 text-orange-700"}>MIN</th>
                                <th className={thBase + " bg-orange-50 text-orange-700"}>MAX</th>
                                <th className={thBase + " bg-yellow-50 text-yellow-700"}>DA</th>
                                <th className={thBase + " bg-yellow-50 text-yellow-700"}>A</th>
                                <th className={thBase + " bg-green-50 text-green-700"}>COVA</th>
                                <th className={thBase + " bg-green-50 text-green-700"}>SCARTO</th>
                                <th className={thBase + " bg-blue-50 text-blue-700"}>Maschi</th>
                                <th className={thBase + " bg-blue-50 text-blue-700"}>Femmine</th>
                            </tr>
                        </thead>
                        <tbody>
                            {GIORNI_LABELS.map((label, idx) => (
                                <tr
                                    key={label}
                                    className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-blue-50/30 transition-colors`}
                                >
                                    <td className={tdBase + " font-bold text-xs text-gray-600 w-12"}>
                                        {label}
                                    </td>
                                    <td className={tdBase + " w-20 font-medium text-sm text-gray-700 whitespace-nowrap"}>
                                        {weekDates[idx] ? fmtDate(weekDates[idx]) : ""}
                                    </td>
                                    <td className={tdBase + " bg-red-50/30 w-16"}>
                                        <input className={inputBase} value={rows[idx].mortalitaMaschi}
                                            onChange={(e) => updateRow(idx, "mortalitaMaschi", e.target.value)} type="number" min={0} />
                                    </td>
                                    <td className={tdBase + " bg-red-50/30 w-16"}>
                                        <input className={inputBase} value={rows[idx].mortalitaFemmine}
                                            onChange={(e) => updateRow(idx, "mortalitaFemmine", e.target.value)} type="number" min={0} />
                                    </td>
                                    <td className={tdBase + " bg-orange-50/30 w-16"}>
                                        <input className={inputBase} value={rows[idx].tempMin}
                                            onChange={(e) => updateRow(idx, "tempMin", e.target.value)} type="number" step="0.1" />
                                    </td>
                                    <td className={tdBase + " bg-orange-50/30 w-16"}>
                                        <input className={inputBase} value={rows[idx].tempMax}
                                            onChange={(e) => updateRow(idx, "tempMax", e.target.value)} type="number" step="0.1" />
                                    </td>
                                    <td className={tdBase + " bg-yellow-50/30 w-20"}>
                                        <input className={inputBase} value={rows[idx].luceDa}
                                            onChange={(e) => updateRow(idx, "luceDa", e.target.value)} type="time" />
                                    </td>
                                    <td className={tdBase + " bg-yellow-50/30 w-20"}>
                                        <input className={inputBase} value={rows[idx].luceA}
                                            onChange={(e) => updateRow(idx, "luceA", e.target.value)} type="time" />
                                    </td>
                                    <td className={tdBase + " bg-green-50/30 w-20"}>
                                        <input className={inputBase} value={rows[idx].uovaCova}
                                            onChange={(e) => updateRow(idx, "uovaCova", e.target.value)} type="number" min={0} />
                                    </td>
                                    <td className={tdBase + " bg-green-50/30 w-20"}>
                                        <input className={inputBase} value={rows[idx].uovaScarto}
                                            onChange={(e) => updateRow(idx, "uovaScarto", e.target.value)} type="number" min={0} />
                                    </td>
                                    <td className={tdBase + " bg-blue-50/30 w-16"}>
                                        <input className={inputBase} value={rows[idx].razioneMaschi}
                                            onChange={(e) => updateRow(idx, "razioneMaschi", e.target.value)} type="number" min={0} />
                                    </td>
                                    <td className={tdBase + " bg-blue-50/30 w-16"}>
                                        <input className={inputBase} value={rows[idx].razioneFemmine}
                                            onChange={(e) => updateRow(idx, "razioneFemmine", e.target.value)} type="number" min={0} />
                                    </td>
                                    <td className={tdBase + " bg-cyan-50/30 w-24"}>
                                        <input className={inputBase} value={rows[idx].acquaConsumata}
                                            onChange={(e) => updateRow(idx, "acquaConsumata", e.target.value)} type="number" min={0} />
                                    </td>
                                    <td className={tdBase + " bg-purple-50/30 w-16 font-semibold text-purple-700 text-sm"}>
                                        {percDeposizione[idx] ? `${percDeposizione[idx]}%` : ""}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ========== TRATTAMENTI ========== */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className={sectionTitle}>Trattamenti (Acidi, Probiotici, Vitamine)</div>
                <div className="p-4">
                    {selectedLotto ? (
                        <TreatmentsCalendar lottoId={selectedLotto.id} />
                    ) : (
                        <p className="text-sm text-gray-400 italic text-center py-4">
                            Seleziona un allevamento e un capannone per gestire i trattamenti.
                        </p>
                    )}
                </div>
            </div>

            {/* ========== PESI + NOTE ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pesi */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className={sectionTitle}>Pesi</div>
                    <div className="p-4">
                        <table className="w-full border-collapse">
                            <tbody>
                                <tr>
                                    <td className="py-2 pr-3 text-sm font-semibold text-gray-600">Peso Galline</td>
                                    <td className="py-2 px-2">
                                        <input className={headerInput + " w-28"} value={pesi.pesoGalline}
                                            onChange={(e) => updatePesi("pesoGalline", e.target.value)} type="number" placeholder="grammi" />
                                    </td>
                                    <td className="py-2 px-2 text-xs font-semibold text-gray-500">ATTESO</td>
                                    <td className="py-2 px-2">
                                        <input className={headerInput + " w-28 bg-amber-50"} value={pesi.pesoGallineAtteso}
                                            onChange={(e) => updatePesi("pesoGallineAtteso", e.target.value)} type="number" placeholder="grammi" />
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-2 pr-3 text-sm font-semibold text-gray-600">Peso Galli</td>
                                    <td className="py-2 px-2">
                                        <input className={headerInput + " w-28"} value={pesi.pesoGalli}
                                            onChange={(e) => updatePesi("pesoGalli", e.target.value)} type="number" placeholder="grammi" />
                                    </td>
                                    <td className="py-2 px-2 text-xs font-semibold text-gray-500">ATTESO</td>
                                    <td className="py-2 px-2">
                                        <input className={headerInput + " w-28 bg-amber-50"} value={pesi.pesoGalliAtteso}
                                            onChange={(e) => updatePesi("pesoGalliAtteso", e.target.value)} type="number" placeholder="grammi" />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Note */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className={sectionTitle}>Note</div>
                    <div className="p-4">
                        <textarea
                            className="w-full h-28 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all resize-none"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Osservazioni generali sulla settimana..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
