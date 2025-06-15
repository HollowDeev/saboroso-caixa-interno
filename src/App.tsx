
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@/contexts/AppContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { Toaster } from '@/components/ui/toaster';

// Pages
import { Index } from '@/pages/Index';
import { Login } from '@/pages/Login';
import { EmployeeLogin } from '@/pages/EmployeeLogin';
import { Dashboard } from '@/pages/Dashboard';
import { Orders } from '@/pages/Orders';
import { Sales } from '@/pages/Sales';
import { StockManagement } from '@/pages/StockManagement';
import { Users } from '@/pages/Users';
import { Settings } from '@/pages/Settings';
import { ProfitCalculator } from '@/pages/ProfitCalculator';
import { CashRegisterHistory } from '@/pages/CashRegisterHistory';
import { NotFound } from '@/pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/employee-login" element={<EmployeeLogin />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/stock" element={<StockManagement />} />
            <Route path="/cash-history" element={<CashRegisterHistory />} />
            <Route path="/users" element={<Users />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/calculator" element={<ProfitCalculator />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
          <Toaster />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
