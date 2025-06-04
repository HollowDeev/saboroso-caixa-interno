
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users as UsersIcon } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { EmployeeManagement } from '@/components/EmployeeManagement';

export const Users = () => {
  const { currentUser } = useApp();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Funcionários</h1>
          <p className="text-gray-600">Gerencie funcionários e permissões do sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Funcionários</p>
                <p className="text-2xl font-bold text-gray-900">--</p>
                <p className="text-xs text-gray-500 mt-1">Carregando...</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-100">
                <UsersIcon className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {currentUser?.id && (
        <EmployeeManagement currentUserId={currentUser.id} />
      )}
    </div>
  );
};
