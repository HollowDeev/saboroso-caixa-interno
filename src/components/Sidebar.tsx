import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  ShoppingCart,
  Package,
  BarChart3,
    BarChart2,
  Users,
  Settings,
  Calculator,
  X,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  onClose?: () => void;
  isEmployee?: boolean;
  isAdmin?: boolean;
  isManager?: boolean;
}

export const Sidebar = ({ onClose, isEmployee, isAdmin, isManager }: SidebarProps) => {
  const menuItems = [
    { icon: ShoppingCart, label: 'Comandas', path: '/orders' },
    { icon: BarChart3, label: 'Vendas', path: '/sales' },
    ...((isAdmin || !isEmployee) ? [
      { icon: DollarSign, label: 'Caixas', path: '/cash-registers' },
      { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: BarChart2, label: 'Faturamento', path: '/billing' },
      { icon: Package, label: 'Estoque', path: '/stock' },
      { icon: Users, label: 'Funcionários', path: '/users' },
      { icon: Calculator, label: 'Calculadora', path: '/calculator' },
      { icon: Settings, label: 'Configurações', path: '/settings' },
      { icon: DollarSign, label: 'Descontos', path: '/discounts' },
    ] : []),
    ...((!isAdmin && (isManager || isEmployee)) ? [
      { icon: Package, label: 'Estoque', path: '/stock' },
      // Adiciona Conta de Despesas apenas para funcionário (não admin)
      { icon: DollarSign, label: 'Conta de Despesas', path: '/expense-account' },
    ] : [])
  ];

  return (
    <aside className="bg-white w-64 min-h-screen border-r border-gray-200 fixed lg:relative z-40">
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h2 className="text-base md:text-lg font-semibold text-gray-900">Menu</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 touch-manipulation"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="space-y-1 md:space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center px-3 py-3 md:px-4 md:py-3 text-sm md:text-base font-medium rounded-lg transition-colors touch-manipulation',
                  'min-h-[48px]', // Ensure minimum touch target size
                  isActive
                    ? 'bg-orange-50 text-orange-600 border-r-2 border-orange-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100'
                )
              }
            >
              <item.icon className="mr-3 h-5 w-5 md:h-5 md:w-5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
};
