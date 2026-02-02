/**
 * ResponsiveSidebar
 * Collapsible sidebar that shows hamburger menu below 1920px
 */

import { useState, type ReactNode } from "react";
import { Menu, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResponsiveSidebarProps {
    children: ReactNode;
    title: string;
    icon: ReactNode;
    onNavigateHome: () => void;
    footerText?: string;
}

export default function ResponsiveSidebar({
    children,
    title,
    icon,
    onNavigateHome,
    footerText = "Area in costruzione"
}: ResponsiveSidebarProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Mobile hamburger button - visible below 1920px */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-md border border-gray-200 min-[1920px]:hidden"
                aria-label="Apri menu"
            >
                <Menu className="w-6 h-6 text-gray-700" />
            </button>

            {/* Overlay - visible when sidebar is open on mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 min-[1920px]:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed min-[1920px]:relative inset-y-0 left-0 z-50
                    w-64 bg-white/95 min-[1920px]:bg-white/80 backdrop-blur-sm border-r border-gray-200 p-6 flex flex-col
                    transform transition-transform duration-300 ease-in-out
                    ${isOpen ? "translate-x-0" : "-translate-x-full"} min-[1920px]:translate-x-0
                `}
            >
                {/* Close button - mobile only */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 min-[1920px]:hidden"
                    aria-label="Chiudi menu"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => {
                        setIsOpen(false);
                        onNavigateHome();
                    }}
                    className="mb-8 justify-start gap-2 text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Torna alla Home
                </Button>

                {/* Logo/Title */}
                <div className="flex items-center gap-3 mb-8">
                    {icon}
                    <h1 className="text-xl font-bold text-gray-800">{title}</h1>
                </div>

                {/* Navigation - passed as children */}
                <nav className="flex-1 space-y-2">
                    {children}
                </nav>

                {/* Footer */}
                <div className="text-xs text-gray-400 mt-auto pt-4 border-t">
                    {footerText}
                </div>
            </aside>
        </>
    );
}
