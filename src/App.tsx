
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Orders } from "./pages/Orders";
import { Products } from "./pages/Products";
import { Ingredients } from "./pages/Ingredients";
import { StockManagement } from "./pages/StockManagement";
import { Sales } from "./pages/Sales";
import { Users } from "./pages/Users";
import { Settings } from "./pages/Settings";
import { ProfitCalculator } from "./pages/ProfitCalculator";
import { Login } from "./pages/Login";
import { EmployeeOrders } from "./pages/EmployeeOrders";
import { EmployeeSales } from "./pages/EmployeeSales";
import { EmployeeLayout } from "./components/EmployeeLayout";
import NotFound from "./pages/NotFound";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const App = () => {
  const [adminData, setAdminData] = useState<{
    id: string;
    name: string;
    email: string;
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
            email: session.user.email || ''
          });
        }
      }
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = (admin: { id: string; name: string; email: string }) => {
    setAdminData(admin);
    setEmployeeData(null);
  };

  const handleEmployeeLogin = (employee: { id: string; name: string; owner_id: string }) => {
    setEmployeeData(employee);
    setAdminData(null);
  };

  const handleAdminLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('supabase_session_expires');
      setAdminData(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setAdminData(null);
    }
  };

  const handleEmployeeLogout = () => {
    setEmployeeData(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  // Se há dados de funcionário, mostrar interface de funcionário
  if (employeeData) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppProvider>
            <BrowserRouter>
              <EmployeeLayout employee={employeeData} onLogout={handleEmployeeLogout}>
                <Routes>
                  <Route path="/" element={<EmployeeOrders />} />
                  <Route path="/employee/orders" element={<EmployeeOrders />} />
                  <Route path="/employee/sales" element={<EmployeeSales />} />
                  <Route path="*" element={<EmployeeOrders />} />
                </Routes>
              </EmployeeLayout>
            </BrowserRouter>
          </AppProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Se há dados de admin, mostrar interface admin
  if (adminData) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppProvider>
            <BrowserRouter>
              <Layout adminData={adminData} onLogout={handleAdminLogout}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/ingredients" element={<Ingredients />} />
                  <Route path="/stock" element={<StockManagement />} />
                  <Route path="/sales" element={<Sales />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/calculator" element={<ProfitCalculator />} />
                  <Route path="*" element={<NotFound />} />
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
