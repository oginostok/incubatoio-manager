/**
 * SchedaSettimanale
 * Replica della scheda cartacea "Scheda Settimanale di Raccolta Dati — Galline Riproduttrici"
 * Tutti i campi sono editabili via useState, i valori calcolabili sono derivati in tempo reale.
 */

import { useState, useMemo } from "react";

// ---------- TYPES ----------
interface HeaderData {
    allevamento: string;
    capannone: string;
    etaSettimane: string;
    razzaGalline: string;
    razzaGalli: string;
    gallinePresenti: string;
    galliPresenti: string;
    galliBox: string;
}

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

interface Trattamento {
    prodotto: string;
    da: string;
    a: string;
}

interface Pesi {
    pesoGalline: string;
    pesoGallineAtteso: string;
    pesoGalli: string;
    pesoGalliAtteso: string;
}

// ---------- CONSTANTS ----------
const GIORNI = [
    { num: 1, label: "VEN" },
    { num: 2, label: "SAB" },
    { num: 3, label: "DOM" },
    { num: 4, label: "LUN" },
    { num: 5, label: "MAR" },
    { num: 6, label: "MER" },
    { num: 7, label: "GIO" },
];

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

// ---------- STYLES ----------
const inputBase = "w-full bg-transparent text-center text-sm outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-300 rounded px-1 py-1.5 transition-colors";
const headerInput = "bg-white/80 border border-gray-300 rounded px-2 py-1 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all";
const thBase = "px-2 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wide border border-gray-300";
const tdBase = "px-1 py-0.5 border border-gray-200 text-center";
const sectionTitle = "text-sm font-bold text-gray-700 uppercase tracking-wider bg-gray-100 px-3 py-2 border border-gray-300";

