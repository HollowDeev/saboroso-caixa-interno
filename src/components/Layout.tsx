import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppContext } from '@/contexts/AppContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, BarChart3, DollarSign, Package, Plus, ClipboardList } from 'lucide-react';
import { DirectSaleModal } from './DirectSaleModal';
import { NewOrderModal } from './NewOrderModal';

interface LayoutProps {
  children: React.ReactNode;
  adminData?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
  employeeData?: {
    id: string;
    name: string;
    owner_id: string;
    role?: string;
  };
  onLogout?: () => void;
  isEmployee?: boolean;
}

export const Layout = ({ children, adminData, employeeData, onLogout, isEmployee }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser, isEmployee: appContextIsEmployee, logout } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

  // Modais de ação rápida
  const [openDirectSale, setOpenDirectSale] = useState(false);
  const [openNewOrder, setOpenNewOrder] = useState(false);

  // Determinar se é admin principal ou funcionário admin
  const isAdmin = (
    (adminData && adminData.role === 'admin') ||
    (employeeData && employeeData.role === 'Admin')
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        adminData={adminData}
        employeeData={employeeData}
        onLogout={onLogout}
        isEmployee={isEmployee}
      />

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar isEmployee={isEmployee} isAdmin={isAdmin} />
        </div>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black opacity-50"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative">
              <Sidebar onClose={() => setSidebarOpen(false)} isEmployee={isEmployee} isAdmin={isAdmin} />
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 min-h-screen">
          {children}
        </main>
      </div>

      {/* Barra de navegação inferior mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg z-50 h-16 flex items-center justify-between px-4">
        <div className="relative w-full flex items-center justify-between">
          {/* Botão de comanda (esquerda) */}
          {isEmployee && (
            <button
              className="bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center h-16 w-16 border-8 border-white focus:outline-none focus:ring-2 focus:ring-green-400 z-20"
              style={{ boxShadow: '0 4px 16px rgba(34,197,94,0.3)' }}
              onClick={() => setOpenNewOrder(true)}
              aria-label="Nova Comanda"
            >
              <ClipboardList className="h-9 w-9" />
            </button>
          )}
          {/* Ícone de acesso à página de comandas */}
          <Link to="/orders" className="flex flex-col items-center justify-center text-xs text-gray-700 mx-2">
            <ShoppingCart className="h-6 w-6 mb-1" />
            Comandas
          </Link>
          {/* Ícone de acesso à página de caixas */}
          <Link to="/cash-registers" className="flex flex-col items-center justify-center text-xs text-gray-700 mx-2">
            <DollarSign className="h-6 w-6 mb-1" />
            Caixas
          </Link>
          {/* Botão de venda direta (direita) */}
          {isEmployee && (
            <button
              className="bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center h-16 w-16 border-8 border-white focus:outline-none focus:ring-2 focus:ring-green-400 z-20"
              style={{ boxShadow: '0 4px 16px rgba(34,197,94,0.3)' }}
              onClick={() => setOpenDirectSale(true)}
              aria-label="Nova Venda Direta"
            >
              <Plus className="h-9 w-9" />
            </button>
          )}
        </div>
      </nav>
      {/* Modais de ação rápida */}
      <DirectSaleModal isOpen={openDirectSale} onClose={() => setOpenDirectSale(false)} />
      <NewOrderModal isOpen={openNewOrder} onClose={() => setOpenNewOrder(false)} />
    </div>
  );
};
