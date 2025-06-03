
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  BarChart3,
  Users,
  Settings,
  ChefHat,
  Package2,
  X,
  Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface SidebarProps {
  onClose?: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Comandas', href: '/orders', icon: Receipt },
  { name: 'Produtos', href: '/products', icon: Package },
  { name: 'Ingredientes', href: '/ingredients', icon: ChefHat },
  { name: 'Estoque', href: '/stock', icon: Package2 },
  { name: 'Vendas', href: '/sales', icon: ShoppingCart },
  { name: 'Calculadora', href: '/calculator', icon: Calculator },
  { name: 'Relatórios', href: '/analytics', icon: BarChart3 },
  { name: 'Funcionários', href: '/users', icon: Users },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export const Sidebar = ({ onClose }: SidebarProps) => {
  return (
    <div className="flex h-full w-[280px] flex-col bg-white border-r border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <div className="flex items-center">
          <ChefHat className="h-8 w-8 text-orange-500" />
          <span className="ml-2 text-xl font-bold text-gray-900">VarandaOS</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )
            }
          >
            <item.icon className="h-5 w-5 mr-3" />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
