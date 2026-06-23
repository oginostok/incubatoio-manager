import { useEffect, useMemo, useState } from "react";
import { NatoFertileAPI, type NatoFertileMatrix } from "@/lib/api";

type CellStatus = "saving" | "success" | "error";

const key = (a: string, t: string) => `${a}|||${t}`;

// Colore cella in base al valore (come heatmap della matrice)
function cellColor(v: number | undefined): string {
    if (v === undefined) return "bg-white";
    if (v >= 95) return "bg-green-100 text-green-800";
    if (v >= 92) return "bg-yellow-50 text-yellow-800";
    if (v >= 88) return "bg-orange-50 text-orange-800";
    return "bg-red-50 text-red-700";
}

export default function NatoFertileTable() {
    const [matrix, setMatrix] = useState<NatoFertileMatrix | null>(null);
    const [loading, setLoading] = useState(true);
    const [values, setValues] = useState<Record<string, number>>({});
    const [editing, setEditing] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [status, setStatus] = useState<Record<string, CellStatus>>({});

    const load = async () => {
        setLoading(true);
        try {
            const data = await NatoFertileAPI.getMatrix();
            setMatrix(data);
            const v: Record<string, number> = {};
            data.cells.forEach((c) => (v[key(c.allevamento, c.tipo)] = c.valore));
            setValues(v);
        } catch (e) {
            console.error("Errore caricamento nato/fertile", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const startEdit = (a: string, t: string) => {
        const k = key(a, t);
        setEditing(k);
        setEditValue(values[k] !== undefined ? String(values[k]).replace(".", ",") : "");
    };

    const save = async (a: string, t: string) => {
        const k = key(a, t);
        const raw = editValue.replace("%", "").replace(",", ".").trim();
        setEditing(null);

        // Nessuna modifica reale
        const current = values[k];
        const parsed = raw === "" ? null : parseFloat(raw);
        if (raw !== "" && isNaN(parsed as number)) return;
        if ((parsed === null && current === undefined) || parsed === current) return;

        setStatus((s) => ({ ...s, [k]: "saving" }));
        try {
            await NatoFertileAPI.updateCell(a, t, parsed);
            setValues((v) => {
                const nv = { ...v };
                if (parsed === null) delete nv[k];
                else nv[k] = parsed;
                return nv;
            });
            setStatus((s) => ({ ...s, [k]: "success" }));
            setTimeout(() => setStatus((s) => { const ns = { ...s }; delete ns[k]; return ns; }), 1000);
        } catch (e) {
            console.error(e);
            setStatus((s) => ({ ...s, [k]: "error" }));
            setTimeout(() => setStatus((s) => { const ns = { ...s }; delete ns[k]; return ns; }), 2000);
        }
    };

    // Medie riga / colonna calcolate live
    const rowAvg = useMemo(() => {
        const r: Record<string, number> = {};
        matrix?.allevamenti.forEach((a) => {
            const vals = matrix.tipi.map((t) => values[key(a, t)]).filter((x): x is number => x !== undefined);
            if (vals.length) r[a] = vals.reduce((s, x) => s + x, 0) / vals.length;
        });
        return r;
    }, [matrix, values]);

    const colAvg = useMemo(() => {
        const c: Record<string, number> = {};
        matrix?.tipi.forEach((t) => {
            const vals = matrix.allevamenti.map((a) => values[key(a, t)]).filter((x): x is number => x !== undefined);
            if (vals.length) c[t] = vals.reduce((s, x) => s + x, 0) / vals.length;
        });
        return c;
    }, [matrix, values]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            </div>
        );
    }
    if (!matrix) return <p className="text-gray-500">Nessun dato disponibile.</p>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
            <table className="text-sm border-collapse" style={{ minWidth: "1100px" }}>
                <thead>
                    <tr className="border-b-2 border-gray-300">
                        <th className="py-3 px-4 font-semibold text-gray-700 bg-gray-200 text-left sticky left-0 z-10 w-44">
                            ALLEVAMENTO \ TIPO
                        </th>
                        {matrix.tipi.map((t) => (
                            <th key={t} className="py-3 px-2 font-semibold text-gray-700 bg-amber-100 text-center align-bottom whitespace-nowrap">
                                <div className="[writing-mode:vertical-rl] rotate-180 mx-auto" style={{ maxHeight: "120px" }}>{t}</div>
                            </th>
                        ))}
                        <th className="py-3 px-3 font-semibold text-gray-700 bg-amber-200 text-center">MEDIA</th>
                    </tr>
                </thead>
                <tbody>
                    {matrix.allevamenti.map((a) => (
                        <tr key={a} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-4 font-semibold text-gray-900 bg-gray-50 sticky left-0 z-10">{a}</td>
                            {matrix.tipi.map((t) => {
                                const k = key(a, t);
                                const v = values[k];
                                const st = status[k];
                                const isEditing = editing === k;
                                return (
                                    <td
                                        key={t}
                                        className={`py-2 px-2 text-center relative cursor-pointer ${cellColor(v)}`}
                                        onDoubleClick={() => startEdit(a, t)}
                                        title="Doppio-click per modificare"
                                    >
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={() => save(a, t)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") save(a, t);
                                                    else if (e.key === "Escape") setEditing(null);
                                                }}
                                                className="w-16 px-1 py-0.5 border-2 border-amber-400 rounded focus:outline-none text-center"
                                                autoFocus
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center gap-1">
                                                <span>{v !== undefined ? `${v.toFixed(1)}%` : "·"}</span>
                                                {st === "saving" && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-600"></div>}
                                                {st === "success" && <span className="text-green-600">✓</span>}
                                                {st === "error" && <span className="text-red-600">✗</span>}
                                            </div>
                                        )}
                                    </td>
                                );
                            })}
                            <td className="py-2 px-3 text-center font-bold text-gray-800 bg-amber-50">
                                {rowAvg[a] !== undefined ? `${rowAvg[a].toFixed(1)}%` : "-"}
                            </td>
                        </tr>
                    ))}
                    {/* Riga medie per tipo */}
                    <tr className="border-t-2 border-gray-300 bg-amber-50">
                        <td className="py-2 px-4 font-bold text-gray-800 bg-gray-100 sticky left-0 z-10">MEDIA TIPO</td>
                        {matrix.tipi.map((t) => (
                            <td key={t} className="py-2 px-2 text-center font-bold text-gray-800">
                                {colAvg[t] !== undefined ? `${colAvg[t].toFixed(1)}%` : "-"}
                            </td>
                        ))}
                        <td className="bg-amber-100"></td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
