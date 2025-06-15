
import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, User } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  adminData?: {
    id: string;
    name: string;
    email: string;
  };
  employeeData?: {
    id: string;
    name: string;
    owner_id: string;
  };
  onLogout?: () => void;
  isEmployee?: boolean;
}

export const Header = ({ onMenuClick, adminData, employeeData, onLogout, isEmployee }: HeaderProps) => {
  const currentUser = adminData || employeeData;

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden mr-2 p-2 min-h-[44px] min-w-[44px] touch-manipulation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg md:text-xl font-semibold text-gray-900 truncate">
            <span className="hidden sm:inline">Sistema de Gestão</span>
            <span className="sm:hidden">Sistema</span>
            <span className="ml-1 text-sm md:text-base">
              {isEmployee ? '(Funcionário)' : '(Admin)'}
            </span>
          </h1>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          {currentUser && (
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 md:h-5 md:w-5 text-gray-500 flex-shrink-0" />
              <span className="text-xs md:text-sm text-gray-700 truncate max-w-[120px] md:max-w-none">
                {currentUser.name}
              </span>
              {onLogout && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className="text-gray-500 hover:text-gray-700 p-2 min-h-[44px] min-w-[44px] touch-manipulation"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
