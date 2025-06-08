
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
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-gray-900">
            Sistema de Gestão {isEmployee ? '(Funcionário)' : '(Admin)'}
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          {currentUser && (
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-700">{currentUser.name}</span>
              {onLogout && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className="text-gray-500 hover:text-gray-700"
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
