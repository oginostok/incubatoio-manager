/**
 * IncubationTable (T016)
 * Component for managing egg incubations
 */
import { useState, useEffect } from "react";
import { Plus, Calendar, Clock, User, Settings2, ChevronDown, ChevronUp, Trash2, Egg, Save, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/config";

// Types
interface IncubationBatch {
    id: number;
    incubation_id: number;
    egg_storage_id: number;
    prodotto: string;
    nome: string;
    origine: string;
    uova_partita: number;
    uova_utilizzate: number;
    eta: number;
    storico_override: number | null;
    quantita: number;
}

interface Incubation {
    id: number;
    data_incubazione: string;
    data_schiusa: string;
    pre_incubazione_ore: number;
    partenza_macchine: string | null;
    operatore: string | null;
    incubatrici: string | null;
    richiesta_granpollo: number;
    richiesta_pollo70: number;
    richiesta_color_yeald: number;
    richiesta_ross: number;
    stato: string;
    committed: boolean;
    batches: IncubationBatch[];
    used_granpollo?: number;
    used_pollo70?: number;
    used_color_yeald?: number;
    used_ross?: number;
}

interface EggStorageEntry {
    id: number;
    prodotto: string;
    nome: string;
    origine: string;
    eta: number;
    numero: number;
    arrivate_il: string;
}

// Constants
const OPERATORS = ["Mauro", "Alessandro", "Ivan", "Alessandra"];
const INCUBATORS = Array.from({ length: 18 }, (_, i) => i + 1);

const PRODUCT_COLORS: Record<string, string> = {
    "Granpollo": "bg-green-100 text-green-800 border-green-300",
    "Pollo70": "bg-blue-100 text-blue-800 border-blue-300",
    "Color Yeald": "bg-red-100 text-red-800 border-red-300",
    "Ross": "bg-orange-100 text-orange-800 border-orange-300"
};

// Helper: Format number with dot separator (xxx.xxx)
const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Helper: Parse formatted number back to integer
const parseFormattedNumber = (str: string): number => {
    return parseInt(str.replace(/\./g, ""), 10) || 0;
};

// Helper: Format date for display (Italian format)
const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const days = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
    const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
        "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

// Helper: Get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
    const today = new Date();
    return today.toISOString().split("T")[0];
};

