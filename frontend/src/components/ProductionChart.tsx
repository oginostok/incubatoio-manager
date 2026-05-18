import { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CHART_SYNC_ID } from './EggsChart';

interface ProductionChartProps {
    data: any[];
    productFilter: string;
    includeTradingData?: boolean;
    showPurchasesLine?: boolean;
}

// Product base colors - OFFICIAL COLORS
// See SVILUPPO/RULES.md for the complete color reference table
// Source of truth: frontend/tailwind.config.js (lines 44-64)
const PRODUCT_LINE_COLORS = {
    'Granpollo': '#22c55e',
    'Pollo70': '#3b82f6',
    'Color Yeald': '#ef4444',
    'Ross': '#f97316',
};

const PURCHASES_LINE_COLOR = '#FF00FF';
const CHART_MARGIN = { top: 5, right: 30, left: 20, bottom: 5 };
const YAXIS_WIDTH = 80;

const generateShades = (baseColor: string, count: number): string[] => {
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);

    // Cap the lightest shade so it never blends fully into the white background.
    const MAX_WHITE_BLEND = 0.65;
    const denom = Math.max(count - 1, 1);

    const shades: string[] = [];
    for (let i = 0; i < count; i++) {
        const blend = count <= 1 ? 0 : (i / denom) * MAX_WHITE_BLEND;
        const newR = Math.floor(r + (255 - r) * blend);
        const newG = Math.floor(g + (255 - g) * blend);
        const newB = Math.floor(b + (255 - b) * blend);
        shades.push(`#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`);
    }
    return shades;
};

const CustomTooltip = ({ active, payload, label, productFilter, visibleKeys }: any) => {
    if (!active || !payload || !payload.length) return null;

    const visiblePayload = payload.filter((entry: any) => visibleKeys.has(entry.dataKey) && (entry.value || 0) > 0);
    const total = visiblePayload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
    const isSingleProduct = productFilter !== 'all';
    const showTotal = productFilter === 'all' && visiblePayload.length >= 2;

    return (
        <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg max-w-xs">
            <p className="font-bold text-gray-800 mb-2">{label}</p>
            {visiblePayload.map((entry: any, index: number) => {
                const age = isSingleProduct ? entry.payload[`${entry.dataKey}_age`] : null;
                return (
                    <p key={index} style={{ color: entry.color }} className="text-sm">
                        {entry.name} {age ? `(Età: ${age})` : ''}: {(entry.value || 0).toLocaleString('it-IT')}
                    </p>
                );
            })}
            {isSingleProduct && (
                <p className="font-bold text-gray-900 mt-2 pt-2 border-t border-gray-200">
                    Totale: {total.toLocaleString('it-IT')}
                </p>
            )}
            {showTotal && (
                <p className="font-bold text-gray-900 mt-2 pt-2 border-t border-gray-200">
                    Totale: {total.toLocaleString('it-IT')}
                </p>
            )}
        </div>
    );
};

const CustomLegend = ({ lines, visibleKeys, onToggle, onToggleAll }: {
    lines: { key: string; name: string; color: string }[];
    visibleKeys: Set<string>;
    onToggle: (key: string) => void;
    onToggleAll: () => void;
}) => {
    const allVisible = lines.every(l => visibleKeys.has(l.key));
    return (
        <div className="flex flex-wrap items-center gap-3 pt-4 justify-center">
            {lines.map(line => {
                const isVisible = visibleKeys.has(line.key);
                return (
                    <button
                        key={line.key}
                        onClick={() => onToggle(line.key)}
                        className="flex items-center gap-1.5 text-sm transition-opacity"
                        style={{ opacity: isVisible ? 1 : 0.3 }}
                        title={isVisible ? 'Clicca per nascondere' : 'Clicca per mostrare'}
                    >
                        <span
                            style={{ background: line.color, width: 24, height: 3, display: 'inline-block', borderRadius: 2 }}
                        />
                        <span className="text-gray-700">{line.name}</span>
                    </button>
                );
            })}
            <button
                onClick={onToggleAll}
                className="text-xs text-gray-500 underline ml-2 hover:text-gray-800"
            >
                {allVisible ? 'Deseleziona tutti' : 'Seleziona tutti'}
            </button>
        </div>
    );
};

