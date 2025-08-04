import React, { useState, useEffect } from 'react';
import ExpenseAccountItemsList from '../components/expense-account/ExpenseAccountItemsList';
import AddExpenseItemModal from '../components/expense-account/AddExpenseItemModal';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import { useExpenseAccount } from '../hooks/useExpenseAccount';
import { useApp } from '../contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import type { Database } from '@/integrations/supabase/types';

const WESLEY_ID = '6ea87c3b-730a-4c4e-8e72-86d659d917d7';

// Tipos auxiliares para evitar 'any'
type Employee = { id: string; name: string };
type AddItem = { product_id: string; product_type: string; quantity: number; unit_price: number; product_name: string };
type ExpenseAccount = Database['public']['Tables']['expense_accounts']['Row'] | null;
type ExpenseAccountItem = Database['public']['Tables']['expense_account_items']['Row'];

const ExpenseAccount: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { account, items, loading, error, openAccount, addItems, reload } = useExpenseAccount();
  const { currentUser } = useApp();
  const profileId = (currentUser as any)?.owner_id ? (localStorage.getItem('employee_data') ? JSON.parse(localStorage.getItem('employee_data')!).id : undefined) : currentUser?.id;
  console.log('ID do perfil (profileId):', profileId);

  // NOVO: Estado para tabs de funcionários
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [empAccount, setEmpAccount] = useState<ExpenseAccount>(null);
  const [empItems, setEmpItems] = useState<ExpenseAccountItem[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);

  // Funções auxiliares para buscar dados do funcionário
  const getOpenExpenseAccount = async (employeeProfileId: string): Promise<ExpenseAccount> => {
    const { data, error } = await supabase
      .from('expense_accounts')
      .select('*')
      .eq('employee_profile_id', employeeProfileId)
      .eq('status', 'open')
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  };

  const getExpenseAccountItems = async (accountId: string): Promise<ExpenseAccountItem[]> => {
    const { data, error } = await supabase
      .from('expense_account_items')
      .select('*')
      .eq('expense_account_id', accountId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const openExpenseAccount = async (ownerId: string, employeeProfileId: string): Promise<ExpenseAccount> => {
    const { data, error } = await supabase
      .from('expense_accounts')
      .insert({ owner_id: ownerId, employee_profile_id: employeeProfileId, status: 'open' })
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  const addExpenseAccountItems = async (accountId: string, items: ExpenseAccountItem[], userId: string) => {
    const insertData = items.map(item => ({
      expense_account_id: accountId,
      product_id: item.product_id,
      product_type: item.product_type,
      quantity: item.quantity,
      unit_price: item.unit_price,
      product_name: item.product_name,
    }));
    const { error } = await supabase
      .from('expense_account_items')
      .insert(insertData);
    if (error) throw error;
  };

  // Buscar todos os funcionários ativos se for o Wesley
  useEffect(() => {
    if (profileId === WESLEY_ID) {
      (async () => {
        const { data, error } = await supabase
          .from<any>('employee_profile')
          .select('id, name')
          .eq('is_active', true)
          .order('name');
        if (!error && data) {
          const employeesList = (data as { id: string; name: string }[]).map(emp => ({ id: emp.id, name: emp.name }));
          setEmployees(employeesList);
          // Seleciona sempre a tab do Wesley se ele estiver na lista
          const wesley = employeesList.find(emp => emp.id === WESLEY_ID);
          if (wesley) {
            setSelectedEmployeeId(WESLEY_ID);
          } else if (employeesList.length > 0) {
            setSelectedEmployeeId(employeesList[0].id);
          }
        }
      })();
    }
  }, [profileId]);

  // Buscar conta e itens do funcionário selecionado
  useEffect(() => {
    if (profileId === WESLEY_ID && selectedEmployeeId) {
      setEmpLoading(true);
      setEmpError(null);
      (async () => {
        try {
          const acc = await getOpenExpenseAccount(selectedEmployeeId);
          setEmpAccount(acc);
          if (acc) {
            const its = await getExpenseAccountItems(acc.id);
            setEmpItems(its);
          } else {
            setEmpItems([]);
          }
        } catch (err: any) {
          setEmpError(err.message || 'Erro ao carregar conta de despesas');
        } finally {
          setEmpLoading(false);
        }
      })();
    }
  }, [profileId, selectedEmployeeId]);

  // Função para adicionar itens na conta do funcionário selecionado
  const handleAddItemsForEmployee = async (newItems: AddItem[]) => {
    if (!empAccount?.id) return;
    setEmpLoading(true);
    try {
      const insertData = newItems.map(item => ({
        expense_account_id: empAccount.id,
        product_id: item.product_id,
        product_type: item.product_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        product_name: item.product_name,
      }));
      const { error } = await supabase
        .from('expense_account_items')
        .insert(insertData);
      if (error) throw error;
      const its = await getExpenseAccountItems(empAccount.id);
      setEmpItems(its);
    } catch (err: any) {
      setEmpError(err.message || 'Erro ao adicionar itens');
    } finally {
      setEmpLoading(false);
    }
  };

  // Função para abrir nova conta para funcionário selecionado
  const handleOpenAccountForEmployee = async () => {
    if (!currentUser?.id || !selectedEmployeeId) return;
    setEmpLoading(true);
    try {
      const acc = await openExpenseAccount(currentUser.id, selectedEmployeeId);
      setEmpAccount(acc);
      setEmpItems([]);
    } catch (err: any) {
      setEmpError(err.message || 'Erro ao abrir conta');
    } finally {
      setEmpLoading(false);
    }
  };

  // Se for o Wesley, mostrar tabs de funcionários
  if (profileId === WESLEY_ID) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Contas de Despesa dos Funcionários</h1>
        <Tabs value={selectedEmployeeId || ''} onValueChange={setSelectedEmployeeId}>
          <TabsList>
            {employees.map(emp => (
              <TabsTrigger key={emp.id} value={emp.id}>{emp.name}</TabsTrigger>
            ))}
          </TabsList>
          {employees.map(emp => (
            <TabsContent key={emp.id} value={emp.id}>
              {empLoading && selectedEmployeeId === emp.id && <div className="text-center text-gray-500 py-8">Carregando...</div>}
              {empError && selectedEmployeeId === emp.id && <div className="text-center text-red-500 py-8">{empError}</div>}
              {!empLoading && !empAccount && selectedEmployeeId === emp.id && (
                <div className="flex flex-col items-center py-12">
                  <div className="text-lg mb-4">Nenhuma conta de despesas aberta.</div>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={handleOpenAccountForEmployee}>
                    Abrir Nova Conta de Despesa
                  </Button>
                </div>
              )}
              {empAccount && selectedEmployeeId === emp.id && (
                <>
                  <Button
                    className="bg-orange-600 hover:bg-orange-700 flex items-center gap-2 mb-6"
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    <Plus className="w-4 h-4" /> Adicionar Item
                  </Button>
                  <ExpenseAccountItemsList items={empItems} reload={async () => {
                    const its = await getExpenseAccountItems(empAccount.id);
                    setEmpItems(its);
                  }} />
                  <AddExpenseItemModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onAddItems={handleAddItemsForEmployee}
                  />
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  // Funcionamento padrão para outros usuários
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Conta de Despesas</h1>
      </div>
      {account && (
        <Button
          className="bg-orange-600 hover:bg-orange-700 flex items-center gap-2 mb-6"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="w-4 h-4" /> Adicionar Item
        </Button>
      )}
      {loading && <div className="text-center text-gray-500 py-8">Carregando...</div>}
      {error && <div className="text-center text-red-500 py-8">{error}</div>}
      {!loading && !account && (
        <div className="flex flex-col items-center py-12">
          <div className="text-lg mb-4">Nenhuma conta de despesas aberta.</div>
          <Button className="bg-green-600 hover:bg-green-700" onClick={openAccount}>
            Abrir Nova Conta de Despesa
          </Button>
        </div>
      )}
      {account && (
        <ExpenseAccountItemsList items={items} reload={reload} />
      )}
      {/* Modal para adicionar item */}
      <AddExpenseItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddItems={addItems}
      />
    </div>
  );
};

export default ExpenseAccount; 