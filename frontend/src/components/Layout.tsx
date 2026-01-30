import { useState } from "react";
import {
    LayoutDashboard,
    Egg,
    Settings,
    Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Layout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transition-transform duration-300 md:relative md:translate-x-0",
                    !isSidebarOpen && "-translate-x-full md:hidden"
                )}
            >
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
                        Incubatoio
                    </h1>
                </div>
                <nav className="p-4 space-y-2">
                    <NavItem icon={<Egg className="w-5 h-5" />} label="Produzione Uova" active />
                    <NavItem icon={<LayoutDashboard className="w-5 h-5" />} label="Allevamenti" />
                    <NavItem icon={<Settings className="w-5 h-5" />} label="Impostazioni" />
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 border-b bg-card flex items-center px-4 md:hidden">
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <Menu className="w-6 h-6" />
                    </Button>
                </header>
                <div className="flex-1 overflow-auto p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <button
            className={cn(
                "flex items-center w-full gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                active
                    ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : "text-muted-foreground hover:bg-muted"
            )}
        >
            {icon}
            {label}
        </button>
    );
}
