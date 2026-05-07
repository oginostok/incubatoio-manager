import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface Peso {
    id: number;
    lotto_id: number;
    settimana: number;
    anno: number;
    peso_medio_g: number;
    n_capi: number;
    note: string;
}

interface WeightsSectionProps {
    lottoId: number;
    annoStart: number;
    settStart: number;
}

export function WeightsSection({ lottoId, annoStart, settStart }: WeightsSectionProps) {
    const [pesi, setPesi] = useState<Peso[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ settimana: settStart, anno: annoStart, peso_medio_g: '', n_capi: '', note: '' });
    const [loading, setLoading] = useState(false);

    const load = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/pesi?lotto_id=${lottoId}`);
            const data = await res.json();
            setPesi(data);
        } catch { /* ignore */ }
    };

    useEffect(() => { load(); }, [lottoId]);

    const handleCreate = async () => {
        if (!form.peso_medio_g) return;
        setLoading(true);
        try {
            await fetch(`${API_BASE_URL}/api/pesi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lotto_id: lottoId,
                    settimana: Number(form.settimana),
                    anno: Number(form.anno),
                    peso_medio_g: parseFloat(form.peso_medio_g),
                    n_capi: Number(form.n_capi) || 0,
                    note: form.note,
                }),
            });
            setShowForm(false);
            load();
        } finally { setLoading(false); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Eliminare questa pesata?')) return;
        await fetch(`${API_BASE_URL}/api/pesi/${id}`, { method: 'DELETE' });
        load();
    };

    const chartData = pesi.map(p => ({
        label: `W${p.settimana}/${p.anno}`,
        peso: p.peso_medio_g,
        settimana: p.settimana,
    }));

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button size="sm" onClick={() => setShowForm(v => !v)} className="gap-1">
                    <Plus className="w-3 h-3" />
                    Aggiungi pesata
                </Button>
            </div>

            {showForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Anno</label>
                            <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                value={form.anno} onChange={e => setForm(f => ({ ...f, anno: e.target.value as any }))} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Settimana</label>
                            <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                value={form.settimana} onChange={e => setForm(f => ({ ...f, settimana: e.target.value as any }))} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Peso medio (g)</label>
                            <input type="number" step="0.1" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                value={form.peso_medio_g} onChange={e => setForm(f => ({ ...f, peso_medio_g: e.target.value }))}
                                placeholder="es. 2450.5" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">N° capi pesati</label>
                            <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                value={form.n_capi} onChange={e => setForm(f => ({ ...f, n_capi: e.target.value }))}
                                placeholder="Facoltativo" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-gray-500 block mb-1">Note</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                                placeholder="Facoltativo" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleCreate} disabled={loading}>Salva</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Annulla</Button>
                    </div>
                </div>
            )}

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
                                tickFormatter={(v) => `${v}g`} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(v: any) => [`${v}g`, 'Peso medio']}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Line type="monotone" dataKey="peso" name="Peso medio (g)" stroke="#6366f1"
                                strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Table */}
            {pesi.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Nessuna pesata registrata</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-200">
                                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500">Settimana</th>
                                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500">Anno</th>
                                <th className="py-2 px-3 text-right text-xs font-semibold text-gray-500">Peso medio (g)</th>
                                <th className="py-2 px-3 text-right text-xs font-semibold text-gray-500">N° capi</th>
                                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500">Note</th>
                                <th className="py-2 px-3 w-8" />
                            </tr>
                        </thead>
                        <tbody>
                            {pesi.map(p => (
                                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-2 px-3 font-medium">W{p.settimana}</td>
                                    <td className="py-2 px-3 text-gray-600">{p.anno}</td>
                                    <td className="py-2 px-3 text-right font-medium text-indigo-600">{p.peso_medio_g.toFixed(1)} g</td>
                                    <td className="py-2 px-3 text-right text-gray-600">{p.n_capi || '-'}</td>
                                    <td className="py-2 px-3 text-gray-400">{p.note || '-'}</td>
                                    <td className="py-2 px-3">
                                        <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
