import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppContext } from '@/contexts/AppContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, BarChart3, DollarSign, Package, Plus, ClipboardList, Users } from 'lucide-react';
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
        <div className="relative w-full flex items-center justify-center gap-4">
          {isAdmin ? (
            <>
              <Link to="/orders" className="flex flex-col items-center justify-center text-xs text-gray-700 mx-3">
                <ShoppingCart className="h-4 w-4 mb-1" />
                Comandas
              </Link>
              <Link to="/sales" className="flex flex-col items-center justify-center text-xs text-gray-700 mx-3">
                <BarChart3 className="h-4 w-4 mb-1" />
                Vendas
              </Link>
              <Link to="/cash-registers" className="flex flex-col items-center justify-center text-xs text-gray-700 mx-3">
                <DollarSign className="h-4 w-4 mb-1" />
                Caixas
              </Link>
              <Link to="/users" className="flex flex-col items-center justify-center text-xs text-gray-700 mx-3">
                <Users className="h-4 w-4 mb-1" />
                Usuários
              </Link>
              <Link to="/stock" className="flex flex-col items-center justify-center text-xs text-gray-700 mx-3">
                <Package className="h-4 w-4 mb-1" />
                Estoque
              </Link>
            </>
          ) : (
            <>
              <button
                className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-full h-12 w-12"
                onClick={() => setOpenNewOrder(true)}
                aria-label="Nova Comanda"
              >
                <ClipboardList className="h-6 w-6" />
              </button>
              <div className="flex items-center gap-4">
                <Link to="/orders" className="flex flex-col items-center justify-center text-xs text-gray-700">
                  <ShoppingCart className="h-4 w-4 mb-1" />
                  Comandas
                </Link>
                <Link to="/sales" className="flex flex-col items-center justify-center text-xs text-gray-700">
                  <BarChart3 className="h-4 w-4 mb-1" />
                  Vendas
                </Link>
              </div>
              <button
                className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full h-12 w-12"
                onClick={() => setOpenDirectSale(true)}
                aria-label="Nova Venda Direta"
              >
                <Plus className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
      </nav>
      {/* Modais de ação rápida */}
      <DirectSaleModal isOpen={openDirectSale} onClose={() => setOpenDirectSale(false)} />
      <NewOrderModal isOpen={openNewOrder} onClose={() => setOpenNewOrder(false)} />
    </div>
  );
};
