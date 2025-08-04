import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import DiscountsPage from "./pages/Discounts";
import { Orders } from "./pages/Orders";
import { StockManagement } from "./pages/StockManagement";
import { Sales } from "./pages/Sales";
import { Users } from "./pages/Users";
import { Settings } from "./pages/Settings";
import { ProfitCalculator } from "./pages/ProfitCalculator";
import { CashRegisters } from "./pages/CashRegisters";
import { Login } from "./pages/Login";
import NotFound from "./pages/NotFound";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import ExpenseAccount from "./pages/ExpenseAccount";

const queryClient = new QueryClient();

const App = () => {
  const [adminData, setAdminData] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
  } | null>(null);

  const [employeeData, setEmployeeData] = useState<{
    id: string;
    name: string;
    owner_id: string;
    role?: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  // Configurar autenticação persistente
  useEffect(() => {
    // Configurar cliente Supabase para sessão persistente de 12h
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Definir expiração da sessão para 12 horas
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 12);

        localStorage.setItem('supabase_session_expires', expiresAt.toISOString());
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('supabase_session_expires');
        setAdminData(null);
      }
    });

    // Verificar sessão existente ao inicializar
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      // Verificar se há dados de funcionário salvos
      const savedEmployeeData = localStorage.getItem('employee_data');
      if (savedEmployeeData) {
        const employee = JSON.parse(savedEmployeeData);
        setEmployeeData(employee);
        setLoading(false);
        return;
      }

      // Verificar se a sessão ainda é válida (12h)
      const sessionExpires = localStorage.getItem('supabase_session_expires');
      if (sessionExpires && new Date() > new Date(sessionExpires)) {
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Buscar dados do perfil do admin
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!profileError && profile) {
          setAdminData({
            id: session.user.id,
            name: profile.name || 'Admin',
            email: session.user.email || '',
            role: profile.role || 'admin'
          });
        }
      }
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = (admin: { id: string; name: string; email: string; role: string }) => {
    setAdminData(admin);
    setEmployeeData(null);
    localStorage.removeItem('employee_data');
  };

  const handleEmployeeLogin = (employee: { id: string; name: string; owner_id: string; role?: string }) => {
    setEmployeeData(employee);
    setAdminData(null);
    localStorage.setItem('employee_data', JSON.stringify(employee));
  };

  const handleAdminLogout = async () => {
    try {
      // Limpar dados locais primeiro
      localStorage.removeItem('supabase_session_expires');
      localStorage.removeItem('currentUser');
      setAdminData(null);
      
      // Tentar fazer logout no Supabase
      await supabase.auth.signOut();
      
      // Forçar reload da página para garantir limpeza completa
      window.location.href = '/';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Mesmo com erro, limpar os dados locais
      setAdminData(null);
      window.location.href = '/';
    }
  };

  const handleEmployeeLogout = async () => {
    // Limpar dados do funcionário
    localStorage.removeItem('employee_data');
    localStorage.removeItem('currentUser');
    setEmployeeData(null);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erro ao fazer logout do Supabase:', error);
    }
    // Forçar reload da página
    window.location.href = '/';
  };

  // Se está carregando, mostra loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  // Só renderiza o sistema se employeeData estiver presente
  if (employeeData) {
    const isEmployeeAdmin = employeeData.role === 'Admin';
    const isManager = employeeData.role === 'gerente' || employeeData.role === 'Gerente';
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppProvider>
            <BrowserRouter>
              <Routes>
                {/* Página de descontos SEM layout */}
                {isEmployeeAdmin && (
                  <Route path="/discounts" element={<DiscountsPage />} />
                )}
                {/* Demais páginas COM layout */}
                <Route
                  path="*"
                  element={
                    <Layout
                      adminData={adminData}
                      employeeData={employeeData}
                      onLogout={handleEmployeeLogout}
                      isEmployee={true}
                    >
                      <Routes>
                        <Route path="/" element={<Orders />} />
                        <Route path="/orders" element={<Orders />} />
                        <Route path="/sales" element={<Sales />} />
                        <Route path="/stock" element={<StockManagement />} />
                        <Route path="/expense-account" element={<ExpenseAccount />} />
                        {isEmployeeAdmin && (
                          <>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/users" element={<Users />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/calculator" element={<ProfitCalculator />} />
                            <Route path="/cash-registers" element={<CashRegisters />} />
                          </>
                        )}
                        {!isEmployeeAdmin && (
                          <Route path="*" element={<Navigate to="/orders" replace />} />
                        )}
                        {isEmployeeAdmin && (
                          <Route path="*" element={<NotFound />} />
                        )}
                      </Routes>
                    </Layout>
                  }
                />
              </Routes>
            </BrowserRouter>
          </AppProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Se não há perfil de funcionário, mostra sempre a tela de login de perfil
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route
              path="*"
              element={
                <Login
                  onAdminLogin={handleAdminLogin}
                  onEmployeeLogin={handleEmployeeLogin}
                />
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
