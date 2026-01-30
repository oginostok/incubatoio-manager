import { useEffect, useState } from "react";
import { TradingAPI } from "@/lib/api";
import type { TradingDataRow } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Trash2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getProductPastelBg, getProductBrightBg } from "@/lib/productColors";

interface TradingTableProps {
    tipo: 'acquisto' | 'vendita';
    onUpdate?: () => void;  // Callback to refresh parent data after changes
}

export default function TradingTable({ tipo, onUpdate }: TradingTableProps) {
    const [loading, setLoading] = useState(true);
    const [columns, setColumns] = useState<string[]>([]);
    const [data, setData] = useState<TradingDataRow[]>([]);


    // Editing state
    const [editingCell, setEditingCell] = useState<{ row: number, col: string } | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [cellStatus, setCellStatus] = useState<Record<string, 'saving' | 'success' | 'error'>>({});

    // Management state
    const [isManaging, setIsManaging] = useState(false);
    const [showNewDialog, setShowNewDialog] = useState(false);
    const [newAzienda, setNewAzienda] = useState('');
    const [newProdotto, setNewProdotto] = useState('');

    // Product colors (using official colors)

    // Format number with thousands separator
    const formatNumber = (value: number | string): string => {
        const num = typeof value === 'string' ? parseInt(value) || 0 : value;
        return num.toLocaleString('it-IT');
    };

    // Load data
    useEffect(() => {
        fetchData();
    }, [tipo]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const tableData = await TradingAPI.getData(tipo);

            setColumns(tableData.columns);
            setData(tableData.data);
        } catch (error) {
            console.error('Error fetching trading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Handle double click to edit
    const handleDoubleClick = (rowIdx: number, col: string, currentValue: any) => {
        if (col === 'Periodo') return; // Periodo is not editable
        setEditingCell({ row: rowIdx, col });
        setEditValue(String(currentValue || '0'));
    };

    // Handle save
    const handleSave = async (rowIdx: number, col: string) => {
        const cellKey = `${rowIdx}-${col}`;
        setCellStatus(prev => ({ ...prev, [cellKey]: 'saving' }));

        try {
            const row = data[rowIdx];
            const periodo = row.Periodo; // e.g. "2026 - 04"
            const [yearStr, weekStr] = periodo.split(' - ');
            const anno = parseInt(yearStr);
            const settimana = parseInt(weekStr);

            // Parse column name: "Azienda_Prodotto"
            const [azienda, prodotto] = col.split('_');

            const quantita = parseInt(editValue) || 0;

            // Call API to update
            await TradingAPI.updateData(tipo, [{
                anno,
                settimana,
                azienda,
                prodotto,
                quantita
            }]);

            // Update local data
            const newData = [...data];
            newData[rowIdx][col] = quantita;
            setData(newData);

            setCellStatus(prev => ({ ...prev, [cellKey]: 'success' }));

            // Notify parent to refresh data (for production charts)
            onUpdate?.();

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

    // Handle keyboard events
    const handleKeyDown = (e: React.KeyboardEvent, rowIdx: number, col: string) => {
        if (e.key === 'Enter') {
            handleSave(rowIdx, col);
        } else if (e.key === 'Escape') {
            setEditingCell(null);
        }
    };

    // Handle delete column
    const handleDeleteColumn = async (colName: string) => {
        const [azienda, prodotto] = colName.split('_');
        try {
            // Find config ID from the column name
            const configs = await TradingAPI.getConfig(tipo);
            const config = configs.find(c => c.azienda === azienda && c.prodotto === prodotto);
            if (config) {
                await TradingAPI.deleteConfig(config.id);
                await fetchData(); // Reload data
            }
        } catch (error) {
            console.error('Error deleting column:', error);
        }
    };

    // Handle add new config
    const handleAddNew = async () => {
        if (!newAzienda.trim() || !newProdotto) {
            alert('Compila tutti i campi');
            return;
        }

        try {
            await TradingAPI.addConfig(tipo, newAzienda.trim(), newProdotto);
            setShowNewDialog(false);
            setNewAzienda('');
            setNewProdotto('');
            await fetchData(); // Reload data
        } catch (error) {
            console.error('Error adding config:', error);
            alert('Errore durante la creazione');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-xs text-gray-400 mb-2">{tipo === 'acquisto' ? 'T004' : 'T005'}</p>
            {/* Action Buttons */}
            <div className="flex gap-2 mb-4">
                <Button
                    onClick={() => setShowNewDialog(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuovo {tipo === 'acquisto' ? 'Acquisto' : 'Vendita'}
                </Button>
                <Button
                    onClick={() => setIsManaging(!isManaging)}
                    variant={isManaging ? "destructive" : "outline"}
                >
                    <Settings className="w-4 h-4 mr-2" />
                    {isManaging ? 'Fine Modifica' : 'Modifica Tabella'}
                </Button>
            </div>

            {/* New Config Dialog */}
            <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nuovo {tipo === 'acquisto' ? 'Acquisto' : 'Vendita'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Nome Fornitore</label>
                            <input
                                type="text"
                                value={newAzienda}
                                onChange={(e) => setNewAzienda(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="es. Amadori"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Tipo Prodotto</label>
                            <Select value={newProdotto} onValueChange={setNewProdotto}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona prodotto" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Granpollo">Granpollo</SelectItem>
                                    <SelectItem value="Pollo70">Pollo70</SelectItem>
                                    <SelectItem value="Color Yeald">Color Yeald</SelectItem>
                                    <SelectItem value="Ross">Ross</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewDialog(false)}>Annulla</Button>
                        <Button onClick={handleAddNew}>Crea</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse" style={{ minWidth: '800px', tableLayout: 'fixed' }}>
                    <thead>
                        <tr className="border-b-2 border-gray-300">
                            {columns.map((col) => {
                                const isPeriodo = col === 'Periodo';

                                // Get product color
                                let bgColor = 'bg-gray-200';
                                if (!isPeriodo) {
                                    const [, prodotto] = col.split('_');
                                    bgColor = getProductBrightBg(prodotto);
                                }

                                // Parse azienda/prodotto for header
                                let displayHeader: string | React.ReactNode = col;
                                if (!isPeriodo) {
                                    const [azienda, prodotto] = col.split('_');
                                    displayHeader = (
                                        <div className="flex flex-col items-center">
                                            <div className="font-semibold text-xs text-gray-700">{azienda}</div>
                                            <div className="text-xs text-gray-600">{prodotto}</div>
                                            {isManaging && (
                                                <button
                                                    onClick={() => handleDeleteColumn(col)}
                                                    className="mt-1 p-1 hover:bg-red-100 rounded"
                                                    title="Elimina colonna"
                                                >
                                                    <Trash2 className="w-3 h-3 text-red-600" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <th
                                        key={col}
                                        style={{ width: isPeriodo ? '140px' : '120px' }}
                                        className={`py-3 px-4 font-semibold text-gray-700 ${bgColor} ${isPeriodo ? 'text-left sticky left-0 z-10' : 'text-center'
                                            }`}
                                    >
                                        {isPeriodo ? col : displayHeader}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-b border-gray-100 hover:bg-gray-50">
                                {columns.map((col) => {
                                    const value = row[col];
                                    const isPeriodo = col === 'Periodo';
                                    const cellKey = `${rowIdx}-${col}`;
                                    const isEditing = editingCell?.row === rowIdx && editingCell?.col === col;
                                    const status = cellStatus[cellKey];

                                    // Get product color for data cells
                                    let bgColor = 'bg-gray-50';
                                    if (!isPeriodo) {
                                        const [, prodotto] = col.split('_');
                                        bgColor = getProductPastelBg(prodotto);
                                    }

                                    return (
                                        <td
                                            key={col}
                                            style={{ width: isPeriodo ? '140px' : '120px' }}
                                            className={`py-3 px-2 ${bgColor} ${isPeriodo
                                                ? 'font-semibold text-gray-900 sticky left-0 z-10'
                                                : 'text-center text-gray-700'
                                                } relative`}
                                            onDoubleClick={() => handleDoubleClick(rowIdx, col, value)}
                                        >
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={() => handleSave(rowIdx, col)}
                                                    onKeyDown={(e) => handleKeyDown(e, rowIdx, col)}
                                                    className="w-full px-2 py-1 border-2 border-blue-400 rounded focus:outline-none text-center"
                                                    style={{ width: '100px' }}
                                                    autoFocus
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className="font-mono text-sm">{isPeriodo ? value : formatNumber(value || 0)}</span>
                                                    {status === 'saving' && (
                                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                                    )}
                                                    {status === 'success' && (
                                                        <span className="text-green-600 text-xs">✓</span>
                                                    )}
                                                    {status === 'error' && (
                                                        <span className="text-red-600 text-xs">✗</span>
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
        </div>
    );
}
