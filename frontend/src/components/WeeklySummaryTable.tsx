import { useState, Fragment } from "react";
import { ChevronDown, ChevronRight, Egg, ShoppingCart } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { WeeklySummary } from "@/types";

interface WeeklySummaryTableProps {
    data: WeeklySummary[];
    includeTradingData?: boolean; // Control whether to show trading data
}

export function WeeklySummaryTable({ data, includeTradingData = true }: WeeklySummaryTableProps) {
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const toggleRow = (periodo: string) => {
        setExpandedRow(expandedRow === periodo ? null : periodo);
    };

    const fmt = (n: number) => new Intl.NumberFormat("it-IT").format(n);

    return (
        <div className="rounded-md border bg-card">
            <p className="text-xs text-gray-400 px-4 pt-2">T002</p>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Periodo</TableHead>
                        <TableHead className="text-right">Produzione</TableHead>
                        {includeTradingData && <TableHead className="text-right">Acquisti</TableHead>}
                        {includeTradingData && <TableHead className="text-right">Vendite</TableHead>}
                        <TableHead className="text-right font-bold">Totale Netto</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row) => (
                        <Fragment key={row.periodo}>
                            <TableRow
                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => toggleRow(row.periodo)}
                                data-state={expandedRow === row.periodo ? "selected" : undefined}
                            >
                                <TableCell>
                                    {expandedRow === row.periodo ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </TableCell>
                                <TableCell className="font-medium">{row.periodo}</TableCell>
                                <TableCell className="text-right">
                                    {row.produzione_totale > 0 ? (
                                        <Badge variant="secondary" className="font-mono text-green-700 bg-green-50 hover:bg-green-100 border-green-200">
                                            {fmt(row.produzione_totale)}
                                        </Badge>
                                    ) : "-"}
                                </TableCell>
                                {includeTradingData && (
                                    <TableCell className="text-right">
                                        {row.acquisti_totale > 0 ? (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="font-mono text-blue-600 cursor-help border-b border-dashed border-blue-400">
                                                            {fmt(row.acquisti_totale)}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left" className="max-w-xs">
                                                        <div className="space-y-1">
                                                            <p className="font-semibold text-xs mb-2">Dettaglio Acquisti:</p>
                                                            {row.dettagli_acquisti.map((d, i) => (
                                                                <p key={i} className="text-xs">
                                                                    {d.azienda} - {fmt(d.quantita)}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : "-"}
                                    </TableCell>
                                )}
                                {includeTradingData && (
                                    <TableCell className="text-right text-muted-foreground">
                                        {row.vendite_totale > 0 ? fmt(row.vendite_totale) : "-"}
                                    </TableCell>
                                )}
                                <TableCell className="text-right font-bold text-lg">
                                    {fmt(includeTradingData ? row.totale_netto : row.produzione_totale)}
                                </TableCell>
                            </TableRow>

                            {expandedRow === row.periodo && includeTradingData && (
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableCell colSpan={6} className="p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-200">

                                            {/* PRODUCTION DETAILS */}
                                            <Card className="shadow-sm border-l-4 border-l-green-500">
                                                <CardContent className="pt-6">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <Egg className="w-5 h-5 text-green-600" />
                                                        <h3 className="font-semibold text-lg">Dettaglio Produzione</h3>
                                                    </div>

                                                    {row.dettagli_produzione.length > 0 ? (
                                                        <div className="space-y-3">
                                                            {row.dettagli_produzione.map((d, i) => (
                                                                <div key={i} className="flex justify-between items-center text-sm border-b border-dashed pb-2 last:border-0 last:pb-0">
                                                                    <div>
                                                                        <span className="font-medium text-foreground">{d.allevamento}</span>
                                                                        <div className="text-xs text-muted-foreground">Età: {d.eta} settimane</div>
                                                                    </div>
                                                                    <div className="font-mono font-bold text-green-700">
                                                                        {fmt(d.quantita)}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground italic">Nessuna produzione attiva</p>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            {/* PURCHASE DETAILS */}
                                            <Card className="shadow-sm border-l-4 border-l-blue-500">
                                                <CardContent className="pt-6">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <ShoppingCart className="w-5 h-5 text-blue-600" />
                                                        <h3 className="font-semibold text-lg">Dettaglio Acquisti</h3>
                                                    </div>

                                                    {row.dettagli_acquisti.length > 0 ? (
                                                        <div className="space-y-3">
                                                            {row.dettagli_acquisti.map((d, i) => (
                                                                <div key={i} className="flex justify-between items-center text-sm border-b border-dashed pb-2 last:border-0 last:pb-0">
                                                                    <span className="font-medium text-foreground">{d.azienda}</span>
                                                                    <div className="font-mono font-bold text-blue-600">
                                                                        {fmt(d.quantita)}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground italic">Nessun acquisto per questa settimana</p>
                                                    )}
                                                </CardContent>
                                            </Card>

                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </Fragment>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
