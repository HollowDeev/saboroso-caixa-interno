import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users as UsersIcon } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { EmployeeManagement } from '@/components/EmployeeManagement';
import { supabase } from '@/integrations/supabase/client';

export const Users = () => {
  const { currentUser } = useApp();
  const [totalEmployees, setTotalEmployees] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTotalEmployees = async () => {
      if (!currentUser?.id) return;

      try {
        const { count, error } = await supabase
          .from('employee_profile')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUser.id)
          .eq('is_active', true);

        if (error) throw error;

        setTotalEmployees(count || 0);
      } catch (error) {
        console.error('Erro ao buscar total de funcionários:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTotalEmployees();
  }, [currentUser?.id]);

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
                {loading ? (
                  <>
                    <p className="text-2xl font-bold text-gray-900">--</p>
                    <p className="text-xs text-gray-500 mt-1">Carregando...</p>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
                )}
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
