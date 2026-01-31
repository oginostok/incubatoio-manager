import { useState } from "react";
import HomePage from "@/pages/HomePage";
import ProductionPage from "@/pages/ProductionPage";
import IncubatoioPage from "@/pages/IncubatoioPage";
import AllevamentiPage from "@/pages/AllevamentiPage";
import PulciniPage from "@/pages/PulciniPage";
import LetturaCodicePage from "@/pages/LetturaCodicePage";
import LoginPage from "@/pages/LoginPage";

type Page = "home" | "incubatoio" | "allevamenti" | "produzioni_uova" | "produzioni_pulcini" | "lettura_codice";

function App() {
  // Stato di autenticazione persistente con localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("isAuthenticated") === "true";
  });

  const [currentPage, setCurrentPage] = useState<Page>("home");

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    setIsAuthenticated(false);
  };

  // Se non autenticato, mostra la pagina di login
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Router per utenti autenticati
  switch (currentPage) {
    case "home":
      return <HomePage onNavigate={handleNavigate} onLogout={handleLogout} />;
    case "incubatoio":
      return <IncubatoioPage onNavigate={handleNavigate} />;
    case "allevamenti":
      return <AllevamentiPage onNavigate={handleNavigate} />;
    case "produzioni_uova":
      return <ProductionPage onNavigate={handleNavigate} />;
    case "produzioni_pulcini":
      return <PulciniPage onNavigate={handleNavigate} />;
    case "lettura_codice":
      return <LetturaCodicePage onNavigate={handleNavigate} />;
    default:
      return <HomePage onNavigate={handleNavigate} onLogout={handleLogout} />;
  }
}

export default App;
