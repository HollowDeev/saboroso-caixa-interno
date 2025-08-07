import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users as UsersIcon } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { EmployeeManagement } from '@/components/EmployeeManagement';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AdminExpenseAccounts from '../components/expense-account/AdminExpenseAccounts';

export const Users = () => {
  const { currentUser } = useApp();
  const [tab, setTab] = useState('contas');
  const [totalEmployees, setTotalEmployees] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTotalEmployees = async () => {
      if (!currentUser?.id) return;

      try {
        // @ts-expect-error employee_profile não está tipada no objeto Database
        const { count, error } = await supabase
          .from('employee_profile')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUser.id)
          .eq('is_active', true)
          .eq('role', 'Funcionario');

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
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="contas">Gerenciar Contas</TabsTrigger>
          <TabsTrigger value="despesas">Gerenciar Despesas</TabsTrigger>
        </TabsList>
        <TabsContent value="contas">
          {currentUser?.id && (
            <EmployeeManagement currentUserId={currentUser.id} />
          )}
        </TabsContent>
        <TabsContent value="despesas">
          <AdminExpenseAccounts />
        </TabsContent>
      </Tabs>
    </div>
  );
};
