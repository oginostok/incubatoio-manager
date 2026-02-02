/**
 * T014 - Magazzino Uova
 * Tracciamento delle partite di uova arrivate e presenti in incubatoio
 */

import { useState, useEffect } from "react";
import { Plus, X, Pencil } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";

const API_BASE = API_BASE_URL;

// Product options with colors - from RULES.md
const PRODUCT_OPTIONS = [
    { id: "Granpollo", label: "Granpollo", bgColor: "bg-granpollo-bright", textColor: "text-white" },
    { id: "Pollo70", label: "Pollo70", bgColor: "bg-pollo70-bright", textColor: "text-white" },
    { id: "Color Yeald", label: "Color Yeald", bgColor: "bg-colorYeald-bright", textColor: "text-white" },
    { id: "Ross", label: "Ross", bgColor: "bg-ross-bright", textColor: "text-white" },
];

// Nome options
const DEFAULT_NOMI = [
    "BLA", "Bla Plus", "BR", "Color Yeald", "Ermellinati", "Eureka",
    "Harco", "K", "Livo Tetra", "Neri Pesanti", "Pelati Bianchi",
    "Pelati Rossi", "Pelato", "Pelato Label", "Plus", "Ranger Gold",
    "Redbro", "Ross", "Rossi Label", "Rustic", "Tetra Livo"
];

interface EggStorageEntry {
    id: number;
    prodotto: string;
    nome: string;
    origine: string;
    numero: number;
    eta: number;
    arrivate_il: string;
}

interface LottoData {
    id: number;
    Allevamento: string;
    Anno_Start: number;
    Sett_Start: number;
}

interface EggStorageTableProps {
    showTooltips?: boolean;
}

