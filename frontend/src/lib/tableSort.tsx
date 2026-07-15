/**
 * Ordinamento tabelle: hook + intestazione cliccabile con frecce.
 * Click su una colonna: crescente -> decrescente -> crescente...
 */
import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export type SortDir = "asc" | "desc";
export type SortValue = string | number | boolean | null | undefined;

export function useTableSort() {
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    const toggleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(d => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    return { sortKey, sortDir, toggleSort };
}

export function sortRows<T>(
    rows: T[],
    sortKey: string | null,
    sortDir: SortDir,
    accessors: Record<string, (row: T) => SortValue>
): T[] {
    if (!sortKey || !accessors[sortKey]) return rows;
    const acc = accessors[sortKey];
    const mul = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
        const va = acc(a);
        const vb = acc(b);
        const emptyA = va === null || va === undefined || va === "";
        const emptyB = vb === null || vb === undefined || vb === "";
        // Valori mancanti sempre in fondo, indipendentemente dalla direzione
        if (emptyA && emptyB) return 0;
        if (emptyA) return 1;
        if (emptyB) return -1;
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * mul;
        if (typeof va === "boolean" && typeof vb === "boolean") return ((va ? 1 : 0) - (vb ? 1 : 0)) * mul;
        return String(va).localeCompare(String(vb), "it", { numeric: true, sensitivity: "base" }) * mul;
    });
}

interface SortableThProps {
    label: ReactNode;
    sortKey: string;
    currentKey: string | null;
    dir: SortDir;
    onSort: (key: string) => void;
    align?: "left" | "center" | "right";
    className?: string;
}

export function SortableTh({ label, sortKey, currentKey, dir, onSort, align = "left", className = "" }: SortableThProps) {
    const active = currentKey === sortKey;
    const justify = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
    return (
        <th className={className}>
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className={`inline-flex items-center gap-1 w-full select-none cursor-pointer hover:text-amber-700 ${justify} ${active ? "text-amber-700" : ""}`}
                title="Ordina"
            >
                <span>{label}</span>
                {active
                    ? (dir === "asc" ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />)
                    : <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 text-gray-400" />}
            </button>
        </th>
    );
}
