

import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Users, 
  Settings, 
  Calculator,
  X,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  onClose?: () => void;
  isEmployee?: boolean;
}

export const Sidebar = ({ onClose, isEmployee }: SidebarProps) => {
  const menuItems = [
    { icon: ShoppingCart, label: 'Comandas', path: '/orders' },
    { icon: BarChart3, label: 'Vendas', path: '/sales' },
    // Admin only items
    ...(!isEmployee ? [
      { icon: Home, label: 'Dashboard', path: '/dashboard' },
      { icon: Package, label: 'Estoque', path: '/stock' },
      { icon: History, label: 'Histórico de Caixas', path: '/cash-history' },
      { icon: Users, label: 'Usuários', path: '/users' },
      { icon: Calculator, label: 'Calculadora', path: '/calculator' },
      { icon: Settings, label: 'Configurações', path: '/settings' },
    ] : [])
  ];

  return (
    <aside className="bg-white w-64 min-h-screen border-r border-gray-200 fixed lg:relative z-40">
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-orange-50 text-orange-600 border-r-2 border-orange-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
};

