import { useEffect, useState, useMemo } from "react";
import { GiNestEggs } from "react-icons/gi";
import { ProductionAPI, ProductionTablesAPI } from "@/lib/api";
import { AllevamentiAPI } from "@/lib/api";
import type { WeeklySummary, Lotto } from "@/types";
import ProductionChart from "@/components/ProductionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import TradingTable from "@/components/TradingTable";
import { WeeklySummaryTable } from "@/components/WeeklySummaryTable";
import { API_BASE_URL } from "@/lib/config";
import ResponsiveSidebar from "@/components/ResponsiveSidebar";

interface ProductionPageProps {
    onNavigate: (page: string) => void;
}

type Section = "produzioni_totali" | "acquisti_vendite" | "tabelle_produzioni";

export default function ProductionPage({ onNavigate }: ProductionPageProps) {
    const [section, setSection] = useState<Section>("produzioni_totali");
    const [data, setData] = useState<WeeklySummary[]>([]);
    const [productionTablesData, setProductionTablesData] = useState<any[]>([]);
    const [productionTablesColumns, setProductionTablesColumns] = useState<string[]>([]);
    const [lotti, setLotti] = useState<Lotto[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartProductFilter, setChartProductFilter] = useState<string>("all");
    const [startPeriod, setStartPeriod] = useState<string>("");
    const [endPeriod, setEndPeriod] = useState<string>(`${new Date().getFullYear()} - 52`);
    const [includeTradingData, setIncludeTradingData] = useState<boolean>(true); // Checkbox for trading data
    const [tradingDataAcquisti, setTradingDataAcquisti] = useState<any>(null); // Trading purchases data
    const [tradingDataVendite, setTradingDataVendite] = useState<any>(null); // Trading sales data
    const [productData, setProductData] = useState<WeeklySummary[]>([]); // Product-specific data for table

    // Editing states for Tabelle Produzioni
    const [editingCell, setEditingCell] = useState<{ row: number, col: string } | null>(null);
    const [cellStatus, setCellStatus] = useState<Record<string, 'saving' | 'success' | 'error'>>({});
    const [editValue, setEditValue] = useState<string>('');

    // Get current week
    const getCurrentWeek = () => {
        const now = new Date();
        const onejan = new Date(now.getFullYear(), 0, 1);
        const week = Math.ceil((((now.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
        return { year: now.getFullYear(), week };
    };

    // Generate available weeks based on lotti end dates
    const availableWeeks = useMemo((): string[] => {
        const currentWeek = getCurrentWeek();
        const currentYear = currentWeek.year;

        // Find the latest end date from lotti
        let maxYear = currentYear;
        let maxWeek = 52;

        lotti.forEach(lotto => {
            if (lotto.Data_Fine_Prevista) {
                const parts = lotto.Data_Fine_Prevista.split('/');
                if (parts.length === 2) {
                    const lottoYear = parseInt(parts[0]);
                    const lottoWeek = parseInt(parts[1]);
                    if (lottoYear > maxYear || (lottoYear === maxYear && lottoWeek > maxWeek)) {
                        maxYear = lottoYear;
                        maxWeek = lottoWeek;
                    }
                }
            }
        });

        // Generate all weeks from current week to max week
        const weeks: string[] = [];
        let y = currentWeek.year;
        let w = currentWeek.week;

        while (y < maxYear || (y === maxYear && w <= maxWeek)) {
            if (w !== 53) { // Skip week 53
                weeks.push(`${y} - ${String(w).padStart(2, '0')}`);
            }
            w++;
            if (w > 52) {
                w = 1;
                y++;
            }
        }

        return weeks;
    }, [lotti]);

    // Get last available week
    const lastAvailableWeek = useMemo(() => {
        return availableWeeks.length > 0 ? availableWeeks[availableWeeks.length - 1] : "";
    }, [availableWeeks]);

    // Initialize periods when data is loaded
    useEffect(() => {
        if (availableWeeks.length > 0 && !startPeriod) {
            const currentWeek = getCurrentWeek();
            const defaultStart = `${currentWeek.year} - ${String(currentWeek.week).padStart(2, '0')}`;
            setStartPeriod(defaultStart);
        }
    }, [availableWeeks, startPeriod]);

    // Get effective end period (resolve "tutto" to actual week)
    const effectiveEndPeriod = useMemo(() => {
        return endPeriod === "tutto" ? lastAvailableWeek : endPeriod;
    }, [endPeriod, lastAvailableWeek]);

    // Refresh all data - can be called after modifications to update charts
    const refreshAllData = async () => {
        try {
            const [result, lottiData, tablesResult, tradingAcquisti, tradingVendite] = await Promise.all([
                ProductionAPI.getWeeklySummary(),
                AllevamentiAPI.getLotti(),
                ProductionTablesAPI.getProductionTables(),
                fetch(`${API_BASE_URL}/api/trading/data/acquisto`).then(r => r.json()),
                fetch(`${API_BASE_URL}/api/trading/data/vendita`).then(r => r.json())
            ]);
            setData(result);
            setLotti(lottiData);
            setProductionTablesData(tablesResult.data || []);
            setProductionTablesColumns(tablesResult.columns || []);
            setTradingDataAcquisti(tradingAcquisti);
            setTradingDataVendite(tradingVendite);
        } catch (error) {
            console.error("Failed to fetch production data", error);
        }
    };

    // Initial data load
    useEffect(() => {
        const initialLoad = async () => {
            setLoading(true);
            await refreshAllData();
            setLoading(false);
        };
        initialLoad();
    }, []);

    // Create allevamento -> product map
    const allevamentoProductMap = useMemo(() => {
        const map = new Map<string, string>();
        lotti.forEach(lotto => {
            const key = `${lotto.Allevamento} ${lotto.Capannone}`;
            map.set(key, lotto.Prodotto);
        });
        return map;
    }, [lotti]);

    // Fetch product-specific data when a product is selected
    useEffect(() => {
        if (chartProductFilter !== 'all') {
            const fetchProductData = async () => {
                try {
                    const result = await fetch(`${API_BASE_URL}/api/production/summary?product=${encodeURIComponent(chartProductFilter)}`);
                    const json = await result.json();
                    setProductData(json);
                } catch (error) {
                    console.error("Failed to fetch product data", error);
                    setProductData([]);
                }
            };
            fetchProductData();
        } else {
            setProductData([]);
        }
    }, [chartProductFilter]);

    // Transform data for chart - group by product or by shed
    const chartData = useMemo((): any[] => {
        if (chartProductFilter === 'all') {
            // Group by week and product (totals)
            const weeklyByProduct = new Map<string, Record<string, number>>();

            data.forEach(week => {
                // Filter out week 53
                if (week.settimana === 53) return;

                const periodo = `${week.anno} - ${String(week.settimana).padStart(2, '0')}`;

                // Apply period filter
                if (startPeriod && periodo < startPeriod) return;
                if (effectiveEndPeriod && periodo > effectiveEndPeriod) return;

                if (!weeklyByProduct.has(periodo)) {
                    weeklyByProduct.set(periodo, {
                        'Granpollo': 0,
                        'Pollo70': 0,
                        'Color Yeald': 0,
                        'Ross': 0
                    });
                }

                const weekData = weeklyByProduct.get(periodo)!;

                // Sum production by product
                week.dettagli_produzione.forEach(detail => {
                    const product = allevamentoProductMap.get(detail.allevamento);
                    if (product && product in weekData) {
                        weekData[product] += detail.quantita;
                    }
                });
            });

            // Add trading data by product when checkbox is enabled
            if (includeTradingData) {
                // ADD PURCHASES: Simple sum per product
                if (tradingDataAcquisti && tradingDataAcquisti.data) {
                    tradingDataAcquisti.data.forEach((row: any) => {
                        const periodo = row.Periodo;
                        if (!weeklyByProduct.has(periodo)) return;

                        const weekData = weeklyByProduct.get(periodo)!;

                        // Add purchases by product from columns like "Amadori_Granpollo"
                        tradingDataAcquisti.columns.forEach((col: string) => {
                            if (col === 'Periodo') return;
                            const parts = col.split('_');
                            if (parts.length >= 2) {
                                const prodotto = parts.slice(1).join('_'); // Handle "Color Yeald"
                                if (prodotto in weekData) {
                                    weekData[prodotto] += row[col] || 0;
                                }
                            }
                        });
                    });
                }

                // SUBTRACT SALES: Simple subtraction per product
                if (tradingDataVendite && tradingDataVendite.data) {
                    tradingDataVendite.data.forEach((row: any) => {
                        const periodo = row.Periodo;
                        if (!weeklyByProduct.has(periodo)) return;

                        const weekData = weeklyByProduct.get(periodo)!;

                        // Subtract sales by product from columns like "Amadori_Granpollo"
                        tradingDataVendite.columns.forEach((col: string) => {
                            if (col === 'Periodo') return;
                            const parts = col.split('_');
                            if (parts.length >= 2) {
                                const prodotto = parts.slice(1).join('_'); // Handle "Color Yeald"
                                if (prodotto in weekData) {
                                    weekData[prodotto] -= row[col] || 0;
                                    // Keep non-negative
                                    weekData[prodotto] = Math.max(0, weekData[prodotto]);
                                }
                            }
                        });
                    });
                }
            }

            // Convert to array and sort by periodo
            return Array.from(weeklyByProduct.entries())
                .map(([periodo, products]) => ({
                    periodo,
                    ...products
                }))
                .sort((a, b) => a.periodo.localeCompare(b.periodo));
        } else {
            // Group by week and shed for the selected product
            const weeklyByShed = new Map<string, Record<string, number>>();

            // First pass: collect all shed keys for this product
            const allShedKeys = new Set<string>();
            data.forEach(week => {
                week.dettagli_produzione.forEach(detail => {
                    const product = allevamentoProductMap.get(detail.allevamento);
                    if (product === chartProductFilter) {
                        allShedKeys.add(`${chartProductFilter}_${detail.allevamento}`);
                    }
                });
            });

            data.forEach(week => {
                // Filter out week 53
                if (week.settimana === 53) return;

                const periodo = `${week.anno} - ${String(week.settimana).padStart(2, '0')}`;

                // Apply period filter
                if (startPeriod && periodo < startPeriod) return;
                if (effectiveEndPeriod && periodo > effectiveEndPeriod) return;

                if (!weeklyByShed.has(periodo)) {
                    // Initialize all sheds with 0 to avoid white gaps
                    const initialData: Record<string, number> = {};
                    allShedKeys.forEach(shedKey => {
                        initialData[shedKey] = 0;
                        initialData[`${shedKey}_age`] = 0;
                    });
                    weeklyByShed.set(periodo, initialData);
                }

                const weekData = weeklyByShed.get(periodo)!;

                // Sum production by shed for this product
                week.dettagli_produzione.forEach(detail => {
                    const product = allevamentoProductMap.get(detail.allevamento);
                    if (product === chartProductFilter) {
                        // Use product_shedname as key
                        const shedKey = `${chartProductFilter}_${detail.allevamento}`;
                        weekData[shedKey] = (weekData[shedKey] || 0) + detail.quantita;
                        // Add age info
                        weekData[`${shedKey}_age`] = detail.eta;
                    }
                });
            });

            // Add purchases data if available and includeTradingData is true
            if (includeTradingData && tradingDataAcquisti && tradingDataAcquisti.data) {
                tradingDataAcquisti.data.forEach((row: any) => {
                    const periodo = row.Periodo;
                    if (!weeklyByShed.has(periodo)) return;

                    const weekData = weeklyByShed.get(periodo)!;

                    // Aggregate purchases for this specific product
                    let totalPurchases = 0;
                    tradingDataAcquisti.columns.forEach((col: string) => {
                        if (col === 'Periodo') return;
                        const [, prodotto] = col.split('_');
                        if (prodotto === chartProductFilter) {
                            totalPurchases += row[col] || 0;
                        }
                    });

                    // Add purchases as separate field
                    weekData[`acquisti_${chartProductFilter}`] = totalPurchases;
                });
            }

            // Convert to array and sort by periodo
            return Array.from(weeklyByShed.entries())
                .map(([periodo, sheds]) => ({
                    periodo,
                    ...sheds
                }))
                .sort((a, b) => a.periodo.localeCompare(b.periodo));
        }
    }, [data, chartProductFilter, startPeriod, effectiveEndPeriod, allevamentoProductMap, includeTradingData, tradingDataAcquisti, tradingDataVendite]);
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
            {/* SIDEBAR */}
            <ResponsiveSidebar
                title="Produzione Uova"
                icon={<GiNestEggs className="w-8 h-8 text-yellow-600" />}
                onNavigateHome={() => onNavigate("home")}
                footerText={`${data.length} settimane registrate`}
            >
                <button
                    onClick={() => setSection("produzioni_totali")}
                    className={`w-full px-4 py-3 rounded-xl text-left transition-all ${section === "produzioni_totali"
                        ? "bg-yellow-100 text-yellow-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                >
                    Produzioni e Totali
                </button>
                <button
                    onClick={() => setSection("acquisti_vendite")}
                    className={`w-full px-4 py-3 rounded-xl text-left transition-all ${section === "acquisti_vendite"
                        ? "bg-yellow-100 text-yellow-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                >
                    Acquisti e Vendite
                </button>
                <button
                    onClick={() => setSection("tabelle_produzioni")}
                    className={`w-full px-4 py-3 rounded-xl text-left transition-all ${section === "tabelle_produzioni"
                        ? "bg-yellow-100 text-yellow-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                >
                    Tabelle Produzioni
                </button>
            </ResponsiveSidebar>

            {/* MAIN CONTENT */}
            <main className="flex-1 p-8 overflow-auto">
                {section === "produzioni_totali" && (
                    <div className="space-y-6">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Produzioni e Totali</h2>
                            <p className="text-gray-600">
                                Andamento settimanale della produzione di uova.
                            </p>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
                            </div>
                        ) : (
                            <>
                                {/* Chart Section */}
                                <div>
                                    {/* Filters Row */}
                                    <div className="flex flex-wrap items-end gap-6 mb-4">
                                        {/* Product Filter */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Seleziona Prodotto
                                            </label>
                                            <div className="w-[180px]">
                                                <Select value={chartProductFilter} onValueChange={setChartProductFilter}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleziona prodotto" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Tutti i Prodotti</SelectItem>
                                                        <SelectItem value="Granpollo">Granpollo</SelectItem>
                                                        <SelectItem value="Pollo70">Pollo70</SelectItem>
                                                        <SelectItem value="Color Yeald">Color Yeald</SelectItem>
                                                        <SelectItem value="Ross">Ross</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Period Filter */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Seleziona Periodo
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <div className="w-[140px]">
                                                    <Select value={startPeriod} onValueChange={setStartPeriod}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Da..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableWeeks.map(week => (
                                                                <SelectItem key={week} value={week}>{week}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <span className="text-gray-500">—</span>
                                                <div className="w-[140px]">
                                                    <Select value={endPeriod} onValueChange={setEndPeriod}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="A..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="tutto">Tutto</SelectItem>
                                                            {availableWeeks.map(week => (
                                                                <SelectItem key={week} value={week}>{week}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Trading Data Checkbox */}
                                        <div className="flex items-center gap-2 ml-4">
                                            <input
                                                type="checkbox"
                                                id="includeTradingData"
                                                checked={includeTradingData}
                                                onChange={(e) => setIncludeTradingData(e.target.checked)}
                                                className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 focus:ring-2 cursor-pointer"
                                            />
                                            <label htmlFor="includeTradingData" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                                                Acquisti / Vendite selezionati
                                            </label>
                                        </div>
                                    </div>

                                    <ProductionChart
                                        data={chartData}
                                        productFilter={chartProductFilter}
                                        includeTradingData={includeTradingData}
                                        showPurchasesLine={includeTradingData && chartProductFilter !== 'all'}
                                    />
                                </div>

                                {/* Summary Cards */}
                                <div className="grid gap-4 md:grid-cols-3">
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">
                                                Totale Netto (Periodo Sel.){chartProductFilter !== 'all' && ` - ${chartProductFilter}`}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {new Intl.NumberFormat('it-IT').format(
                                                    (chartProductFilter !== 'all' && productData.length > 0 ? productData : data)
                                                        .filter(week => {
                                                            if (week.settimana === 53) return false;
                                                            const periodo = `${week.anno} - ${String(week.settimana).padStart(2, '0')}`;
                                                            if (startPeriod && periodo < startPeriod) return false;
                                                            if (effectiveEndPeriod && periodo > effectiveEndPeriod) return false;
                                                            return true;
                                                        })
                                                        .reduce((acc, curr) => acc + curr.totale_netto, 0)
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Weekly Table - Only shown when a specific product is selected */}
                                {chartProductFilter !== 'all' && productData.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Riepilogo Settimanale - {chartProductFilter}</h3>
                                        <WeeklySummaryTable
                                            data={productData.filter(week => {
                                                if (week.settimana === 53) return false;
                                                const periodo = `${week.anno} - ${String(week.settimana).padStart(2, '0')}`;
                                                if (startPeriod && periodo < startPeriod) return false;
                                                if (effectiveEndPeriod && periodo > effectiveEndPeriod) return false;
                                                return true;
                                            })}
                                            includeTradingData={includeTradingData}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
                {section === "acquisti_vendite" && (
                    <div className="space-y-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Acquisti e Vendite</h2>

                        <div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-3">📥 Acquisti Uova</h3>
                            <TradingTable tipo="acquisto" onUpdate={refreshAllData} />
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-3">📤 Vendite Uova</h3>
                            <TradingTable tipo="vendita" onUpdate={refreshAllData} />
                        </div>
                    </div>
                )}
                {section === "tabelle_produzioni" && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Tabelle Produzioni</h2>
                        <p className="text-xs text-gray-400">T003</p>
                        <p className="text-gray-600 mb-6">
                            Curve di produzione per razza (percentuali settimana per settimana). Doppio-click per modificare.
                        </p>

                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
                            </div>
                        ) : (() => {
                            // Define column order and colors
                            const standardColumns = [
                                'JA57  STANDARD',
                                'JA57K  STANDARD',
                                'JA57KI  STANDARD',
                                'JA87  STANDARD',
                                'RANGER  STANDARD',
                                'GOLDEN  STANDARD',
                                'ROSS 308  STANDARD'
                            ];

                            // Available columns from data (excluding W)
                            const dataColumns = productionTablesColumns.filter(col => col !== 'W');

                            // Match standard columns that exist in data (flexible matching)
                            const orderedStandardCols: string[] = [];
                            standardColumns.forEach(targetCol => {
                                const found = dataColumns.find(col =>
                                    col.replace(/\s+/g, ' ').trim().toUpperCase() ===
                                    targetCol.replace(/\s+/g, ' ').trim().toUpperCase()
                                );
                                if (found) orderedStandardCols.push(found);
                            });

                            // Other columns (not in standard list)
                            const otherCols = dataColumns.filter(col => !orderedStandardCols.includes(col));

                            // Final column order: W, STANDARD, Others
                            const orderedColumns = ['W', ...orderedStandardCols, ...otherCols];

                            // Handle double click
                            const handleDoubleClick = (rowIdx: number, col: string, currentValue: any) => {
                                if (col === 'W') return; // W column is not editable
                                setEditingCell({ row: rowIdx, col });
                                // Set edit value without % sign
                                const strValue = String(currentValue || '');
                                const cleaned = strValue.replace('%', '').trim();
                                setEditValue(cleaned);
                            };

                            // Handle save
                            const handleSave = async (rowIdx: number, col: string) => {
                                const cellKey = `${rowIdx}-${col}`;
                                setCellStatus(prev => ({ ...prev, [cellKey]: 'saving' }));

                                try {
                                    const row = productionTablesData[rowIdx];
                                    const weekValue = parseFloat(String(row['W']));

                                    // Format value as percentage
                                    let formattedValue = editValue.trim();
                                    if (!formattedValue.endsWith('%')) {
                                        // Add % sign
                                        formattedValue = `${formattedValue}%`;
                                    }

                                    await ProductionTablesAPI.updateCell(weekValue, col, formattedValue);

                                    // Update local data
                                    const newData = [...productionTablesData];
                                    newData[rowIdx][col] = formattedValue;
                                    setProductionTablesData(newData);

                                    setCellStatus(prev => ({ ...prev, [cellKey]: 'success' }));

                                    // Refresh all data to update charts/tables
                                    await refreshAllData();

                                    setTimeout(() => {
                                        setCellStatus(prev => {
                                            const newStatus = { ...prev };
                                            delete newStatus[cellKey];
                                            return newStatus;
                                        });
                                    }, 1000);
                                } catch (error) {
                                    console.error('Error saving cell:', error);
                                    setCellStatus(prev => ({ ...prev, [cellKey]: 'error' }));
                                    setTimeout(() => {
                                        setCellStatus(prev => {
                                            const newStatus = { ...prev };
                                            delete newStatus[cellKey];
                                            return newStatus;
                                        });
                                    }, 2000);
                                }

                                setEditingCell(null);
                            };

                            // Handle key press
                            const handleKeyDown = (e: React.KeyboardEvent, rowIdx: number, col: string) => {
                                if (e.key === 'Enter') {
                                    handleSave(rowIdx, col);
                                } else if (e.key === 'Escape') {
                                    setEditingCell(null);
                                }
                            };

                            return (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
                                    <table className="w-full text-sm border-collapse table-fixed" style={{ minWidth: '1200px' }}>
                                        <thead>
                                            <tr className="border-b-2 border-gray-300">
                                                {orderedColumns.map((col, idx) => {
                                                    const isStandard = orderedStandardCols.includes(col);
                                                    const bgColor = idx === 0
                                                        ? 'bg-gray-200'
                                                        : isStandard
                                                            ? 'bg-yellow-100'
                                                            : 'bg-blue-100';

                                                    return (
                                                        <th
                                                            key={col}
                                                            className={`py-3 px-4 font-semibold text-gray-700 ${bgColor} ${idx === 0 ? 'text-left sticky left-0 z-10 w-20' : 'text-center'}`}
                                                        >
                                                            {col}
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productionTablesData.map((row, rowIdx) => (
                                                <tr key={rowIdx} className="border-b border-gray-100 hover:bg-gray-50">
                                                    {orderedColumns.map((col, colIdx) => {
                                                        const value = row[col];
                                                        const isWeekColumn = colIdx === 0;
                                                        const isStandard = orderedStandardCols.includes(col);
                                                        const cellKey = `${rowIdx}-${col}`;
                                                        const isEditing = editingCell?.row === rowIdx && editingCell?.col === col;
                                                        const status = cellStatus[cellKey];

                                                        // Background color for data cells
                                                        const bgColor = isWeekColumn
                                                            ? 'bg-gray-50'
                                                            : isStandard
                                                                ? 'bg-yellow-50'
                                                                : 'bg-blue-50';

                                                        // Format percentage values
                                                        let displayValue = value;
                                                        if (!isWeekColumn && value) {
                                                            const strValue = String(value);
                                                            if (!strValue.includes('%')) {
                                                                // Not yet formatted
                                                                const cleaned = strValue.replace(',', '.').trim();
                                                                if (cleaned && !isNaN(parseFloat(cleaned))) {
                                                                    displayValue = `${parseFloat(cleaned).toFixed(2)}%`;
                                                                }
                                                            } else {
                                                                // Already has %, ensure format
                                                                const cleaned = strValue.replace('%', '').replace(',', '.').trim();
                                                                if (cleaned && !isNaN(parseFloat(cleaned))) {
                                                                    displayValue = `${parseFloat(cleaned).toFixed(2)}%`;
                                                                }
                                                            }
                                                        }

                                                        return (
                                                            <td
                                                                key={col}
                                                                className={`py-3 px-4 ${bgColor} ${isWeekColumn ? 'font-semibold text-gray-900 sticky left-0 z-10' : 'text-center text-gray-700'} relative`}
                                                                onDoubleClick={() => handleDoubleClick(rowIdx, col, value)}
                                                            >
                                                                {isEditing ? (
                                                                    <input
                                                                        type="text"
                                                                        value={editValue}
                                                                        onChange={(e) => setEditValue(e.target.value)}
                                                                        onBlur={() => handleSave(rowIdx, col)}
                                                                        onKeyDown={(e) => handleKeyDown(e, rowIdx, col)}
                                                                        className="w-full px-2 py-1 border-2 border-blue-400 rounded focus:outline-none text-center"
                                                                        autoFocus
                                                                    />
                                                                ) : (
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <span>{displayValue || '-'}</span>
                                                                        {status === 'saving' && (
                                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                                        )}
                                                                        {status === 'success' && (
                                                                            <span className="text-green-600">✓</span>
                                                                        )}
                                                                        {status === 'error' && (
                                                                            <span className="text-red-600">✗</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </main>
        </div>
    );
}
