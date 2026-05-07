import { useState, useEffect } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ComposedChart,
    Line,
} from 'recharts';
import { API_BASE_URL } from '@/lib/config';

interface WeeklyData {
    eta_animali: number;
    galline_morte: number;
    galli_morti: number;
    uova_incubabili: number;
    uova_seconda: number;
}

interface FarmChartProps {
    data: WeeklyData[];
    capiPresenti: number;
}

export function FarmChart({ data, capiPresenti }: FarmChartProps) {
    const [standardColumns, setStandardColumns] = useState<string[]>([]);
    const [selectedStandard, setSelectedStandard] = useState<string>('');
    // Map from week number → percentage (0-100)
    const [standardTable, setStandardTable] = useState<Record<number, number>>({});

    // Fetch T003 standard columns once
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/production-tables`);
                const json = await res.json();
                const cols: string[] = (json.columns || []).filter((c: string) => c.includes('STANDARD'));
                setStandardColumns(cols);
            } catch { /* silently ignore */ }
        };
        load();
    }, []);

    // When standard selection changes, build lookup table
    useEffect(() => {
        if (!selectedStandard) {
            setStandardTable({});
            return;
        }
        const load = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/production-tables`);
                const json = await res.json();
                const lookup: Record<number, number> = {};
                (json.data || []).forEach((row: any) => {
                    const week = Number(row['W']);
                    const rawVal = row[selectedStandard];
                    if (rawVal != null) {
                        const pct = parseFloat(String(rawVal).replace('%', '').replace(',', '.').trim());
                        if (!isNaN(pct)) lookup[week] = pct;
                    }
                });
                setStandardTable(lookup);
            } catch { /* silently ignore */ }
        };
        load();
    }, [selectedStandard]);

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-500">Nessun dato sufficiente per il grafico</p>
            </div>
        );
    }

    const sortedData = [...data].sort((a, b) => a.eta_animali - b.eta_animali);

    const mortalityData = sortedData.map(row => ({
        eta_animali: row.eta_animali,
        mortalita_pct: capiPresenti > 0
            ? parseFloat(((row.galline_morte + row.galli_morti) / capiPresenti * 100).toFixed(3))
            : 0,
    }));

    const eggData = sortedData.map(row => ({
        eta_animali: row.eta_animali,
        uova_incubabili: row.uova_incubabili,
        uova_seconda: row.uova_seconda,
        uova_totali: row.uova_incubabili + row.uova_seconda,
        standard_atteso: selectedStandard && standardTable[row.eta_animali] != null
            ? Math.round(capiPresenti * standardTable[row.eta_animali] / 100)
            : undefined,
    }));

    return (
        <div className="space-y-6 mt-4 pt-4 border-t border-gray-200">
            {/* Mortality % chart */}
            <div>
                <h5 className="text-sm font-semibold text-gray-600 mb-1">Mortalità settimanale %</h5>
                <p className="text-xs text-gray-400 mb-3">(Galline + Galli morti) / Capi Presenti</p>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mortalityData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorMortalita" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.7} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis
                                dataKey="eta_animali"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                tickFormatter={(val) => `W${val}`}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                tickFormatter={(val) => `${val}%`}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                labelFormatter={(val) => `Età: ${val} Settimane`}
                                formatter={(value: unknown) => [`${parseFloat(String(value)).toFixed(3)}%`, 'Mortalità']}
                            />
                            <Area
                                type="monotone"
                                dataKey="mortalita_pct"
                                name="Mortalità %"
                                stroke="#ef4444"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorMortalita)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Egg production chart */}
            <div>
                <h5 className="text-sm font-semibold text-gray-600 mb-4">Produzione Uova</h5>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={eggData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorUovaInc" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorUovaSec" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis
                                dataKey="eta_animali"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                tickFormatter={(val) => `W${val}`}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                labelFormatter={(val) => `Età: ${val} Settimane`}
                                formatter={(value: unknown) => new Intl.NumberFormat('it-IT').format(Number(value) || 0)}
                            />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                            <Area
                                type="monotone"
                                dataKey="uova_incubabili"
                                name="Uova Incubabili"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorUovaInc)"
                            />
                            <Area
                                type="monotone"
                                dataKey="uova_seconda"
                                name="Uova Seconda"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorUovaSec)"
                            />
                            <Line
                                type="monotone"
                                dataKey="uova_totali"
                                name="Uova Totali"
                                stroke="#059669"
                                strokeWidth={2}
                                dot={false}
                                strokeDasharray="4 2"
                            />
                            {selectedStandard && (
                                <Line
                                    type="monotone"
                                    dataKey="standard_atteso"
                                    name={`Standard: ${selectedStandard}`}
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    dot={false}
                                    strokeDasharray="6 3"
                                    connectNulls={false}
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Standard curve dropdown */}
                {standardColumns.length > 0 && (
                    <div className="mt-3 flex items-center gap-3">
                        <label className="text-xs text-gray-500 shrink-0">Curva standard:</label>
                        <select
                            value={selectedStandard}
                            onChange={(e) => setSelectedStandard(e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
                        >
                            <option value="">— Nessuno —</option>
                            {standardColumns.map(col => (
                                <option key={col} value={col}>{col}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
}
