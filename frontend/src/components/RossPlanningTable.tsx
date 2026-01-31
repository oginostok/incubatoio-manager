/**
 * T013 - Pianificazione Nascite Ross
 * Extended version with dynamic client columns and M/F totals
 */

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";

const API_BASE = API_BASE_URL;

interface Client {
    id: number;
    nome_cliente: string;
    sex_type: string; // 'maschi', 'femmine', 'entrambi'
}

interface PlanningRow {
    settimana_nascita: string;
    anno: number;
    settimana: number;
    uova_prodotte: number;
    uova_acquistate: number;
    uova_vendute: number;
    uova_totali: number;
    animali_possibili: number;
    client_values: Record<number, number>;
    totale_maschi: number;
    totale_femmine: number;
}

interface EditingCell {
    anno: number;
    settimana: number;
    clientId: number;
}

interface RossPlanningTableProps {
    showTooltips?: boolean;
}

export default function RossPlanningTable(_props: RossPlanningTableProps) {
    const [data, setData] = useState<PlanningRow[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasVendite, setHasVendite] = useState(false);
    const [hasAcquisti, setHasAcquisti] = useState(false);

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [newClientName, setNewClientName] = useState("");
    const [newClientSexType, setNewClientSexType] = useState<string>("entrambi");

    // Editing state
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
    const [editValue, setEditValue] = useState("");

    // Delete confirmation state
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/chick-planning/ross-extended`);
            const json = await res.json();
            setData(json.data || []);
            setClients(json.clients || []);
            setHasVendite(json.has_vendite || false);
            setHasAcquisti(json.has_acquisti || false);
        } catch (err) {
            console.error("Failed to load planning data:", err);
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (value: number) => {
        return value.toLocaleString("it-IT", { useGrouping: true });
    };

    const handleAddClient = async () => {
        if (!newClientName.trim()) return;

        try {
            await fetch(`${API_BASE}/api/chick-planning/ross/clients`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nome_cliente: newClientName,
                    sex_type: newClientSexType
                })
            });
            setShowAddModal(false);
            setNewClientName("");
            setNewClientSexType("entrambi");
            fetchData();
        } catch (err) {
            console.error("Failed to add client:", err);
        }
    };

    const handleDeleteClient = async (clientId: number) => {
        try {
            await fetch(`${API_BASE}/api/chick-planning/ross/clients/${clientId}`, {
                method: "DELETE"
            });
            setConfirmDeleteId(null);
            fetchData();
        } catch (err) {
            console.error("Failed to delete client:", err);
        }
    };

    const handleDoubleClick = (anno: number, settimana: number, clientId: number, currentValue: number) => {
        setEditingCell({ anno, settimana, clientId });
        setEditValue(currentValue.toString());
    };

    const handleCellSave = async () => {
        if (!editingCell) return;

        const quantita = parseInt(editValue) || 0;

        try {
            await fetch(`${API_BASE}/api/chick-planning/ross/client-data`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    anno: editingCell.anno,
                    settimana: editingCell.settimana,
                    cliente_id: editingCell.clientId,
                    quantita
                })
            });
            setEditingCell(null);
            fetchData();
        } catch (err) {
            console.error("Failed to save client data:", err);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleCellSave();
        } else if (e.key === "Escape") {
            setEditingCell(null);
        }
    };

    const getSexTypeLabel = (sexType: string) => {
        switch (sexType) {
            case "maschi": return "♂";
            case "femmine": return "♀";
            default: return "♂♀";
        }
    };

    const getSexTypeColor = (sexType: string) => {
        switch (sexType) {
            case "maschi": return "text-blue-600";
            case "femmine": return "text-pink-600";
            default: return "text-purple-600";
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <p className="text-gray-500">Caricamento...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-ross-bright flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Pianificazione Nascite - Ross</h2>
                    <p className="text-xs text-orange-100">T013</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-white text-ross-bright rounded-lg font-medium hover:bg-orange-50 transition-colors flex items-center gap-2"
                >
                    <span>+</span>
                    Aggiungi Cliente
                </button>
            </div>

            {/* Add Client Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-96 shadow-2xl">
                        <h3 className="text-lg font-bold mb-4">Nuovo Cliente</h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome Cliente
                            </label>
                            <input
                                type="text"
                                value={newClientName}
                                onChange={(e) => setNewClientName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ross-bright focus:border-transparent"
                                placeholder="Es. Tizio"
                                autoFocus
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipologia Pulcini
                            </label>
                            <select
                                value={newClientSexType}
                                onChange={(e) => setNewClientSexType(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ross-bright focus:border-transparent"
                            >
                                <option value="maschi">Solo Maschi ♂</option>
                                <option value="femmine">Solo Femmine ♀</option>
                                <option value="entrambi">Entrambi ♂♀</option>
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleAddClient}
                                className="flex-1 px-4 py-2 bg-ross-bright text-white rounded-lg hover:bg-orange-600"
                            >
                                Aggiungi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm table-fixed">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b sticky left-0 bg-gray-50 w-24">
                                Sett. Nascita
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b w-28">
                                Uova Prodotte
                            </th>
                            {hasAcquisti && (
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b w-28">
                                    Uova Acquistate
                                </th>
                            )}
                            {hasVendite && (
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b w-28">
                                    Uova Vendute
                                </th>
                            )}
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b bg-gray-100 w-28">
                                Uova Totali
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b bg-green-50 w-32">
                                Animali Possibili
                            </th>

                            {/* Dynamic client columns */}
                            {clients.map((client) => (
                                <th
                                    key={client.id}
                                    className="px-3 py-2 text-center text-xs font-medium border-b bg-yellow-50 w-28"
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        <span className={getSexTypeColor(client.sex_type)}>
                                            {getSexTypeLabel(client.sex_type)}
                                        </span>
                                        <span className="text-gray-700">{client.nome_cliente}</span>
                                        <div className="relative">
                                            <button
                                                onClick={() => setConfirmDeleteId(confirmDeleteId === client.id ? null : client.id)}
                                                className="ml-1 text-gray-400 hover:text-red-500 transition-colors text-lg font-bold leading-none"
                                                title="Elimina cliente"
                                            >
                                                ×
                                            </button>
                                            {confirmDeleteId === client.id && (
                                                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 whitespace-nowrap">
                                                    <p className="text-sm text-gray-700 mb-2">Eliminare? Non può essere ripristinato.</p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setConfirmDeleteId(null)}
                                                            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                                        >
                                                            Annulla
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClient(client.id)}
                                                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                                        >
                                                            Elimina
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </th>
                            ))}

                            {/* Totale columns */}
                            <th className="px-3 py-2 text-center text-xs font-medium text-blue-700 uppercase border-b bg-blue-50 w-28">
                                Totale ♂
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-pink-700 uppercase border-b bg-pink-50 w-28">
                                Totale ♀
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, index) => (
                            <tr
                                key={`${row.anno}-${row.settimana}`}
                                className={`hover:bg-gray-100 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                                    }`}
                            >
                                <td className="px-3 py-2 text-center font-medium text-gray-700 sticky left-0 bg-inherit">
                                    {row.settimana_nascita}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-gray-600">
                                    {formatNumber(row.uova_prodotte)}
                                </td>
                                {hasAcquisti && (
                                    <td className="px-3 py-2 text-right font-mono text-gray-600">
                                        {formatNumber(row.uova_acquistate)}
                                    </td>
                                )}
                                {hasVendite && (
                                    <td className="px-3 py-2 text-right font-mono text-gray-600">
                                        {formatNumber(row.uova_vendute)}
                                    </td>
                                )}
                                <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800 bg-gray-100">
                                    {formatNumber(row.uova_totali)}
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-semibold text-green-700 bg-green-50">
                                    {formatNumber(row.animali_possibili)}
                                </td>

                                {/* Dynamic client cells */}
                                {clients.map((client) => {
                                    const isEditing = editingCell?.anno === row.anno &&
                                        editingCell?.settimana === row.settimana &&
                                        editingCell?.clientId === client.id;
                                    const value = row.client_values[client.id] || 0;

                                    return (
                                        <td
                                            key={client.id}
                                            className="px-1 py-1 bg-yellow-50 cursor-pointer hover:bg-yellow-100 h-9"
                                            onDoubleClick={() => handleDoubleClick(row.anno, row.settimana, client.id, value)}
                                        >
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={handleCellSave}
                                                    onKeyDown={handleKeyDown}
                                                    className="w-full h-full px-2 text-right font-mono text-sm bg-white border border-yellow-400 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500 box-border"
                                                    autoFocus
                                                />
                                            ) : (
                                                <div className="px-2 text-right font-mono text-sm">
                                                    {formatNumber(value)}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}

                                {/* Totale columns */}
                                <td className={`px-3 py-2 text-right font-mono font-semibold bg-blue-50 ${row.totale_maschi < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                                    {formatNumber(row.totale_maschi)}
                                </td>
                                <td className={`px-3 py-2 text-right font-mono font-semibold bg-pink-50 ${row.totale_femmine < 0 ? 'text-red-600' : 'text-pink-700'}`}>
                                    {formatNumber(row.totale_femmine)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
