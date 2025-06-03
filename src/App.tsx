
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
import { EmployeeLogin } from "./pages/EmployeeLogin";
import { EmployeeOrders } from "./pages/EmployeeOrders";
import { EmployeeSales } from "./pages/EmployeeSales";
import { EmployeeLayout } from "./components/EmployeeLayout";
import NotFound from "./pages/NotFound";
import { useState } from "react";

const queryClient = new QueryClient();

const App = () => {
  const [employeeData, setEmployeeData] = useState<{
    id: string;
    name: string;
    owner_id: string;
  } | null>(null);

  const handleEmployeeLogin = (employee: { id: string; name: string; owner_id: string }) => {
    setEmployeeData(employee);
  };

  const handleEmployeeLogout = () => {
    setEmployeeData(null);
  };

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

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/employee-login" element={<EmployeeLogin onEmployeeLogin={handleEmployeeLogin} />} />
              <Route path="/*" element={
                <Layout>
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
              } />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
