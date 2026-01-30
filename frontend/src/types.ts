export interface ProductionDetail {
    allevamento: string;
    quantita: number;
    eta: number;
}

export interface PurchaseDetail {
    azienda: string;
    quantita: number;
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
    Attivo?: boolean;
}

// Trading Types
export interface TradingConfig {
    id: number;
    tipo: string;
    azienda: string;
    prodotto: string;
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
