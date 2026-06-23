import axios from "axios";
import type { Lotto, LottoCreate, FarmStructure, TradingConfig, TradingTableData } from "@/types";
import { API_URL } from "@/lib/config";

// Create Axios Instance
export const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Production Service Wrapper
export const ProductionAPI = {
    getWeeklySummary: async (productFilter?: string) => {
        const params = productFilter ? { product: productFilter } : {};
        const res = await api.get("/production/summary", { params });
        return res.data;
    },
};

// Production Tables Service Wrapper
export const ProductionTablesAPI = {
    getProductionTables: async () => {
        const res = await api.get("/production-tables");
        return res.data;
    },
    updateCell: async (week: number, column: string, value: string) => {
        const res = await api.put("/production-tables", { week, column, value });
        return res.data;
    },
    addColumn: async (name: string) => {
        const res = await api.post("/production-tables/columns", { name });
        return res.data;
    },
    deleteColumn: async (columnName: string) => {
        const res = await api.delete(`/production-tables/columns/${encodeURIComponent(columnName)}`);
        return res.data;
    },
};

// Nato su Fertile Service Wrapper (T018)
export interface NatoFertileCell {
    allevamento: string;
    tipo: string;
    valore: number;
    n_partite: number;
}
export interface NatoFertileMatrix {
    cells: NatoFertileCell[];
    tipi: string[];
    allevamenti: string[];
}
export const NatoFertileAPI = {
    getMatrix: async (): Promise<NatoFertileMatrix> => {
        const res = await api.get("/nato-fertile");
        return res.data;
    },
    updateCell: async (allevamento: string, tipo: string, valore: number | null) => {
        const res = await api.put("/nato-fertile", { allevamento, tipo, valore });
        return res.data;
    },
    getBatchOverrides: async (): Promise<Record<number, number>> => {
        const res = await api.get("/nato-fertile/batch-overrides");
        return res.data.data || {};
    },
    updateBatchOverride: async (batch_id: number, valore: number | null) => {
        const res = await api.put("/nato-fertile/batch-override", { batch_id, valore });
        return res.data;
    },
};

// Allevamenti Service Wrapper
export const AllevamentiAPI = {
    // Get all lotti
    getLotti: async (): Promise<Lotto[]> => {
        const res = await api.get("/allevamenti/lotti");
        return res.data;
    },

    // Get farm structure
    getFarmStructure: async (): Promise<FarmStructure> => {
        const res = await api.get("/allevamenti/farms");
        return res.data;
    },

    // Create new lotto
    createLotto: async (lotto: LottoCreate): Promise<void> => {
        await api.post("/allevamenti/lotti", lotto);
    },

    // Update lotto
    updateLotto: async (id: number, updates: Partial<Lotto>): Promise<void> => {
        await api.put(`/allevamenti/lotti/${id}`, updates);
    },

    // Delete lotto
    deleteLotto: async (id: number): Promise<void> => {
        await api.delete(`/allevamenti/lotti/${id}`);
    },
};

// Trading Service Wrapper
export const TradingAPI = {
    // Get trading configuration (aziende e prodotti)
    getConfig: async (tipo: 'acquisto' | 'vendita'): Promise<TradingConfig[]> => {
        const res = await api.get(`/trading/config/${tipo}`);
        return res.data;
    },

    // Add new trading config
    addConfig: async (tipo: string, azienda: string, prodotto: string, razza: string = ""): Promise<void> => {
        await api.post('/trading/config', { tipo, azienda, prodotto, razza });
    },

    // Update trading config
    updateConfig: async (id: number, azienda: string, prodotto: string): Promise<void> => {
        await api.put(`/trading/config/${id}`, { azienda, prodotto });
    },

    // Delete trading config
    deleteConfig: async (id: number): Promise<void> => {
        await api.delete(`/trading/config/${id}`);
    },

    // Get trading data table (52 weeks)
    getData: async (tipo: 'acquisto' | 'vendita'): Promise<TradingTableData> => {
        const res = await api.get(`/trading/data/${tipo}`);
        return res.data;
    },

    // Update trading data (bulk)
    updateData: async (tipo: string, updates: any[]): Promise<void> => {
        await api.put(`/trading/data/${tipo}`, { updates });
    },
};

// Scheda Settimanale Service
export const SchedaAPI = {
    save: async (payload: object) => {
        const res = await api.post("/allevamenti/scheda", payload);
        return res.data;
    },
    load: async (allevamento: string, capannone: string, anno: number, settimana: number) => {
        try {
            const res = await api.get("/allevamenti/scheda", {
                params: { allevamento, capannone, anno, settimana },
            });
            return res.data ?? null;
        } catch {
            return null;
        }
    },
};

// Incubazioni Service Wrapper
export const IncubazioniAPI = {
    deleteIncubation: async (id: number) => {
        const res = await api.delete(`/incubazioni/${id}`);
        return res.data;
    },
    uncommitIncubation: async (id: number) => {
        const res = await api.post(`/incubazioni/${id}/uncommit`);
        return res.data;
    },
    updateIncubation: async (
        id: number,
        updates: {
            richiesta_granpollo?: number;
            richiesta_pollo70?: number;
            richiesta_color_yeald?: number;
            richiesta_ross?: number;
        }
    ) => {
        const res = await api.put(`/incubazioni/${id}`, updates);
        return res.data;
    },
    updateBatch: async (
        incubationId: number,
        batchId: number,
        updates: { uova_utilizzate?: number; storico_override?: number; preparata?: boolean }
    ) => {
        const res = await api.patch(`/incubazioni/${incubationId}/batches/${batchId}`, updates);
        return res.data;
    },
};

// Pollastra Farms Service Wrapper (allevamenti pollastra configurabili)
export interface PollastraFarm {
    id: number;
    nome: string;
    n_capannoni: number;
}
export const PollastraFarmsAPI = {
    getAll: async (): Promise<{ farms: PollastraFarm[]; structure: Record<string, number[]> }> => {
        const res = await api.get("/pollastra-farms");
        return res.data;
    },
    add: async (nome: string, n_capannoni: number) => {
        const res = await api.post("/pollastra-farms", { nome, n_capannoni });
        return res.data;
    },
    update: async (id: number, payload: { nome?: string; n_capannoni?: number }) => {
        const res = await api.put(`/pollastra-farms/${id}`, payload);
        return res.data;
    },
    remove: async (id: number) => {
        const res = await api.delete(`/pollastra-farms/${id}`);
        return res.data;
    },
};

// Manual Production Adjustments Service Wrapper
export const ManualAdjustmentsAPI = {
    create: async (payload: { anno: number; settimana: number; prodotto?: string; descrizione?: string; quantita: number }) => {
        const res = await api.post("/production/manual-adjustments", payload);
        return res.data;
    },
    update: async (
        id: number,
        payload: { prodotto?: string; descrizione?: string; quantita?: number }
    ) => {
        const res = await api.patch(`/production/manual-adjustments/${id}`, payload);
        return res.data;
    },
    remove: async (id: number) => {
        const res = await api.delete(`/production/manual-adjustments/${id}`);
        return res.data;
    },
};

