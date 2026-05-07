import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const CHART_MARGIN = { top: 5, right: 30, left: 20, bottom: 5 };
const YAXIS_WIDTH = 80;
export const CHART_SYNC_ID = 'g-production-sync';

interface EggsChartProps {
    chartData: any[];
    postiUovoIncubatoio: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const value = payload[0]?.value ?? 0;
    return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
            <p className="font-bold text-gray-800 mb-1">{label}</p>
            <p style={{ color: '#ca8a04' }} className="text-sm">
                Totale uova: {(value as number).toLocaleString('it-IT')}
            </p>
        </div>
    );
};

export default function EggsChart({ chartData, postiUovoIncubatoio }: EggsChartProps) {
    const totalData = chartData.map(week => {
        const totale = Object.entries(week)
            .filter(([key]) => key !== 'periodo' && !key.endsWith('_age'))
            .reduce((sum, [, val]) => sum + (Number(val) || 0), 0);
        return { periodo: week.periodo, totale };
    });

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-xs text-gray-400 mb-2">G002</p>
            <ResponsiveContainer width="100%" height={220}>
                <LineChart data={totalData} margin={CHART_MARGIN} syncId={CHART_SYNC_ID}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        dataKey="periodo"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        stroke="#9ca3af"
                    />
                    <YAxis
                        width={YAXIS_WIDTH}
                        domain={[150000, 450000]}
                        tickFormatter={(v) => v.toLocaleString('it-IT')}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        stroke="#9ca3af"
                    />
                    <Tooltip
                        content={(props) => <CustomTooltip {...props} />}
                        cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '5 5' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="totale"
                        stroke="#ca8a04"
                        strokeWidth={2}
                        dot={{ r: 3, strokeWidth: 2, fill: '#ca8a04' }}
                        activeDot={{ r: 5, strokeWidth: 2 }}
                        name="Totale uova"
                    />
                    <ReferenceLine
                        y={postiUovoIncubatoio}
                        stroke="#9ca3af"
                        strokeDasharray="6 3"
                        strokeWidth={1.5}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
