import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface Trattamento {
    id: number;
    lotto_id: number;
    nome: string;
    data_inizio: string;
    data_fine: string;
    note: string;
}

interface TreatmentsCalendarProps {
    lottoId: number;
}

const PILL_COLORS = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500',
    'bg-amber-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
    'bg-orange-500', 'bg-cyan-500', 'bg-violet-500', 'bg-lime-500',
];

function colorForId(id: number): string {
    return PILL_COLORS[id % PILL_COLORS.length];
}

function isoToYMD(iso: string): { y: number; m: number; d: number } {
    const [y, m, d] = iso.split('-').map(Number);
    return { y, m, d };
}

function dateInRange(date: Date, inizio: string, fine: string): boolean {
    const d = date.getTime();
    const start = new Date(inizio + 'T00:00:00').getTime();
    const end = new Date(fine + 'T00:00:00').getTime();
    return d >= start && d <= end;
}

export function TreatmentsCalendar({ lottoId }: TreatmentsCalendarProps) {
    const [trattamenti, setTrattamenti] = useState<Trattamento[]>([]);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth()); // 0-indexed
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ nome: '', data_inizio: '', data_fine: '', note: '' });
    const [loading, setLoading] = useState(false);

    const load = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/trattamenti?lotto_id=${lottoId}`);
            const data = await res.json();
            setTrattamenti(data);
        } catch { /* ignore */ }
    };

    useEffect(() => { load(); }, [lottoId]);

    const prevMonth = () => {
        if (month === 0) { setMonth(11); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (month === 11) { setMonth(0); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    };

    // Build calendar grid
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay + 6) % 7; // Make Monday = 0

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

    const treatmentsForDay = (date: Date) =>
        trattamenti.filter(t => dateInRange(date, t.data_inizio, t.data_fine));

    const handleDelete = async (id: number) => {
        if (!confirm('Eliminare questo trattamento?')) return;
        await fetch(`${API_BASE_URL}/api/trattamenti/${id}`, { method: 'DELETE' });
        load();
    };

    const handleCreate = async () => {
        if (!form.nome || !form.data_inizio || !form.data_fine) return;
        const startYear = parseInt(form.data_inizio.split('-')[0]);
        const endYear = parseInt(form.data_fine.split('-')[0]);
        if (startYear < 2000 || endYear < 2000) {
            alert('Anno non valido nelle date. Assicurati di inserire l\'anno completo (es. 2026-04-15).');
            return;
        }
        setLoading(true);
        try {
            await fetch(`${API_BASE_URL}/api/trattamenti`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lotto_id: lottoId, ...form }),
            });
            setForm({ nome: '', data_inizio: '', data_fine: '', note: '' });
            setShowForm(false);
            load();
        } finally { setLoading(false); }
    };

    const selectedDayTreatments = selectedDay ? treatmentsForDay(selectedDay) : [];
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

    return (
        <div className="space-y-4">
            {/* Calendar header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-semibold text-gray-700 min-w-[140px] text-center">
                        {monthNames[month]} {year}
                    </span>
                    <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
                <Button size="sm" onClick={() => setShowForm(v => !v)} className="gap-1">
                    <Plus className="w-3 h-3" />
                    Aggiungi
                </Button>
            </div>

            {/* Add form */}
            {showForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="text-xs text-gray-500 block mb-1">Nome trattamento</label>
                            <input
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                value={form.nome}
                                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                                placeholder="es. METAFISIOL"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Data inizio</label>
                            <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                value={form.data_inizio}
                                onChange={e => setForm(f => ({ ...f, data_inizio: e.target.value, data_fine: f.data_fine || e.target.value }))} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Data fine</label>
                            <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                value={form.data_fine}
                                onChange={e => setForm(f => ({ ...f, data_fine: e.target.value }))} />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-gray-500 block mb-1">Note</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                value={form.note}
                                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                                placeholder="Facoltativo" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleCreate} disabled={loading}>Salva</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Annulla</Button>
                    </div>
                </div>
            )}

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden text-sm">
                {dayNames.map(d => (
                    <div key={d} className="bg-gray-100 text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
                ))}
                {cells.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} className="bg-white h-20" />;
                    const treats = treatmentsForDay(date);
                    const isSelected = selectedDay?.toDateString() === date.toDateString();
                    const isToday = new Date().toDateString() === date.toDateString();
                    return (
                        <div
                            key={date.toISOString()}
                            className={`bg-white p-1 h-24 cursor-pointer hover:bg-blue-50 transition-colors overflow-hidden
                                ${isSelected ? 'ring-2 ring-inset ring-blue-400' : ''}
                                ${isToday ? 'bg-yellow-50' : ''}`}
                            onClick={() => setSelectedDay(isSelected ? null : date)}
                        >
                            <div className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full
                                ${isToday ? 'bg-blue-500 text-white' : 'text-gray-700'}`}>
                                {date.getDate()}
                            </div>
                            <div className="space-y-0.5">
                                {treats.slice(0, 2).map(t => (
                                    <div key={t.id} className={`${colorForId(t.id)} text-white text-[9px] px-1 rounded truncate`}>
                                        {t.nome}
                                    </div>
                                ))}
                                {treats.length > 2 && (
                                    <div className="text-[9px] text-gray-400 font-medium">+{treats.length - 2} altri</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Day detail panel */}
            {selectedDay && (
                <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
                    <h6 className="text-sm font-semibold text-gray-700">
                        {selectedDay.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </h6>
                    {selectedDayTreatments.length === 0 ? (
                        <p className="text-xs text-gray-400">Nessun trattamento in questa data</p>
                    ) : (
                        <div className="space-y-2">
                            {selectedDayTreatments.map(t => (
                                <div key={t.id} className="flex items-start justify-between gap-2 p-2 bg-gray-50 rounded-lg">
                                    <div>
                                        <div className="text-sm font-medium text-gray-800">{t.nome}</div>
                                        <div className="text-xs text-gray-500">
                                            {t.data_inizio === t.data_fine
                                                ? `${t.data_inizio}`
                                                : `${t.data_inizio} → ${t.data_fine}`}
                                        </div>
                                        {t.note && <div className="text-xs text-gray-400 mt-0.5">{t.note}</div>}
                                    </div>
                                    <button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-600 shrink-0 mt-0.5">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* All treatments list */}
            {trattamenti.length > 0 && (
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Tutti i trattamenti ({trattamenti.length})
                    </p>
                    {trattamenti.map(t => (
                        <div key={t.id} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg text-xs">
                            <span className={`${colorForId(t.id)} text-white px-2 py-0.5 rounded font-medium shrink-0`}>{t.nome}</span>
                            <span className="text-gray-500 flex-1">
                                {t.data_inizio === t.data_fine ? t.data_inizio : `${t.data_inizio} → ${t.data_fine}`}
                            </span>
                            {t.note && <span className="text-gray-400 truncate max-w-[120px]">{t.note}</span>}
                            <button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-600 shrink-0">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