export default function IncubationTable() {
    const [incubations, setIncubations] = useState<Incubation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewForm, setShowNewForm] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [confirmSaveId, setConfirmSaveId] = useState<number | null>(null);

    // Egg selection modal state
    const [eggStorage, setEggStorage] = useState<EggStorageEntry[]>([]);
    const [addEggsForIncubationId, setAddEggsForIncubationId] = useState<number | null>(null);
    const [selectedEggId, setSelectedEggId] = useState<number | null>(null);

    // Edit incubation state
    const [editIncubationId, setEditIncubationId] = useState<number | null>(null);
    const [editFormData, setEditFormData] = useState<{
        pre_incubazione_ore: number;
        partenza_macchine: string;
        operatore: string;
        incubatrici: number[];
        richiesta_granpollo: number;
        richiesta_pollo70: number;
        richiesta_color_yeald: number;
        richiesta_ross: number;
    } | null>(null);

    // Birth rates from T008 - format: {week: {product: rate}}
    const [birthRates, setBirthRates] = useState<Record<number, Record<string, number>>>({});

    // Form state for new incubation
    const [formData, setFormData] = useState({
        data_incubazione: getTodayDate(),
        pre_incubazione_ore: 0,
        partenza_macchine: "",
        operatore: "",
        incubatrici: [] as number[],
        richiesta_granpollo: 0,
        richiesta_pollo70: 0,
        richiesta_color_yeald: 0,
        richiesta_ross: 0
    });

    // Fetch incubations
    const fetchIncubations = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/incubazioni`);
            if (response.ok) {
                const data = await response.json();
                // Filter out committed incubations (they are in the registry now)
                setIncubations(data.filter((inc: Incubation) => !inc.committed));
            }
        } catch (error) {
            console.error("Failed to fetch incubations", error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch birth rates from T008
    const fetchBirthRates = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/birth-rates`);
            if (response.ok) {
                const result = await response.json();
                setBirthRates(result.data || {});
            }
        } catch (error) {
            console.error("Failed to fetch birth rates", error);
        }
    };

    // Helper: Get storico rate from T008 based on product and age
    const getStorico = (prodotto: string, eta: number, storicoOverride: number | null): number => {
        // Use override if set
        if (storicoOverride !== null) return storicoOverride;

        // Map product names to T008 keys
        const productKeyMap: Record<string, string> = {
            "Granpollo": "granpollo",
            "GranPollo": "granpollo",
            "Pollo70": "pollo70",
            "Color Yeald": "colorYeald",
            "Ross": "ross"
        };
        const key = productKeyMap[prodotto] || prodotto.toLowerCase();

        // Lookup in birthRates
        const weekData = birthRates[eta];
        if (weekData && weekData[key] !== undefined) {
            return weekData[key];
        }

        // Default fallback
        return 82;
    };

    useEffect(() => {
        fetchIncubations();
        fetchBirthRates();
        fetchEggStorage();
    }, []);

    // Calculate schiusa date (+21 days)
    const calculateSchiusaDate = (incubationDate: string): string => {
        const date = new Date(incubationDate);
        date.setDate(date.getDate() + 21);
        return date.toISOString().split("T")[0];
    };

    // Handle incubator selection toggle
    const toggleIncubator = (num: number) => {
        setFormData(prev => ({
            ...prev,
            incubatrici: prev.incubatrici.includes(num)
                ? prev.incubatrici.filter(n => n !== num)
                : [...prev.incubatrici, num].sort((a, b) => a - b)
        }));
    };

    // Create new incubation
    const handleCreateIncubation = async () => {
        try {
            const payload = {
                ...formData,
                incubatrici: formData.incubatrici.join(",")
            };
            const response = await fetch(`${API_BASE_URL}/api/incubazioni`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                await fetchIncubations();
                setShowNewForm(false);
                setShowRequestForm(false);
                // Reset form
                setFormData({
                    data_incubazione: getTodayDate(),
                    pre_incubazione_ore: 0,
                    partenza_macchine: "",
                    operatore: "",
                    incubatrici: [],
                    richiesta_granpollo: 0,
                    richiesta_pollo70: 0,
                    richiesta_color_yeald: 0,
                    richiesta_ross: 0
                });
            }
        } catch (error) {
            console.error("Failed to create incubation", error);
        }
    };

    // Delete incubation - called when user confirms in modal
    const handleDeleteIncubation = async (id: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/incubazioni/${id}`, {
                method: "DELETE"
            });
            if (response.ok) {
                await fetchIncubations();
            }
        } catch (error) {
            console.error("Failed to delete incubation", error);
        } finally {
            setDeleteConfirmId(null);
        }
    };

    // Fetch egg storage for selection
    const fetchEggStorage = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/magazzino-uova`);
            if (response.ok) {
                const data = await response.json();
                setEggStorage(data);
            }
        } catch (error) {
            console.error("Failed to fetch egg storage", error);
        }
    };

    // Open add eggs modal
    const openAddEggsModal = (incubationId: number) => {
        setAddEggsForIncubationId(incubationId);
        setSelectedEggId(null);
        fetchEggStorage();
    };

    // Add egg batch to incubation
    const handleAddBatch = async () => {
        if (!addEggsForIncubationId || !selectedEggId) return;

        const selectedEgg = eggStorage.find(e => e.id === selectedEggId);
        if (!selectedEgg) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/incubazioni/${addEggsForIncubationId}/batches`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    egg_storage_id: selectedEgg.id,
                    prodotto: selectedEgg.prodotto,
                    nome: selectedEgg.nome,
                    origine: selectedEgg.origine,
                    uova_partita: selectedEgg.numero,
                    eta: selectedEgg.eta
                })
            });
            if (response.ok) {
                await fetchIncubations();
                setAddEggsForIncubationId(null);
                setSelectedEggId(null);
            }
        } catch (error) {
            console.error("Failed to add batch", error);
        }
    };

    // Update batch field (uova_utilizzate or storico_override)
    const handleUpdateBatch = async (incubationId: number, batchId: number, field: string, value: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/incubazioni/${incubationId}/batches/${batchId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: value })
            });
            if (response.ok) {
                await fetchIncubations();
            }
        } catch (error) {
            console.error("Failed to update batch", error);
        }
    };

    // Delete batch from incubation
    const handleDeleteBatch = async (incubationId: number, batchId: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/incubazioni/${incubationId}/batches/${batchId}`, {
                method: "DELETE"
            });
            if (response.ok) {
                await fetchIncubations();
                await fetchEggStorage();
            }
        } catch (error) {
            console.error("Failed to delete batch", error);
        }
    };

    // Commit incubation - updates egg storage with used quantities
    const handleCommitIncubation = async (incubationId: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/incubazioni/${incubationId}/commit`, {
                method: "POST"
            });
            if (response.ok) {
                await fetchIncubations();
                await fetchEggStorage();
                alert("Incubazione salvata! Il magazzino è stato aggiornato.");
            } else {
                const data = await response.json();
                alert(`Errore: ${data.detail}`);
            }
        } catch (error) {
            console.error("Failed to commit incubation", error);
            alert("Errore durante il salvataggio.");
        }
    };

    // Update incubation details
    const handleUpdateIncubation = async () => {
        if (!editIncubationId || !editFormData) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/incubazioni/${editIncubationId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pre_incubazione_ore: editFormData.pre_incubazione_ore,
                    partenza_macchine: editFormData.partenza_macchine,
                    operatore: editFormData.operatore,
                    incubatrici: editFormData.incubatrici.join(","),
                    richiesta_granpollo: editFormData.richiesta_granpollo,
                    richiesta_pollo70: editFormData.richiesta_pollo70,
                    richiesta_color_yeald: editFormData.richiesta_color_yeald,
                    richiesta_ross: editFormData.richiesta_ross
                })
            });
            if (response.ok) {
                await fetchIncubations();
                setEditIncubationId(null);
                setEditFormData(null);
            }
        } catch (error) {
            console.error("Failed to update incubation", error);
        }
    };

    // Toggle incubator for edit form
    const toggleEditIncubator = (num: number) => {
        if (!editFormData) return;
        setEditFormData(prev => prev ? ({
            ...prev,
            incubatrici: prev.incubatrici.includes(num)
                ? prev.incubatrici.filter(n => n !== num)
                : [...prev.incubatrici, num].sort((a, b) => a - b)
        }) : null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Incubazione Uova</h2>
                    <p className="text-xs text-gray-400">T016</p>
                </div>
                {!showNewForm && (
                    <Button
                        onClick={() => setShowNewForm(true)}
                        className="gap-2 bg-amber-600 hover:bg-amber-700"
                    >
                        <Plus className="w-4 h-4" />
                        Nuova Incubazione
                    </Button>
                )}
            </div>

            {/* New Incubation Form */}
            {showNewForm && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Header Row */}
                    <div className="bg-amber-50 border-b border-amber-200 p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Left: Date */}
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-amber-600" />
                                    <span className="font-medium text-gray-700">Giorno Incubazione:</span>
                                </div>
                                <input
                                    type="date"
                                    value={formData.data_incubazione}
                                    onChange={(e) => setFormData(prev => ({ ...prev, data_incubazione: e.target.value }))}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                            {/* Right: Calculated Schiusa */}
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700">🐣 Schiusa del:</span>
                                <span className="text-amber-700 font-semibold">
                                    {formatDateDisplay(calculateSchiusaDate(formData.data_incubazione))}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Details Row */}
                    <div className="bg-gray-50 border-b border-gray-200 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            {/* Pre-incubazione */}
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-600">Pre-incubazione:</span>
                                <input
                                    type="number"
                                    value={formData.pre_incubazione_ore || ""}
                                    onChange={(e) => setFormData(prev => ({ ...prev, pre_incubazione_ore: parseInt(e.target.value) || 0 }))}
                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                                    placeholder="0"
                                />
                                <span className="text-gray-500">ore</span>
                            </div>
                            {/* Partenza Macchine */}
                            <div className="flex items-center gap-2">
                                <Settings2 className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-600">Partenza Macchine:</span>
                                <input
                                    type="time"
                                    value={formData.partenza_macchine}
                                    onChange={(e) => setFormData(prev => ({ ...prev, partenza_macchine: e.target.value }))}
                                    className="px-2 py-1 border border-gray-300 rounded"
                                />
                            </div>
                            {/* Operatore */}
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-600">Operatore:</span>
                                <select
                                    value={formData.operatore}
                                    onChange={(e) => setFormData(prev => ({ ...prev, operatore: e.target.value }))}
                                    className="px-2 py-1 border border-gray-300 rounded"
                                >
                                    <option value="">Seleziona...</option>
                                    {OPERATORS.map(op => (
                                        <option key={op} value={op}>{op}</option>
                                    ))}
                                </select>
                            </div>
                            {/* Incubatrici */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-gray-600">Incubatrici:</span>
                                <div className="flex flex-wrap gap-1">
                                    {INCUBATORS.map(num => (
                                        <button
                                            key={num}
                                            onClick={() => toggleIncubator(num)}
                                            className={`w-7 h-7 text-xs rounded border transition-all ${formData.incubatrici.includes(num)
                                                ? "bg-amber-500 text-white border-amber-600"
                                                : "bg-white text-gray-600 border-gray-300 hover:border-amber-400"
                                                }`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Animal Request Section */}
                    <div className="p-4 border-b border-gray-200">
                        <button
                            onClick={() => setShowRequestForm(!showRequestForm)}
                            className="flex items-center gap-2 text-gray-700 hover:text-amber-700 font-medium"
                        >
                            {showRequestForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            Richiesta di animali
                        </button>

                        {showRequestForm && (
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-700 mb-3">Inserire gli animali richiesti per prodotto:</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {/* Granpollo */}
                                    <div className={`p-3 rounded-lg border ${PRODUCT_COLORS["Granpollo"]}`}>
                                        <label className="block text-sm font-medium mb-1">Granpollo</label>
                                        <input
                                            type="text"
                                            value={formData.richiesta_granpollo ? formatNumber(formData.richiesta_granpollo) : ""}
                                            onChange={(e) => setFormData(prev => ({ ...prev, richiesta_granpollo: parseFormattedNumber(e.target.value) }))}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-right font-mono"
                                            placeholder="0"
                                        />
                                    </div>
                                    {/* Pollo70 */}
                                    <div className={`p-3 rounded-lg border ${PRODUCT_COLORS["Pollo70"]}`}>
                                        <label className="block text-sm font-medium mb-1">Pollo70</label>
                                        <input
                                            type="text"
                                            value={formData.richiesta_pollo70 ? formatNumber(formData.richiesta_pollo70) : ""}
                                            onChange={(e) => setFormData(prev => ({ ...prev, richiesta_pollo70: parseFormattedNumber(e.target.value) }))}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-right font-mono"
                                            placeholder="0"
                                        />
                                    </div>
                                    {/* Color Yeald */}
                                    <div className={`p-3 rounded-lg border ${PRODUCT_COLORS["Color Yeald"]}`}>
                                        <label className="block text-sm font-medium mb-1">Color Yeald</label>
                                        <input
                                            type="text"
                                            value={formData.richiesta_color_yeald ? formatNumber(formData.richiesta_color_yeald) : ""}
                                            onChange={(e) => setFormData(prev => ({ ...prev, richiesta_color_yeald: parseFormattedNumber(e.target.value) }))}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-right font-mono"
                                            placeholder="0"
                                        />
                                    </div>
                                    {/* Ross */}
                                    <div className={`p-3 rounded-lg border ${PRODUCT_COLORS["Ross"]}`}>
                                        <label className="block text-sm font-medium mb-1">Ross</label>
                                        <input
                                            type="text"
                                            value={formData.richiesta_ross ? formatNumber(formData.richiesta_ross) : ""}
                                            onChange={(e) => setFormData(prev => ({ ...prev, richiesta_ross: parseFormattedNumber(e.target.value) }))}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-right font-mono"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="p-4 bg-gray-50 flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowNewForm(false);
                                setShowRequestForm(false);
                            }}
                        >
                            Annulla
                        </Button>
                        <Button
                            onClick={handleCreateIncubation}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            Salva Incubazione
                        </Button>
                    </div>
                </div>
            )}

            {/* Existing Incubations List */}
            {incubations.length === 0 && !showNewForm ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                        <p className="text-amber-700 text-lg mb-2">
                            🥚 Nessuna incubazione registrata
                        </p>
                        <p className="text-gray-600">
                            Clicca su "Nuova Incubazione" per iniziare
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {incubations.map(incubation => (
                        <div
                            key={incubation.id}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                        >
                            {/* Incubation Header */}
                            <div
                                className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 cursor-pointer hover:from-amber-100 hover:to-orange-100 transition-colors"
                                onClick={() => setExpandedId(expandedId === incubation.id ? null : incubation.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-amber-600" />
                                            <span className="font-semibold text-gray-800">
                                                Incubazione del {formatDateDisplay(incubation.data_incubazione)}
                                            </span>
                                        </div>
                                        <span className="text-gray-500">→</span>
                                        <span className="text-amber-700">
                                            🐣 Schiusa: {formatDateDisplay(incubation.data_schiusa)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${incubation.stato === "in_corso" ? "bg-yellow-100 text-yellow-800" :
                                            incubation.stato === "completata" ? "bg-green-100 text-green-800" :
                                                "bg-gray-100 text-gray-800"
                                            }`}>
                                            {incubation.stato === "in_corso" ? "In Corso" :
                                                incubation.stato === "completata" ? "Completata" : incubation.stato}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Initialize edit form with current values
                                                setEditFormData({
                                                    pre_incubazione_ore: incubation.pre_incubazione_ore || 0,
                                                    partenza_macchine: incubation.partenza_macchine || "",
                                                    operatore: incubation.operatore || "",
                                                    incubatrici: incubation.incubatrici ? incubation.incubatrici.split(",").map(Number) : [],
                                                    richiesta_granpollo: incubation.richiesta_granpollo || 0,
                                                    richiesta_pollo70: incubation.richiesta_pollo70 || 0,
                                                    richiesta_color_yeald: incubation.richiesta_color_yeald || 0,
                                                    richiesta_ross: incubation.richiesta_ross || 0
                                                });
                                                setEditIncubationId(incubation.id);
                                                setExpandedId(incubation.id);
                                            }}
                                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                            title="Modifica"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirmId(incubation.id);
                                            }}
                                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        {expandedId === incubation.id ? (
                                            <ChevronUp className="w-5 h-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedId === incubation.id && (
                                <div className="p-4 space-y-4">
                                    {/* Details Row */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-gray-50 p-3 rounded-lg">
                                        <div>
                                            <span className="text-gray-500">Pre-incubazione:</span>
                                            <span className="ml-2 font-medium">{incubation.pre_incubazione_ore || 0} ore</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Partenza:</span>
                                            <span className="ml-2 font-medium">{incubation.partenza_macchine || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Operatore:</span>
                                            <span className="ml-2 font-medium">{incubation.operatore || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Incubatrici:</span>
                                            <span className="ml-2 font-medium">{incubation.incubatrici || "-"}</span>
                                        </div>
                                    </div>

                                    {/* Edit Mode Form */}
                                    {editIncubationId === incubation.id && editFormData && (
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                            <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                                                <Pencil className="w-4 h-4" />
                                                Modifica Incubazione
                                            </h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">Pre-incubazione (ore)</label>
                                                    <input
                                                        type="number"
                                                        value={editFormData.pre_incubazione_ore}
                                                        onChange={(e) => setEditFormData(prev => prev ? ({ ...prev, pre_incubazione_ore: parseInt(e.target.value) || 0 }) : null)}
                                                        className="w-full px-2 py-1 border rounded text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">Partenza Macchine</label>
                                                    <input
                                                        type="time"
                                                        value={editFormData.partenza_macchine}
                                                        onChange={(e) => setEditFormData(prev => prev ? ({ ...prev, partenza_macchine: e.target.value }) : null)}
                                                        className="w-full px-2 py-1 border rounded text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">Operatore</label>
                                                    <select
                                                        value={editFormData.operatore}
                                                        onChange={(e) => setEditFormData(prev => prev ? ({ ...prev, operatore: e.target.value }) : null)}
                                                        className="w-full px-2 py-1 border rounded text-sm"
                                                    >
                                                        <option value="">Seleziona...</option>
                                                        {["Mauro", "Alessandro", "Ivan", "Alessandra"].map(op => (
                                                            <option key={op} value={op}>{op}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">Incubatrici</label>
                                                    <div className="flex flex-wrap gap-1">
                                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                                            <button
                                                                key={num}
                                                                type="button"
                                                                onClick={() => toggleEditIncubator(num)}
                                                                className={`w-6 h-6 text-xs rounded ${editFormData.incubatrici.includes(num)
                                                                    ? "bg-amber-600 text-white"
                                                                    : "bg-gray-200 text-gray-600"
                                                                    }`}
                                                            >
                                                                {num}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <label className="block text-xs text-gray-600 mb-2">Richiesta Animali</label>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    <div className={`p-2 rounded-lg border ${PRODUCT_COLORS["Granpollo"]}`}>
                                                        <label className="block text-xs mb-1">Granpollo</label>
                                                        <input
                                                            type="text"
                                                            value={editFormData.richiesta_granpollo ? formatNumber(editFormData.richiesta_granpollo) : ""}
                                                            onChange={(e) => setEditFormData(prev => prev ? ({ ...prev, richiesta_granpollo: parseFormattedNumber(e.target.value) }) : null)}
                                                            className="w-full px-2 py-1 border rounded text-right font-mono text-sm"
                                                        />
                                                    </div>
                                                    <div className={`p-2 rounded-lg border ${PRODUCT_COLORS["Pollo70"]}`}>
                                                        <label className="block text-xs mb-1">Pollo70</label>
                                                        <input
                                                            type="text"
                                                            value={editFormData.richiesta_pollo70 ? formatNumber(editFormData.richiesta_pollo70) : ""}
                                                            onChange={(e) => setEditFormData(prev => prev ? ({ ...prev, richiesta_pollo70: parseFormattedNumber(e.target.value) }) : null)}
                                                            className="w-full px-2 py-1 border rounded text-right font-mono text-sm"
                                                        />
                                                    </div>
                                                    <div className={`p-2 rounded-lg border ${PRODUCT_COLORS["Color Yeald"]}`}>
                                                        <label className="block text-xs mb-1">Color Yeald</label>
                                                        <input
                                                            type="text"
                                                            value={editFormData.richiesta_color_yeald ? formatNumber(editFormData.richiesta_color_yeald) : ""}
                                                            onChange={(e) => setEditFormData(prev => prev ? ({ ...prev, richiesta_color_yeald: parseFormattedNumber(e.target.value) }) : null)}
                                                            className="w-full px-2 py-1 border rounded text-right font-mono text-sm"
                                                        />
                                                    </div>
                                                    <div className={`p-2 rounded-lg border ${PRODUCT_COLORS["Ross"]}`}>
                                                        <label className="block text-xs mb-1">Ross</label>
                                                        <input
                                                            type="text"
                                                            value={editFormData.richiesta_ross ? formatNumber(editFormData.richiesta_ross) : ""}
                                                            onChange={(e) => setEditFormData(prev => prev ? ({ ...prev, richiesta_ross: parseFormattedNumber(e.target.value) }) : null)}
                                                            className="w-full px-2 py-1 border rounded text-right font-mono text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => { setEditIncubationId(null); setEditFormData(null); }}
                                                >
                                                    Annulla
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                    onClick={handleUpdateIncubation}
                                                >
                                                    Salva Modifiche
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Animal Requests Summary */}
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Richiesta Animali:</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {(() => {
                                                // Calculate previsione animali per product from batches
                                                const previsioneByProduct: Record<string, number> = {};
                                                (incubation.batches || []).forEach(batch => {
                                                    const storico = getStorico(batch.prodotto, batch.eta, batch.storico_override);
                                                    const previsione = Math.round((batch.uova_utilizzate || 0) * (storico / 100));
                                                    previsioneByProduct[batch.prodotto] = (previsioneByProduct[batch.prodotto] || 0) + previsione;
                                                });

                                                return [
                                                    { label: "Granpollo", prodottoKey: "Granpollo", requested: incubation.richiesta_granpollo },
                                                    { label: "Pollo70", prodottoKey: "Pollo70", requested: incubation.richiesta_pollo70 },
                                                    { label: "Color Yeald", prodottoKey: "Color Yeald", requested: incubation.richiesta_color_yeald },
                                                    { label: "Ross", prodottoKey: "Ross", requested: incubation.richiesta_ross }
                                                ].filter(p => p.requested > 0).map(product => {
                                                    const previsione = previsioneByProduct[product.prodottoKey] || 0;
                                                    const richiesta = product.requested - previsione;
                                                    return (
                                                        <div
                                                            key={product.label}
                                                            className={`p-3 rounded-lg border ${PRODUCT_COLORS[product.label]}`}
                                                        >
                                                            <div className="text-xs opacity-75">{product.label}</div>
                                                            <div className="font-bold">{formatNumber(product.requested)}</div>
                                                            <div className="text-xs mt-1">
                                                                Previsione: {formatNumber(previsione)}
                                                                <br />
                                                                Richiesta: <span className={richiesta > 0 ? "text-red-600 font-semibold" : "text-green-600"}>{formatNumber(richiesta)}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>

                                    {/* Available Storage Table */}
                                    {!incubation.committed && eggStorage.length > 0 && (
                                        <div className="bg-blue-50 p-3 rounded-lg">
                                            <h4 className="text-sm font-medium text-blue-800 mb-2">Magazzino Disponibile:</h4>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-blue-100">
                                                            <th className="px-2 py-1 text-left">Prodotto</th>
                                                            <th className="px-2 py-1 text-left">Nome</th>
                                                            <th className="px-2 py-1 text-left">Origine</th>
                                                            <th className="px-2 py-1 text-center">Età</th>
                                                            <th className="px-2 py-1 text-right">Uova Disponibili</th>
                                                            <th className="px-2 py-1 text-center">Giacenza</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(() => {
                                                            // Calculate remaining and giacenza, then sort by giacenza descending
                                                            const calculateGiacenza = (arrivateIl: string): number => {
                                                                const arrivalDate = new Date(arrivateIl);
                                                                const today = new Date();
                                                                return Math.floor((today.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));
                                                            };

                                                            return eggStorage
                                                                .map(egg => {
                                                                    const usedFromStorage = (incubation.batches || []).reduce((sum, batch) => {
                                                                        if (batch.egg_storage_id === egg.id) {
                                                                            return sum + (batch.uova_utilizzate || 0);
                                                                        }
                                                                        return sum;
                                                                    }, 0);
                                                                    const remaining = egg.numero - usedFromStorage;
                                                                    const giacenza = calculateGiacenza(egg.arrivate_il);
                                                                    return { ...egg, remaining, giacenza };
                                                                })
                                                                .filter(egg => egg.remaining > 0)
                                                                .sort((a, b) => b.giacenza - a.giacenza)
                                                                .map(egg => (
                                                                    <tr key={egg.id} className="border-b border-blue-200 hover:bg-blue-100">
                                                                        <td className="px-2 py-1">
                                                                            <span className={`px-2 py-0.5 rounded text-xs ${PRODUCT_COLORS[egg.prodotto] || "bg-gray-100"}`}>
                                                                                {egg.prodotto}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-2 py-1">{egg.nome}</td>
                                                                        <td className="px-2 py-1 text-gray-600">{egg.origine}</td>
                                                                        <td className="px-2 py-1 text-center">{egg.eta} sett.</td>
                                                                        <td className="px-2 py-1 text-right font-mono">{formatNumber(egg.remaining)}</td>
                                                                        <td className="px-2 py-1 text-center font-mono">{egg.giacenza} gg</td>
                                                                    </tr>
                                                                ));
                                                        })()}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Add Eggs Button */}
                                    {!incubation.committed && (
                                        <div className="flex justify-start">
                                            <Button
                                                onClick={() => openAddEggsModal(incubation.id)}
                                                className="gap-2 bg-amber-600 hover:bg-amber-700"
                                                size="sm"
                                            >
                                                <Egg className="w-4 h-4" />
                                                Aggiungi Uova
                                            </Button>
                                        </div>
                                    )}

                                    {/* Batches Table */}
                                    {incubation.batches && incubation.batches.length > 0 && (
                                        <div className="overflow-x-auto">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Partite Utilizzate:</h4>
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-100">
                                                        <th className="px-2 py-2 text-left">Prodotto</th>
                                                        <th className="px-2 py-2 text-left">Nome</th>
                                                        <th className="px-2 py-2 text-left">Origine</th>
                                                        <th className="px-2 py-2 text-right">Uova Partita</th>
                                                        <th className="px-2 py-2 text-right">Uova Utilizzate</th>
                                                        <th className="px-2 py-2 text-right">Uova Rimanenti</th>
                                                        <th className="px-2 py-2 text-center">Età</th>
                                                        <th className="px-2 py-2 text-right">Storico %</th>
                                                        <th className="px-2 py-2 text-right">Prev. Animali</th>
                                                        {!incubation.committed && <th className="px-2 py-2 text-center w-10"></th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {incubation.batches.map(batch => {
                                                        const storico = getStorico(batch.prodotto, batch.eta, batch.storico_override);
                                                        const uovaRimanenti = (batch.uova_partita || 0) - (batch.uova_utilizzate || 0);
                                                        const previsioneAnimali = Math.round((batch.uova_utilizzate || 0) * (storico / 100));

                                                        return (
                                                            <tr key={batch.id} className="border-b hover:bg-gray-50">
                                                                <td className="px-2 py-2">
                                                                    <span className={`px-2 py-1 rounded text-xs ${PRODUCT_COLORS[batch.prodotto] || "bg-gray-100"}`}>
                                                                        {batch.prodotto}
                                                                    </span>
                                                                </td>
                                                                <td className="px-2 py-2">{batch.nome}</td>
                                                                <td className="px-2 py-2 text-gray-600">{batch.origine}</td>
                                                                <td className="px-2 py-2 text-right font-mono">{formatNumber(batch.uova_partita)}</td>
                                                                <td className="px-2 py-2 text-right">
                                                                    <input
                                                                        type="number"
                                                                        defaultValue={batch.uova_utilizzate || 0}
                                                                        min={0}
                                                                        max={batch.uova_partita}
                                                                        className="w-20 px-2 py-1 text-right font-mono border rounded focus:ring-2 focus:ring-amber-500"
                                                                        onBlur={(e) => {
                                                                            const val = parseInt(e.target.value) || 0;
                                                                            if (val !== batch.uova_utilizzate) {
                                                                                handleUpdateBatch(incubation.id, batch.id, "uova_utilizzate", val);
                                                                            }
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter") {
                                                                                (e.target as HTMLInputElement).blur();
                                                                            }
                                                                        }}
                                                                    />
                                                                </td>
                                                                <td className="px-2 py-2 text-right font-mono text-gray-600">{formatNumber(uovaRimanenti)}</td>
                                                                <td className="px-2 py-2 text-center">{batch.eta} sett.</td>
                                                                <td className="px-2 py-2 text-right">
                                                                    <input
                                                                        type="number"
                                                                        defaultValue={storico}
                                                                        min={0}
                                                                        max={100}
                                                                        step={0.1}
                                                                        className="w-16 px-2 py-1 text-right font-mono border rounded focus:ring-2 focus:ring-amber-500"
                                                                        onBlur={(e) => {
                                                                            const val = parseFloat(e.target.value) || 0;
                                                                            if (val !== batch.storico_override) {
                                                                                handleUpdateBatch(incubation.id, batch.id, "storico_override", val);
                                                                            }
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter") {
                                                                                (e.target as HTMLInputElement).blur();
                                                                            }
                                                                        }}
                                                                    />
                                                                </td>
                                                                <td className="px-2 py-2 text-right font-mono font-bold text-green-700">{formatNumber(previsioneAnimali)}</td>
                                                                {!incubation.committed && (
                                                                    <td className="px-2 py-2 text-center">
                                                                        <button
                                                                            onClick={() => handleDeleteBatch(incubation.id, batch.id)}
                                                                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                                            title="Rimuovi partita"
                                                                        >
                                                                            <span className="text-lg">×</span>
                                                                        </button>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        );
                                                    })}
                                                    {/* Totals Row */}
                                                    <tr className="bg-gray-100 font-bold border-t-2">
                                                        <td colSpan={4} className="px-2 py-2 text-right">Totale:</td>
                                                        <td className="px-2 py-2 text-right font-mono">
                                                            {formatNumber(incubation.batches.reduce((sum, b) => sum + (b.uova_utilizzate || 0), 0))}
                                                        </td>
                                                        <td colSpan={3} className="px-2 py-2"></td>
                                                        <td className="px-2 py-2 text-right font-mono text-green-700">
                                                            {formatNumber(incubation.batches.reduce((sum, b) => {
                                                                const storico = getStorico(b.prodotto, b.eta, b.storico_override);
                                                                return sum + Math.round((b.uova_utilizzate || 0) * (storico / 100));
                                                            }, 0))}
                                                        </td>
                                                        {!incubation.committed && <td></td>}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* Commit Button */}
                                    {!incubation.committed && incubation.batches && incubation.batches.length > 0 && (
                                        <div className="flex justify-end pt-4 border-t">
                                            <Button
                                                onClick={() => setConfirmSaveId(incubation.id)}
                                                className="gap-2 bg-green-600 hover:bg-green-700"
                                            >
                                                <Save className="w-4 h-4" />
                                                Salva Incubazione
                                            </Button>
                                        </div>
                                    )}

                                    {incubation.committed && (
                                        <div className="bg-green-100 p-3 rounded-lg text-green-800 text-sm">
                                            ✓ Incubazione salvata - Il magazzino è stato aggiornato
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId !== null && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-full">
                                <Trash2 className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Conferma eliminazione</h3>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Sei sicuro di voler eliminare questa incubazione? Questa azione non può essere annullata.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setDeleteConfirmId(null)}
                            >
                                Annulla
                            </Button>
                            <Button
                                onClick={() => handleDeleteIncubation(deleteConfirmId)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                Elimina
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Confirmation Modal */}
            {confirmSaveId !== null && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-100 rounded-full">
                                <Save className="w-6 h-6 text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Conferma salvataggio</h3>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Procedere con il salvataggio dell'Incubazione e il trasferimento nel registro?
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setConfirmSaveId(null)}
                            >
                                Annulla
                            </Button>
                            <Button
                                onClick={async () => {
                                    await handleCommitIncubation(confirmSaveId);
                                    setConfirmSaveId(null);
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                Sì
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Eggs Modal */}
            {addEggsForIncubationId !== null && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-amber-100 rounded-full">
                                <Egg className="w-6 h-6 text-amber-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Seleziona uova dal Magazzino</h3>
                        </div>

                        {eggStorage.length === 0 ? (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-center">
                                Nessuna partita disponibile nel magazzino uova
                            </div>
                        ) : (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Seleziona partita:
                                </label>
                                <select
                                    value={selectedEggId || ""}
                                    onChange={(e) => setSelectedEggId(e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                >
                                    <option value="">-- Seleziona una partita --</option>
                                    {(() => {
                                        // Get the incubation we're adding to
                                        const currentIncubation = incubations.find(inc => inc.id === addEggsForIncubationId);
                                        const calculateGiacenza = (arrivateIl: string): number => {
                                            const arrivalDate = new Date(arrivateIl);
                                            const today = new Date();
                                            return Math.floor((today.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));
                                        };

                                        return eggStorage
                                            .map(egg => {
                                                // Calculate remaining eggs considering batches in current incubation
                                                const usedFromStorage = (currentIncubation?.batches || []).reduce((sum, batch) => {
                                                    if (batch.egg_storage_id === egg.id) {
                                                        return sum + (batch.uova_utilizzate || 0);
                                                    }
                                                    return sum;
                                                }, 0);
                                                const remaining = egg.numero - usedFromStorage;
                                                const giacenza = calculateGiacenza(egg.arrivate_il);
                                                return { ...egg, remaining, giacenza };
                                            })
                                            .filter(egg => egg.remaining > 0)
                                            .sort((a, b) => b.giacenza - a.giacenza)
                                            .map(egg => (
                                                <option key={egg.id} value={egg.id}>
                                                    {egg.prodotto} - {egg.nome} - {egg.origine} - {egg.eta} sett. - {formatNumber(egg.remaining)} uova [{egg.giacenza} Giorni]
                                                </option>
                                            ));
                                    })()}
                                </select>
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setAddEggsForIncubationId(null);
                                    setSelectedEggId(null);
                                }}
                            >
                                Annulla
                            </Button>
                            <Button
                                onClick={handleAddBatch}
                                disabled={!selectedEggId}
                                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                            >
                                Aggiungi
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
