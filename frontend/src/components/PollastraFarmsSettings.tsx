import { useEffect, useState } from "react";
import { Plus, Trash2, Home, ChevronDown, ChevronRight } from "lucide-react";
import { PollastraFarmsAPI, type PollastraFarm } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
    onChanged?: () => void; // notifica il parent quando la struttura cambia
}

export default function PollastraFarmsSettings({ onChanged }: Props) {
    const [farms, setFarms] = useState<PollastraFarm[]>([]);
    const [loading, setLoading] = useState(true);
    const [newNome, setNewNome] = useState("");
    const [newCap, setNewCap] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await PollastraFarmsAPI.getAll();
            setFarms(data.farms);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const refresh = async () => { await load(); onChanged?.(); };

    const handleRename = async (farm: PollastraFarm, nome: string) => {
        const trimmed = nome.trim();
        if (!trimmed || trimmed === farm.nome) return;
        try {
            await PollastraFarmsAPI.update(farm.id, { nome: trimmed });
            await refresh();
        } catch (e: any) {
            setError(e?.response?.data?.detail || "Errore nel rinominare l'allevamento");
            await load();
        }
    };

    const handleCapannoni = async (farm: PollastraFarm, n: number) => {
        const val = Math.max(1, Math.round(n || 1));
        if (val === farm.n_capannoni) return;
        await PollastraFarmsAPI.update(farm.id, { n_capannoni: val });
        await refresh();
    };

    const handleDelete = async (farm: PollastraFarm) => {
        if (!confirm(`Eliminare l'allevamento "${farm.nome}"?`)) return;
        await PollastraFarmsAPI.remove(farm.id);
        await refresh();
    };

    const handleAdd = async () => {
        const nome = newNome.trim();
        if (!nome) { setError("Inserisci il nome dell'allevamento"); return; }
        try {
            await PollastraFarmsAPI.add(nome, Math.max(1, Math.round(newCap || 1)));
            setNewNome(""); setNewCap(1); setError(null);
            await refresh();
        } catch (e: any) {
            setError(e?.response?.data?.detail || "Errore nell'aggiunta dell'allevamento");
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-2 px-6 py-4 text-left hover:bg-gray-50 rounded-xl transition-colors"
            >
                <Home className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">Impostazioni Allevamenti</h3>
                    {!open && (
                        <p className="text-sm text-gray-500">
                            {farms.length} {farms.length === 1 ? "allevamento" : "allevamenti"} · clicca per gestire nomi e capannoni
                        </p>
                    )}
                </div>
                {open
                    ? <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                    : <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />}
            </button>

            {open && (
            <div className="px-6 pb-6">
            <p className="text-sm text-gray-500 mb-4">
                Aggiungi o togli allevamenti pollastra, modifica il nome o il numero di capannoni.
            </p>

            {loading ? (
                <div className="flex items-center justify-center h-24">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ maxWidth: 640 }}>
                        <thead>
                            <tr className="border-b border-gray-200 text-gray-500">
                                <th className="px-3 py-2 text-left font-medium">Allevamento</th>
                                <th className="px-3 py-2 text-center font-medium w-40">N° Capannoni</th>
                                <th className="px-3 py-2 text-center font-medium w-20"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {farms.map(farm => (
                                <tr key={farm.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-3 py-2">
                                        <Input
                                            defaultValue={farm.nome}
                                            onBlur={e => handleRename(farm, e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <Input
                                            type="number"
                                            min={1}
                                            className="w-24 mx-auto text-center"
                                            defaultValue={farm.n_capannoni}
                                            onBlur={e => handleCapannoni(farm, parseInt(e.target.value))}
                                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <button
                                            onClick={() => handleDelete(farm)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                                            title="Elimina allevamento"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {/* Riga aggiunta */}
                            <tr>
                                <td className="px-3 py-2">
                                    <Input
                                        value={newNome}
                                        placeholder="Nuovo allevamento..."
                                        onChange={e => { setNewNome(e.target.value); setError(null); }}
                                        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                                    />
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <Input
                                        type="number"
                                        min={1}
                                        className="w-24 mx-auto text-center"
                                        value={newCap}
                                        onChange={e => setNewCap(parseInt(e.target.value) || 1)}
                                    />
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <Button type="button" size="sm" onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {error && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <span>⚠️</span>
                    <span>{error}</span>
                </div>
            )}
            </div>
            )}
        </div>
    );
}
