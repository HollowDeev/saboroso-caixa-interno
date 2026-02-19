import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppContext } from '@/contexts/AppContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, BarChart3, DollarSign, Package, Plus, ClipboardList, Users, Menu, Pencil } from 'lucide-react';
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
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-[60] w-64 h-full bg-white shadow-2xl lg:hidden animate-in slide-in-from-left duration-300">
              <Sidebar onClose={() => setSidebarOpen(false)} isEmployee={isEmployee} isAdmin={isAdmin} />
            </div>
          </>
        )}

        <main className="flex-1 p-4 md:p-6 min-h-screen pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Barra de navegação inferior mobile */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-transparent flex items-center justify-center gap-8 z-50">
        <button
          className="flex items-center justify-center bg-green-600 active:bg-green-700 text-white rounded-full h-12 w-12 shadow-lg transition-transform active:scale-95"
          onClick={() => setOpenDirectSale(true)}
          aria-label="Nova Venda Direta"
        >
          <DollarSign className="h-6 w-6" />
        </button>

        <button
          className="flex items-center justify-center bg-orange-500 active:bg-orange-600 text-white rounded-full h-12 w-12 shadow-lg transition-transform active:scale-95"
          onClick={() => setOpenNewOrder(true)}
          aria-label="Nova Comanda"
        >
          <Pencil className="h-6 w-6" />
        </button>
      </nav>
      {/* Modais de ação rápida */}
      <DirectSaleModal isOpen={openDirectSale} onClose={() => setOpenDirectSale(false)} />
      <NewOrderModal isOpen={openNewOrder} onClose={() => setOpenNewOrder(false)} />
    </div>
  );
};
