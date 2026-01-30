import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ProductionChartProps {
    data: any[];
    productFilter: string;
    includeTradingData?: boolean; // Whether to show trading data
    showPurchasesLine?: boolean; // Whether to show purchases line in magenta
}

// Product base colors - OFFICIAL COLORS
// See SVILUPPO/RULES.md for the complete color reference table
// Source of truth: frontend/tailwind.config.js (lines 44-64)
const PRODUCT_LINE_COLORS = {
    'Granpollo': '#22c55e',     // green-500
    'Pollo70': '#3b82f6',       // blue-500
    'Color Yeald': '#ef4444',   // red-500
    'Ross': '#f97316',          // orange-500
};

const PURCHASES_LINE_COLOR = '#FF00FF'; // Magenta for purchases

// Generate color shades for sheds (lighter to darker)
const generateShades = (baseColor: string, count: number): string[] => {
    // Extract RGB from hex
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);

    const shades: string[] = [];
    for (let i = 0; i < count; i++) {
        // Create lighter to darker shades by adjusting brightness
        const factor = 1 - (i * 0.2); // 0.8, 0.6, 0.4, 0.2...
        const newR = Math.max(0, Math.min(255, Math.floor(r + (255 - r) * (1 - factor))));
        const newG = Math.max(0, Math.min(255, Math.floor(g + (255 - g) * (1 - factor))));
        const newB = Math.max(0, Math.min(255, Math.floor(b + (255 - b) * (1 - factor))));

        shades.push(`#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`);
    }

    return shades;
};

const CustomTooltip = ({ active, payload, label, productFilter }: any) => {
    if (!active || !payload || !payload.length) return null;

    // Calculate total for single product view
    const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
    const isSingleProduct = productFilter !== 'all';

    return (
        <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg max-w-xs">
            <p className="font-bold text-gray-800 mb-2">{label}</p>
            {payload
                .filter((entry: any) => entry.value > 0)
                .map((entry: any, index: number) => {
                    const age = isSingleProduct ? entry.payload[`${entry.dataKey}_age`] : null;
                    return (
                        <p key={index} style={{ color: entry.color }} className="text-sm">
                            {entry.name} {age ? `(Età: ${age})` : ''}: {entry.value.toLocaleString('it-IT')}
                        </p>
                    );
                })}
            {isSingleProduct && (
                <p className="font-bold text-gray-900 mt-2 pt-2 border-t border-gray-200">
                    Totale: {total.toLocaleString('it-IT')}
                </p>
            )}
        </div>
    );
};

export default function ProductionChart({ data, productFilter, includeTradingData: _includeTradingData = true, showPurchasesLine = true }: ProductionChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-center h-[400px]">
                <p className="text-gray-500">Nessun dato disponibile</p>
            </div>
        );
    }

    // Determine what lines to show
    let lines: { key: string; name: string; color: string }[] = [];

    if (productFilter === 'all') {
        // Show 4 product lines (totals)
        const products = ['Granpollo', 'Pollo70', 'Color Yeald', 'Ross'];
        lines = products.map(product => ({
            key: product,
            name: product,
            color: PRODUCT_LINE_COLORS[product as keyof typeof PRODUCT_LINE_COLORS]
        }));
    } else {
        // Show shed lines for the selected product
        // Get all shed keys from data for this product
        const shedKeys = new Set<string>();
        data.forEach(week => {
            Object.keys(week).forEach(key => {
                if (key !== 'periodo' && key.startsWith(productFilter + '_') && !key.endsWith('_age')) {
                    shedKeys.add(key);
                }
            });
        });

        const shedArray = Array.from(shedKeys).sort();
        const baseColor = PRODUCT_LINE_COLORS[productFilter as keyof typeof PRODUCT_LINE_COLORS];
        const shades = generateShades(baseColor, Math.max(shedArray.length, 1));

        lines = shedArray.map((shedKey, index) => ({
            key: shedKey,
            name: shedKey.replace(`${productFilter}_`, ''), // Remove product prefix for display
            color: shades[index] || baseColor
        }));
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-xs text-gray-400 mb-2">G001</p>
            <ResponsiveContainer width="100%" height={400}>
                {productFilter === 'all' ? (
                    // LineChart for all products (totals)
                    <LineChart
                        data={data}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey="periodo"
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            stroke="#9ca3af"
                        />
                        <YAxis
                            tickFormatter={(value) => value.toLocaleString('it-IT')}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            stroke="#9ca3af"
                        />
                        <Tooltip
                            content={(props) => <CustomTooltip {...props} productFilter={productFilter} />}
                            cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '5 5' }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="line"
                        />

                        {lines.map((line) => (
                            <Line
                                key={line.key}
                                type="monotone"
                                dataKey={line.key}
                                stroke={line.color}
                                strokeWidth={2}
                                dot={{ r: 4, strokeWidth: 2 }}
                                activeDot={{ r: 6, strokeWidth: 2 }}
                                name={line.name}
                            />
                        ))}
                    </LineChart>
                ) : (
                    // AreaChart for single product (by shed) - stacked areas like Excel 2D area chart
                    <AreaChart
                        data={data}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey="periodo"
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            stroke="#9ca3af"
                        />
                        <YAxis
                            tickFormatter={(value) => value.toLocaleString('it-IT')}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            stroke="#9ca3af"
                        />
                        <Tooltip
                            content={(props) => <CustomTooltip {...props} productFilter={productFilter} />}
                            cursor={{ stroke: '#9ca3af', strokeWidth: 1 }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="rect"
                        />

                        {/* Magenta area at base - stacked at bottom (vertical Y axis) */}
                        {showPurchasesLine && productFilter !== 'all' && (
                            <Area
                                type="monotone"
                                dataKey={`acquisti_${productFilter}`}
                                stackId="1"
                                stroke={PURCHASES_LINE_COLOR}
                                fill={PURCHASES_LINE_COLOR}
                                fillOpacity={0.4}
                                strokeWidth={2}
                                name="Acquisti"
                            />
                        )}

                        {/* Production areas stacked on top of purchases */}
                        {lines.map((line) => (
                            <Area
                                key={line.key}
                                type="monotone"
                                dataKey={line.key}
                                stackId="1"
                                stroke={line.color}
                                fill={line.color}
                                fillOpacity={0.7}
                                name={line.name}
                            />
                        ))}
                    </AreaChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}