export default function ProductionChart({ data, productFilter, includeTradingData: _includeTradingData = true, showPurchasesLine = true }: ProductionChartProps) {
    // Determine lines based on current filter
    let lines: { key: string; name: string; color: string; fillOpacity?: number }[] = [];

    if (productFilter === 'all') {
        const products = ['Granpollo', 'Pollo70', 'Color Yeald', 'Ross'];
        lines = products.map(product => ({
            key: product,
            name: product,
            color: PRODUCT_LINE_COLORS[product as keyof typeof PRODUCT_LINE_COLORS]
        }));
    } else {
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
        const shedLines = shedArray.map((shedKey, index) => ({
            key: shedKey,
            name: shedKey.replace(`${productFilter}_`, ''),
            color: shades[index] || baseColor
        }));
        // Purchases band sits at the bottom of the stack — declared first so tooltip
        // and totals include it, and the legend lists it explicitly.
        lines = showPurchasesLine
            ? [{ key: `acquisti_${productFilter}`, name: 'Acquisti', color: PURCHASES_LINE_COLOR, fillOpacity: 0.4 }, ...shedLines]
            : shedLines;
    }

    const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => new Set(lines.map(l => l.key)));

    // Reset visible lines when filter changes
    useEffect(() => {
        setVisibleKeys(new Set(lines.map(l => l.key)));
    }, [productFilter]);

    const handleToggle = (key: string) => {
        setVisibleKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                if (next.size > 1) next.delete(key); // keep at least one visible
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const handleToggleAll = () => {
        const allVisible = lines.every(l => visibleKeys.has(l.key));
        if (allVisible) {
            // Keep only first line visible
            setVisibleKeys(new Set([lines[0]?.key].filter(Boolean)));
        } else {
            setVisibleKeys(new Set(lines.map(l => l.key)));
        }
    };

    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-center h-[400px]">
                <p className="text-gray-500">Nessun dato disponibile</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-xs text-gray-400 mb-2">G001</p>
            <ResponsiveContainer width="100%" height={400}>
                {productFilter === 'all' ? (
                    <LineChart
                        data={data}
                        margin={CHART_MARGIN}
                        syncId={CHART_SYNC_ID}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey="periodo"
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            stroke="#9ca3af"
                        />
                        <YAxis
                            width={YAXIS_WIDTH}
                            tickFormatter={(value) => value.toLocaleString('it-IT')}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            stroke="#9ca3af"
                        />
                        <Tooltip
                            content={(props) => <CustomTooltip {...props} productFilter={productFilter} visibleKeys={visibleKeys} />}
                            cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '5 5' }}
                        />
                        <Legend content={() => (
                            <CustomLegend lines={lines} visibleKeys={visibleKeys} onToggle={handleToggle} onToggleAll={handleToggleAll} />
                        )} />
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
                                hide={!visibleKeys.has(line.key)}
                            />
                        ))}
                    </LineChart>
                ) : (
                    <AreaChart
                        data={data}
                        margin={CHART_MARGIN}
                        syncId={CHART_SYNC_ID}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey="periodo"
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            stroke="#9ca3af"
                        />
                        <YAxis
                            width={YAXIS_WIDTH}
                            tickFormatter={(value) => value.toLocaleString('it-IT')}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            stroke="#9ca3af"
                        />
                        <Tooltip
                            content={(props) => <CustomTooltip {...props} productFilter={productFilter} visibleKeys={visibleKeys} />}
                            cursor={{ stroke: '#9ca3af', strokeWidth: 1 }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="rect"
                        />
                        {lines.map((line) => (
                            <Area
                                key={line.key}
                                type="linear"
                                dataKey={line.key}
                                stackId="1"
                                stroke={line.color}
                                fill={line.color}
                                fillOpacity={line.fillOpacity ?? 0.7}
                                name={line.name}
                            />
                        ))}
                    </AreaChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}