export default function EggStorageTable({ showTooltips = true }: EggStorageTableProps) {
    const [entries, setEntries] = useState<EggStorageEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState<EggStorageEntry | null>(null);
    const [allevamenti, setAllevamenti] = useState<string[]>([]);
    const [lotti, setLotti] = useState<LottoData[]>([]);
    const [nomiList, setNomiList] = useState<string[]>(DEFAULT_NOMI);

    // Form state
    const [formProdotto, setFormProdotto] = useState("Granpollo");
    const [formNome, setFormNome] = useState("");
    const [formOrigine, setFormOrigine] = useState("Acquisto");
    const [formAzienda, setFormAzienda] = useState("");
    const [formNumero, setFormNumero] = useState("");
    const [formEta, setFormEta] = useState("");
    const [formArrivateIl, setFormArrivateIl] = useState("");
    const [formNewNome, setFormNewNome] = useState("");
    const [showNewNomeInput, setShowNewNomeInput] = useState(false);
    const [saving, setSaving] = useState(false);

    // Fetch data
    useEffect(() => {
        fetchEntries();
        fetchAllevamenti();
    }, []);

    const fetchEntries = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/magazzino-uova`);
            const data = await res.json();
            setEntries(data || []);
        } catch (err) {
            console.error("Failed to load egg storage:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllevamenti = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/allevamenti/lotti`);
            const data: LottoData[] = await res.json();
            setLotti(data || []);
            // Extract unique allevamento names
            const uniqueAllevamenti = [...new Set(data.map((l) => l.Allevamento))].sort();
            setAllevamenti(uniqueAllevamenti);
        } catch (err) {
            console.error("Failed to load allevamenti:", err);
        }
    };

    const calculateGiacenza = (arrivateIl: string): number => {
        if (!arrivateIl) return 0;
        const arrivalDate = new Date(arrivateIl);
        const today = new Date();
        const diffTime = today.getTime() - arrivalDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 ? diffDays : 0;
    };

    const formatNumber = (num: number): string => {
        // Use explicit dot as thousand separator (Italian format: xxx.xxx)
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const getProductColor = (prodotto: string): string => {
        const product = PRODUCT_OPTIONS.find(p => p.id === prodotto);
        return product ? product.bgColor : "bg-gray-200";
    };

    const handleOrigineChange = (value: string) => {
        setFormOrigine(value);
        // If selected an allevamento, try to get the current age
        if (value !== "Acquisto") {
            const lottiForAllevamento = lotti.filter(l => l.Allevamento === value);
            if (lottiForAllevamento.length > 0) {
                // Calculate current ISO week
                const now = new Date();
                const currentYear = now.getFullYear();
                const startOfYear = new Date(currentYear, 0, 1);
                const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
                const currentWeek = Math.ceil((days + startOfYear.getDay() + 1) / 7);

                // Calculate age for each lotto and find the minimum
                const ages = lottiForAllevamento.map(lotto => {
                    if (lotto.Anno_Start && lotto.Sett_Start) {
                        const startYear = lotto.Anno_Start;
                        const startWeek = lotto.Sett_Start;
                        return (currentYear - startYear) * 52 + (currentWeek - startWeek);
                    }
                    return 0;
                }).filter(age => age > 0);

                if (ages.length > 0) {
                    // Use minimum age when multiple lotti exist
                    const minAge = Math.min(...ages);
                    setFormEta(String(minAge));
                }
            }
        }
    };

    const handleAddNome = () => {
        if (formNewNome.trim() && !nomiList.includes(formNewNome.trim())) {
            setNomiList(prev => [...prev, formNewNome.trim()].sort());
            setFormNome(formNewNome.trim());
            setFormNewNome("");
            setShowNewNomeInput(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Format origine based on selection
            let origine = formOrigine;
            if (formOrigine === "Acquisto" && formAzienda.trim()) {
                origine = `Acquisto - ${formAzienda.trim()}`;
            }

            const res = await fetch(`${API_BASE}/api/magazzino-uova`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prodotto: formProdotto,
                    nome: formNome,
                    origine: origine,
                    numero: parseInt(formNumero.replace(/\./g, ""), 10) || 0,
                    eta: parseInt(formEta, 10) || 0,
                    arrivate_il: formArrivateIl
                })
            });

            if (res.ok) {
                await fetchEntries();
                setShowModal(false);
                resetForm();
            }
        } catch (err) {
            console.error("Failed to save entry:", err);
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setFormProdotto("Granpollo");
        setFormNome("");
        setFormOrigine("Acquisto");
        setFormAzienda("");
        setFormNumero("");
        setFormEta("");
        setFormArrivateIl("");
        setFormNewNome("");
        setShowNewNomeInput(false);
        setEditingEntry(null);
    };

    const handleEdit = (entry: EggStorageEntry) => {
        // Parse origine to check if it's "Acquisto - xxx" format
        let origine = entry.origine;
        let azienda = "";
        if (entry.origine.startsWith("Acquisto - ")) {
            origine = "Acquisto";
            azienda = entry.origine.replace("Acquisto - ", "");
        } else if (entry.origine === "Acquisto") {
            origine = "Acquisto";
        }

        setFormProdotto(entry.prodotto);
        setFormNome(entry.nome);
        setFormOrigine(origine);
        setFormAzienda(azienda);
        setFormNumero(entry.numero.toLocaleString("it-IT"));
        setFormEta(String(entry.eta));
        setFormArrivateIl(entry.arrivate_il);
        setEditingEntry(entry);
        setShowModal(true);
    };

    const handleUpdate = async () => {
        if (!editingEntry) return;
        setSaving(true);

        try {
            // Format origine based on selection
            let origine = formOrigine;
            if (formOrigine === "Acquisto" && formAzienda.trim()) {
                origine = `Acquisto - ${formAzienda.trim()}`;
            }

            const res = await fetch(`${API_BASE}/api/magazzino-uova/${editingEntry.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prodotto: formProdotto,
                    nome: formNome,
                    origine: origine,
                    numero: parseInt(formNumero.replace(/\./g, ""), 10) || 0,
                    eta: parseInt(formEta, 10) || 0,
                    arrivate_il: formArrivateIl
                })
            });

            if (res.ok) {
                await fetchEntries();
                setShowModal(false);
                resetForm();
            }
        } catch (err) {
            console.error("Failed to update entry:", err);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteFromModal = async () => {
        if (!editingEntry) return;
        if (!confirm("Sei sicuro di voler eliminare questa partita?")) return;

        try {
            const res = await fetch(`${API_BASE}/api/magazzino-uova/${editingEntry.id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                await fetchEntries();
                setShowModal(false);
                resetForm();
            }
        } catch (err) {
            console.error("Failed to delete entry:", err);
        }
    };

    const openAddModal = () => {
        resetForm();
        setShowModal(true);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <p className="text-gray-500">Caricamento...</p>
            </div>
        );
    }

    // Sort entries by Giacenza (days in storage) in descending order
    const sortedEntries = [...entries].sort((a, b) => {
        return calculateGiacenza(b.arrivate_il) - calculateGiacenza(a.arrivate_il);
    });

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Magazzino Uova</h2>
                    <p className="text-xs text-gray-400">T014</p>
                    {showTooltips && (
                        <p className="text-sm text-gray-500 mt-1">
                            Tracciamento delle partite di uova arrivate e presenti in incubatoio
                        </p>
                    )}
                </div>
                <Button
                    onClick={openAddModal}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Aggiungi partita
                </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm table-fixed">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="w-28 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Prodotto
                            </th>
                            <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Nome
                            </th>
                            <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Origine
                            </th>
                            <th className="w-28 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Numero
                            </th>
                            <th className="w-20 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Età
                            </th>
                            <th className="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Arrivate il
                            </th>
                            <th className="w-24 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Giacenza
                            </th>
                            <th className="w-12 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">

                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                    Nessuna partita presente. Clicca su "Aggiungi partita" per iniziare.
                                </td>
                            </tr>
                        ) : (
                            sortedEntries.map((entry, index) => (
                                <tr
                                    key={entry.id}
                                    className={`hover:bg-gray-100 transition-colors cursor-pointer ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                                        }`}
                                >
                                    <td className="px-4 py-3">
                                        <span className={`inline-block px-3 py-1 rounded-full text-white text-xs font-medium ${getProductColor(entry.prodotto)}`}>
                                            {entry.prodotto}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700 font-medium">
                                        {entry.nome}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {entry.origine}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-700 font-mono">
                                        {formatNumber(entry.numero)}
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-600">
                                        W{entry.eta}
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-600">
                                        {entry.arrivate_il ? new Date(entry.arrivate_il).toLocaleDateString("it-IT") : "-"}
                                    </td>
                                    <td className="px-4 py-3 text-center font-medium">
                                        <span className={`${calculateGiacenza(entry.arrivate_il) > 7 ? "text-amber-600" : "text-gray-700"}`}>
                                            {calculateGiacenza(entry.arrivate_il)} gg
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleEdit(entry)}
                                                className="text-blue-400 hover:text-blue-600 transition-colors"
                                                title="Modifica"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">
                                {editingEntry ? "Modifica Partita" : "Aggiungi Partita"}
                            </h3>
                            <button
                                onClick={() => { setShowModal(false); resetForm(); }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            {/* Prodotto */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Prodotto
                                </label>
                                <select
                                    value={formProdotto}
                                    onChange={(e) => setFormProdotto(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    required
                                >
                                    {PRODUCT_OPTIONS.map(p => (
                                        <option key={p.id} value={p.id}>{p.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Nome */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nome
                                </label>
                                {showNewNomeInput ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={formNewNome}
                                            onChange={(e) => setFormNewNome(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                            placeholder="Nuovo nome..."
                                        />
                                        <Button type="button" onClick={handleAddNome} className="bg-green-600 hover:bg-green-700">
                                            Aggiungi
                                        </Button>
                                        <Button type="button" variant="outline" onClick={() => setShowNewNomeInput(false)}>
                                            Annulla
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <select
                                            value={formNome}
                                            onChange={(e) => setFormNome(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                            required
                                        >
                                            <option value="">Seleziona...</option>
                                            {nomiList.map(n => (
                                                <option key={n} value={n}>{n}</option>
                                            ))}
                                        </select>
                                        <Button type="button" variant="outline" onClick={() => setShowNewNomeInput(true)}>
                                            + Nuovo
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Origine */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Origine
                                </label>
                                <select
                                    value={formOrigine}
                                    onChange={(e) => handleOrigineChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    required
                                >
                                    <option value="Acquisto">Acquisto</option>
                                    {allevamenti.map(a => (
                                        <option key={a} value={a}>{a}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Azienda - only shown when Acquisto is selected */}
                            {formOrigine === "Acquisto" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Azienda
                                    </label>
                                    <input
                                        type="text"
                                        value={formAzienda}
                                        onChange={(e) => setFormAzienda(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                        placeholder="Nome dell'azienda fornitrice"
                                    />
                                </div>
                            )}

                            {/* Numero */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Numero
                                </label>
                                <input
                                    type="text"
                                    value={formNumero}
                                    onChange={(e) => {
                                        // Format as xxx.xxx
                                        const raw = e.target.value.replace(/\D/g, "");
                                        const formatted = parseInt(raw || "0", 10).toLocaleString("it-IT");
                                        setFormNumero(raw ? formatted : "");
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    placeholder="es. 150.000"
                                    required
                                />
                            </div>

                            {/* Età */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Età (settimane)
                                </label>
                                <input
                                    type="number"
                                    value={formEta}
                                    onChange={(e) => setFormEta(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    placeholder="es. 32"
                                    min="0"
                                    max="100"
                                    required
                                />
                            </div>

                            {/* Arrivate il */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Arrivate il
                                </label>
                                <input
                                    type="date"
                                    value={formArrivateIl}
                                    onChange={(e) => setFormArrivateIl(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    required
                                />
                            </div>

                            {/* Submit */}
                            <div className="flex justify-between pt-4 border-t border-gray-200">
                                {editingEntry ? (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={handleDeleteFromModal}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        Elimina
                                    </Button>
                                ) : (
                                    <div></div>
                                )}
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => { setShowModal(false); resetForm(); }}
                                    >
                                        Annulla
                                    </Button>
                                    {editingEntry ? (
                                        <Button
                                            type="button"
                                            className="bg-amber-600 hover:bg-amber-700"
                                            disabled={saving}
                                            onClick={handleUpdate}
                                        >
                                            {saving ? "Salvataggio..." : "Salva"}
                                        </Button>
                                    ) : (
                                        <Button
                                            type="submit"
                                            className="bg-amber-600 hover:bg-amber-700"
                                            disabled={saving}
                                        >
                                            {saving ? "Salvataggio..." : "Salva"}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
