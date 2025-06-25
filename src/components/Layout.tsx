import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppContext } from '@/contexts/AppContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, BarChart3, DollarSign, Package, Plus } from 'lucide-react';

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
          {/* Esquerda */}
          <div className="flex w-1/2 justify-evenly">
            <Link to="/orders" className="flex flex-col items-center justify-center text-xs text-gray-700">
              <ShoppingCart className="h-6 w-6 mb-1" />
              Comandas
            </Link>
            <Link to="/sales" className="flex flex-col items-center justify-center text-xs text-gray-700">
              <BarChart3 className="h-6 w-6 mb-1" />
              Vendas
            </Link>
          </div>
          {/* Espaço central para o botão flutuante */}
          <div className="w-20 flex-shrink-0"></div>
          {/* Direita */}
          <div className="flex w-1/2 justify-evenly">
            <Link to="/cash-registers" className="flex flex-col items-center justify-center text-xs text-gray-700">
              <DollarSign className="h-6 w-6 mb-1" />
              Caixas
            </Link>
            <Link to="/stock" className="flex flex-col items-center justify-center text-xs text-gray-700">
              <Package className="h-6 w-6 mb-1" />
              Estoque
            </Link>
          </div>
          {/* Botão central flutuante */}
          <button
            className="absolute left-1/2 -translate-x-1/2 -top-7 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center h-20 w-20 border-4 border-white focus:outline-none focus:ring-2 focus:ring-green-400 z-20"
            style={{ boxShadow: '0 4px 16px rgba(34,197,94,0.3)' }}
            onClick={() => navigate('/orders?new=1')}
            aria-label="Nova Comanda"
          >
            <Plus className="h-10 w-10" />
          </button>
        </div>
      </nav>
    </div>
  );
};
