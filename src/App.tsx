
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
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

  const handleEmployeeLogin = (employee: { id: string; name: string; owner_id: string }) => {
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

  const handleEmployeeLogout = () => {
    // Limpar dados do funcionário
    localStorage.removeItem('employee_data');
    localStorage.removeItem('currentUser');
    setEmployeeData(null);
    
    // Forçar reload da página
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const currentUser = adminData || employeeData;
  const isEmployee = !!employeeData;

  // Se há usuário logado (admin ou funcionário), mostrar interface principal
  if (currentUser) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppProvider>
            <BrowserRouter>
              <Layout 
                adminData={adminData} 
                employeeData={employeeData}
                onLogout={isEmployee ? handleEmployeeLogout : handleAdminLogout}
                isEmployee={isEmployee}
              >
                <Routes>
                  {/* Rotas disponíveis para funcionários */}
                  <Route path="/" element={<Orders />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/sales" element={<Sales />} />
                  
                  {/* Rotas apenas para admin */}
                  {!isEmployee && (
                    <>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/stock" element={<StockManagement />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/calculator" element={<ProfitCalculator />} />
                      <Route path="/cash-registers" element={<CashRegisters />} />
                    </>
                  )}
                  
                  {/* Redirecionar funcionários para comandas se tentarem acessar rotas restritas */}
                  {isEmployee && (
                    <Route path="*" element={<Navigate to="/orders" replace />} />
                  )}
                  
                  {/* Admin 404 */}
                  {!isEmployee && (
                    <Route path="*" element={<NotFound />} />
                  )}
                </Routes>
              </Layout>
            </BrowserRouter>
          </AppProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Se não há dados de login, mostrar página de login
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