// ---------- COMPONENT ----------
export function SchedaSettimanale() {
    // -- Header state --
    const [header, setHeader] = useState<HeaderData>({
        allevamento: "",
        capannone: "",
        etaSettimane: "",
        razzaGalline: "",
        razzaGalli: "",
        gallinePresenti: "",
        galliPresenti: "",
        galliBox: "",
    });

    // -- Daily rows --
    const [rows, setRows] = useState<DailyRow[]>(
        GIORNI.map(() => ({ ...EMPTY_ROW }))
    );

    // -- Trattamenti --
    const [trattamenti, setTrattamenti] = useState<Trattamento[]>([
        { prodotto: "", da: "", a: "" },
        { prodotto: "", da: "", a: "" },
    ]);

    // -- Pesi --
    const [pesi, setPesi] = useState<Pesi>({
        pesoGalline: "",
        pesoGallineAtteso: "",
        pesoGalli: "",
        pesoGalliAtteso: "",
    });

    // -- Note --
    const [note, setNote] = useState("");

    // -- Computed values --
    const percGalli = useMemo(() => {
        const g = parseFloat(header.galliPresenti) || 0;
        const f = parseFloat(header.gallinePresenti) || 0;
        if (g + f === 0) return "";
        return ((g / (g + f)) * 100).toFixed(1);
    }, [header.galliPresenti, header.gallinePresenti]);

    const percDeposizione = useMemo(() => {
        const galline = parseFloat(header.gallinePresenti) || 0;
        if (galline === 0) return GIORNI.map(() => "");
        return rows.map(r => {
            const cova = parseFloat(r.uovaCova) || 0;
            if (cova === 0) return "";
            return ((cova / galline) * 100).toFixed(1);
        });
    }, [rows, header.gallinePresenti]);

    // -- Helpers --
    const updateHeader = (field: keyof HeaderData, value: string) =>
        setHeader(prev => ({ ...prev, [field]: value }));

    const updateRow = (idx: number, field: keyof DailyRow, value: string) =>
        setRows(prev => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));

    const updateTrattamento = (idx: number, field: keyof Trattamento, value: string) =>
        setTrattamenti(prev => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));

    const updatePesi = (field: keyof Pesi, value: string) =>
        setPesi(prev => ({ ...prev, [field]: value }));

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">
            {/* ========== TITLE ========== */}
            <div className="text-center mb-2">
                <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
                    Scheda Settimanale di Raccolta Dati
                </h2>
                <p className="text-sm text-gray-500 font-medium uppercase tracking-widest mt-1">
                    Galline Riproduttrici
                </p>
            </div>

            {/* ========== HEADER ========== */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                    {/* Left column */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold text-gray-600 w-40 shrink-0">Allevamento</label>
                            <input
                                className={headerInput + " flex-1"}
                                value={header.allevamento}
                                onChange={e => updateHeader("allevamento", e.target.value)}
                                placeholder="es. 110AT700"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold text-gray-600 w-40 shrink-0">Capannone</label>
                            <input
                                className={headerInput + " flex-1"}
                                value={header.capannone}
                                onChange={e => updateHeader("capannone", e.target.value)}
                                placeholder="es. 5"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold text-gray-600 w-40 shrink-0">Età in Settimane</label>
                            <input
                                className={headerInput + " flex-1"}
                                value={header.etaSettimane}
                                onChange={e => updateHeader("etaSettimane", e.target.value)}
                                placeholder="es. 21"
                                type="number"
                            />
                        </div>
                    </div>
                    {/* Right column */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-gray-500 w-28 shrink-0">Razza Galline</label>
                                <input
                                    className={headerInput + " flex-1"}
                                    value={header.razzaGalline}
                                    onChange={e => updateHeader("razzaGalline", e.target.value)}
                                    placeholder="es. RUSTIC"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-gray-500 w-28 shrink-0">Razza Galli</label>
                                <input
                                    className={headerInput + " flex-1"}
                                    value={header.razzaGalli}
                                    onChange={e => updateHeader("razzaGalli", e.target.value)}
                                    placeholder="es. CNB"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-gray-500 w-28 shrink-0">Galline presenti</label>
                                <input
                                    className={headerInput + " flex-1"}
                                    value={header.gallinePresenti}
                                    onChange={e => updateHeader("gallinePresenti", e.target.value)}
                                    placeholder="Inizio sett."
                                    type="number"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-gray-500 w-28 shrink-0">Galli presenti</label>
                                <input
                                    className={headerInput + " flex-1"}
                                    value={header.galliPresenti}
                                    onChange={e => updateHeader("galliPresenti", e.target.value)}
                                    placeholder="Inizio sett."
                                    type="number"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-xs font-semibold text-gray-500 w-28 shrink-0">% Galli</label>
                                <div className="bg-red-50 border border-red-200 rounded px-3 py-1 text-sm font-bold text-red-700 min-w-[80px] text-center">
                                    {percGalli ? `${percGalli}%` : "—"}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-gray-500 w-28 shrink-0">Galli Box</label>
                                <input
                                    className={headerInput + " flex-1"}
                                    value={header.galliBox}
                                    onChange={e => updateHeader("galliBox", e.target.value)}
                                    placeholder="Box separato"
                                    type="number"
                                />
                            </div>
                        </div>
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
                            {GIORNI.map((giorno, idx) => (
                                <tr
                                    key={giorno.num}
                                    className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-blue-50/30 transition-colors`}
                                >
                                    <td className={tdBase + " font-bold text-xs text-gray-500 w-12"}>
                                        {giorno.num} {giorno.label}
                                    </td>
                                    <td className={tdBase + " w-24"}>
                                        <input
                                            className={inputBase}
                                            placeholder="gg/mm"
                                        />
                                    </td>
                                    <td className={tdBase + " bg-red-50/30 w-16"}>
                                        <input
                                            className={inputBase}
                                            value={rows[idx].mortalitaMaschi}
                                            onChange={e => updateRow(idx, "mortalitaMaschi", e.target.value)}
                                            type="number"
                                        />
                                    </td>
                                    <td className={tdBase + " bg-red-50/30 w-16"}>
                                        <input
                                            className={inputBase}
                                            value={rows[idx].mortalitaFemmine}
                                            onChange={e => updateRow(idx, "mortalitaFemmine", e.target.value)}
                                            type="number"
                                        />
                                    </td>
                                    <td className={tdBase + " bg-orange-50/30 w-16"}>
                                        <input
                                            className={inputBase}
                                            value={rows[idx].tempMin}
                                            onChange={e => updateRow(idx, "tempMin", e.target.value)}
                                            type="number"
                                            step="0.1"
                                        />
                                    </td>
                                    <td className={tdBase + " bg-orange-50/30 w-16"}>
                                        <input
                                            className={inputBase}
                                            value={rows[idx].tempMax}
                                            onChange={e => updateRow(idx, "tempMax", e.target.value)}
                                            type="number"
                                            step="0.1"
                                        />
                                    </td>
                                    <td className={tdBase + " bg-yellow-50/30 w-20"}>
                                        <input
                                            className={inputBase}
                                            value={rows[idx].luceDa}
                                            onChange={e => updateRow(idx, "luceDa", e.target.value)}
                                            type="time"
                                        />
                                    </td>
                                    <td className={tdBase + " bg-yellow-50/30 w-20"}>
                                        <input
                                            className={inputBase}
                                            value={rows[idx].luceA}
                                            onChange={e => updateRow(idx, "luceA", e.target.value)}
                                            type="time"
                                        />
                                    </td>
                                    <td className={tdBase + " bg-green-50/30 w-20"}>
                                        <input
                                            className={inputBase}
                                            value={rows[idx].uovaCova}
                                            onChange={e => updateRow(idx, "uovaCova", e.target.value)}
                                            type="number"
                                        />
                                    </td>
                                    <td className={tdBase + " bg-green-50/30 w-20"}>
                                        <input
                                            className={inputBase}
                                            value={rows[idx].uovaScarto}
                                            onChange={e => updateRow(idx, "uovaScarto", e.target.value)}
                                            type="number"
                                        />
                                    </td>
                                    <td className={tdBase + " bg-blue-50/30 w-16"}>
                                        <input
                                            className={inputBase}
                                            value={rows[idx].razioneMaschi}
                                            onChange={e => updateRow(idx, "razioneMaschi", e.target.value)}
                                            type="number"
                                        />
                                    </td>
                                    <td className={tdBase + " bg-blue-50/30 w-16"}>
                                        <input
                                            className={inputBase}
                                            value={rows[idx].razioneFemmine}
                                            onChange={e => updateRow(idx, "razioneFemmine", e.target.value)}
                                            type="number"
                                        />
                                    </td>
                                    <td className={tdBase + " bg-cyan-50/30 w-24"}>
                                        <input
                                            className={inputBase}
                                            value={rows[idx].acquaConsumata}
                                            onChange={e => updateRow(idx, "acquaConsumata", e.target.value)}
                                            type="number"
                                        />
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
                <div className="p-4 space-y-4">
                    {trattamenti.map((t, idx) => (
                        <div key={idx} className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 block mb-1">Prodotto {idx + 1}</label>
                                <input
                                    className={headerInput + " w-full"}
                                    value={t.prodotto}
                                    onChange={e => updateTrattamento(idx, "prodotto", e.target.value)}
                                    placeholder="Nome prodotto"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 block mb-1">DA</label>
                                <input
                                    className={headerInput + " w-full"}
                                    value={t.da}
                                    onChange={e => updateTrattamento(idx, "da", e.target.value)}
                                    placeholder="gg/mm/aa"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 block mb-1">A</label>
                                <input
                                    className={headerInput + " w-full"}
                                    value={t.a}
                                    onChange={e => updateTrattamento(idx, "a", e.target.value)}
                                    placeholder="gg/mm/aa"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ========== PESI + NOTE (side-by-side) ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* -- Pesi -- */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className={sectionTitle}>Pesi</div>
                    <div className="p-4">
                        <table className="w-full border-collapse">
                            <tbody>
                                <tr>
                                    <td className="py-2 pr-3 text-sm font-semibold text-gray-600">Peso Galline</td>
                                    <td className="py-2 px-2">
                                        <input
                                            className={headerInput + " w-28"}
                                            value={pesi.pesoGalline}
                                            onChange={e => updatePesi("pesoGalline", e.target.value)}
                                            type="number"
                                            placeholder="grammi"
                                        />
                                    </td>
                                    <td className="py-2 px-2 text-xs font-semibold text-gray-500">ATTESO</td>
                                    <td className="py-2 px-2">
                                        <input
                                            className={headerInput + " w-28 bg-amber-50"}
                                            value={pesi.pesoGallineAtteso}
                                            onChange={e => updatePesi("pesoGallineAtteso", e.target.value)}
                                            type="number"
                                            placeholder="grammi"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-2 pr-3 text-sm font-semibold text-gray-600">Peso Galli</td>
                                    <td className="py-2 px-2">
                                        <input
                                            className={headerInput + " w-28"}
                                            value={pesi.pesoGalli}
                                            onChange={e => updatePesi("pesoGalli", e.target.value)}
                                            type="number"
                                            placeholder="grammi"
                                        />
                                    </td>
                                    <td className="py-2 px-2 text-xs font-semibold text-gray-500">ATTESO</td>
                                    <td className="py-2 px-2">
                                        <input
                                            className={headerInput + " w-28 bg-amber-50"}
                                            value={pesi.pesoGalliAtteso}
                                            onChange={e => updatePesi("pesoGalliAtteso", e.target.value)}
                                            type="number"
                                            placeholder="grammi"
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* -- Note -- */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className={sectionTitle}>Note</div>
                    <div className="p-4">
                        <textarea
                            className="w-full h-28 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all resize-none"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Osservazioni generali sulla settimana..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
