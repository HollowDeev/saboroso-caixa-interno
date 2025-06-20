import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
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

export const Header = ({ adminData, employeeData, onLogout, isEmployee }: HeaderProps) => {
  const currentUser = adminData || employeeData;

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-4">
      <div className="flex items-center justify-between w-full">
        {/* Esquerda: Logo */}
        <div className="flex items-center min-w-[120px] md:min-w-[300px]">
          <img src="/varanda.png" alt="Varanda Logo" className="h-10 w-auto" style={{ maxHeight: 40 }} />
        </div>
        {/* Centro: Título (apenas em md+) */}
        <div className="flex-1 flex justify-center">
          <h1 className="hidden md:block text-lg md:text-2xl font-bold text-gray-900 text-center select-none">
            Sistema de Gestão
          </h1>
        </div>
        {/* Direita: Usuário e logout */}
        <div className="flex items-center justify-end min-w-[120px]">
          {currentUser && (
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <span className="hidden md:inline text-xs md:text-sm text-gray-700 truncate max-w-[120px] md:max-w-none">
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
