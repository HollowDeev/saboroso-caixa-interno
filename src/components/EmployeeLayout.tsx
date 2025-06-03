
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Receipt, ShoppingCart, ChefHat, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EmployeeLayoutProps {
  children: React.ReactNode;
  employee: {
    id: string;
    name: string;
    owner_id: string;
  };
  onLogout: () => void;
}

const employeeMenuItems = [
  {
    name: 'Comandas',
    href: '/employee/orders',
    icon: Receipt
  },
  {
    name: 'Vendas',
    href: '/employee/sales',
    icon: ShoppingCart
  }
];

export const EmployeeLayout = ({ children, employee, onLogout }: EmployeeLayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Employee Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg md:text-2xl font-semibold text-gray-900 truncate">Caixa - Funcionário</h1>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium hidden md:inline">{employee.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                {employee.name}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex">
        {/* Employee Sidebar */}
        <div className="flex h-full w-[280px] flex-col bg-white border-r border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center">
              <ChefHat className="h-8 w-8 text-orange-500" />
              <span className="ml-2 text-xl font-bold text-gray-900">VarandaOS</span>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {employeeMenuItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
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

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
