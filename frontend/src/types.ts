export interface ProductionDetail {
    allevamento: string;
    quantita: number;        // net of shed assignments to sales
    quantita_lorda?: number; // production before subtracting assigned sales
    eta: number;
    prodotto: string;
    razza?: string;
    razza_gallo?: string;
}

export interface PurchaseDetail {
    azienda: string;
    quantita: number;
}

export interface AssegnazioneVendita {
    allevamento: string;
    quantita: number;
}

export interface SaleDetail {
    azienda: string;
    quantita: number;
    prodotto?: string;
    vendita_id?: number;
    assegnazioni?: AssegnazioneVendita[];
}

export interface WeeklySummary {
    periodo: string;
    anno: number;
    settimana: number;
    produzione_totale: number;
    acquisti_totale: number;
    vendite_totale: number;
    totale_netto: number;
    dettagli_produzione: ProductionDetail[];
    dettagli_acquisti: PurchaseDetail[];
    dettagli_vendite: SaleDetail[];
}

// Allevamenti Types
export interface Lotto {
    id: number;
    Allevamento: string;
    Capannone: string;
    Razza: string;
    Razza_Gallo?: string;
    Prodotto: string;
    Capi: number;
    Anno_Start: number;
    Sett_Start: number;
    Data_Fine_Prevista?: string;
    Curva_Produzione?: string;
    Fase?: string | null;
    Attivo: boolean;
}

export interface LottoCreate {
    Allevamento: string;
    Capannone: string;
    Razza: string;
    Razza_Gallo?: string;
    Prodotto: string;
    Capi: number;
    Anno_Start: number;
    Sett_Start: number;
    Data_Fine_Prevista?: string;
    Curva_Produzione?: string;
    Fase?: string | null;
    Attivo?: boolean;
}

// Trading Types
export interface TradingConfig {
    id: number;
    tipo: string;
    azienda: string;
    prodotto: string;
    razza?: string;
    active: boolean;
}

export interface TradingDataRow {
    Periodo: string;
    [key: string]: number | string;  // Dynamic columns for each azienda_prodotto
}

export interface TradingTableData {
    columns: string[];
    data: TradingDataRow[];
}

export type FarmStructure = Record<string, number[]>;
