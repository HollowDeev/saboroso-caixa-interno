
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Orders } from "./pages/Orders";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/products" element={<div>Produtos - Em desenvolvimento</div>} />
              <Route path="/ingredients" element={<div>Ingredientes - Em desenvolvimento</div>} />
              <Route path="/sales" element={<div>Vendas - Em desenvolvimento</div>} />
              <Route path="/analytics" element={<div>Relatórios - Em desenvolvimento</div>} />
              <Route path="/users" element={<div>Usuários - Em desenvolvimento</div>} />
              <Route path="/settings" element={<div>Configurações - Em desenvolvimento</div>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
