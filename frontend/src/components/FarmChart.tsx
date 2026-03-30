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
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-500">Nessun dato sufficiente per il grafico</p>
            </div>
        );
    }

    const sortedData = [...data].sort((a, b) => a.eta_animali - b.eta_animali);

    // Mortality as percentage of total birds
    const mortalityData = sortedData.map(row => ({
        eta_animali: row.eta_animali,
        mortalita_pct: capiPresenti > 0
            ? parseFloat(((row.galline_morte + row.galli_morti) / capiPresenti * 100).toFixed(3))
            : 0,
    }));

    // Egg production with total line
    const eggData = sortedData.map(row => ({
        eta_animali: row.eta_animali,
        uova_incubabili: row.uova_incubabili,
        uova_seconda: row.uova_seconda,
        uova_totali: row.uova_incubabili + row.uova_seconda,
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
                                name="Totale Incubate"
                                stroke="#059669"
                                strokeWidth={2}
                                dot={false}
                                strokeDasharray="4 2"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
