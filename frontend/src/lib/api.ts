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
    addConfig: async (tipo: string, azienda: string, prodotto: string): Promise<void> => {
        await api.post('/trading/config', { tipo, azienda, prodotto });
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

