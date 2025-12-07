import React, { useState, useEffect } from 'react';
import ExpenseAccountItemsList from '../components/expense-account/ExpenseAccountItemsList';
import AddExpenseItemModal from '../components/expense-account/AddExpenseItemModal';
import AdvancesList from '../components/expense-account/AdvancesList';
import AddAdvanceModal from '../components/expense-account/AddAdvanceModal';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import { useExpenseAccount } from '../hooks/useExpenseAccount';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import type { Database } from '@/integrations/supabase/types';
import { addPartialPayment, removePartialPayment, listAdvances } from '../services/expenseAccountService';

const WESLEY_ID = '6ea87c3b-730a-4c4e-8e72-86d659d917d7';

// Tipos auxiliares para evitar 'any'
type Employee = { id: string; name: string };
type AddItem = { product_id: string; product_type: string; quantity: number; unit_price: number; product_name: string };
type ExpenseAccount = Database['public']['Tables']['expense_accounts']['Row'] | null;
type ExpenseAccountItem = Database['public']['Tables']['expense_account_items']['Row'];

const ExpenseAccount: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddAdvanceModalOpen, setIsAddAdvanceModalOpen] = useState(false);
  const { account, items, loading, error, openAccount, addItems, reload } = useExpenseAccount();
  const { currentUser, profileId } = useAppContext();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  // removed local profileId computation in favor of context-provided profileId
  // console.log('ID do perfil (profileId):', profileId);

  // NOVO: Estado para tabs de funcionários
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [empAccount, setEmpAccount] = useState<ExpenseAccount>(null);
  const [empItems, setEmpItems] = useState<ExpenseAccountItem[]>([]);
  const [empAdvances, setEmpAdvances] = useState<any[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);

  // DEBUG: logar usuário/conta para diagnosticar visibilidade do botão de 'Adicionar Vale'
  React.useEffect(() => {
    try {
      console.log('[debug][ExpenseAccount] currentUser:', currentUser);
      console.log('[debug][ExpenseAccount] profileId:', profileId);
      console.log('[debug][ExpenseAccount] empAccount.owner_id:', empAccount?.owner_id);
    } catch (e) {
      /* ignore */
    }
  }, [currentUser, profileId, empAccount]);

  // DEBUG PANEL: visible in non-production to help diagnose permission issues
  const DebugPanel: React.FC = () => {
    if (process.env.NODE_ENV === 'production') return null;
    return (
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-gray-800">
        <div className="font-semibold mb-1">Debug (dev only)</div>
        <div><b>currentUser.id:</b> {(currentUser as any)?.id ?? 'null'}</div>
        <div><b>currentUser.owner_id:</b> {(currentUser as any)?.owner_id ?? 'null'}</div>
        <div><b>currentUser.role:</b> {(currentUser as any)?.role ?? 'null'}</div>
        <div><b>profileId:</b> {profileId ?? 'null'}</div>
        <div><b>account.owner_id:</b> {(account as any)?.owner_id ?? 'null'}</div>
        <div><b>empAccount.owner_id:</b> {empAccount?.owner_id ?? 'null'}</div>
      </div>
    );
  };

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
            try {
              const adv = await listAdvances(acc.id);
              setEmpAdvances(adv || []);
            } catch (err) {
              console.warn('Erro ao buscar vales do funcionário:', err);
              setEmpAdvances([]);
            }
          } else {
            setEmpItems([]);
            setEmpAdvances([]);
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

  // Função para adicionar pagamento parcial (admin)
  const handleAddPayment = async (amount: number) => {
    if (!empAccount?.id) return;
    try {
      await addPartialPayment(empAccount.id, amount);
      // Recarregar dados da conta para atualizar os pagamentos
      const acc = await getOpenExpenseAccount(selectedEmployeeId!);
      setEmpAccount(acc);
    } catch (err: any) {
      throw new Error(err.message || 'Erro ao registrar pagamento');
    }
  };

  // Função para remover pagamento parcial (admin)
  const handleRemovePayment = async (paymentId: string) => {
    if (!empAccount?.id) return;
    try {
      await removePartialPayment(empAccount.id, paymentId);
      // Recarregar dados da conta para atualizar os pagamentos
      const acc = await getOpenExpenseAccount(selectedEmployeeId!);
      setEmpAccount(acc);
    } catch (err: any) {
      throw new Error(err.message || 'Erro ao remover pagamento');
    }
  };

  // Função para adicionar pagamento parcial (funcionário)
  const handleAddPaymentForEmployee = async (amount: number) => {
    if (!account?.id) return;
    try {
      await addPartialPayment(account.id, amount);
      // Recarregar dados da conta para atualizar os pagamentos
      await reload();
    } catch (err: any) {
      throw new Error(err.message || 'Erro ao registrar pagamento');
    }
  };

  // Função para remover pagamento parcial (funcionário)
  const handleRemovePaymentForEmployee = async (paymentId: string) => {
    if (!account?.id) return;
    try {
      await removePartialPayment(account.id, paymentId);
      // Recarregar dados da conta para atualizar os pagamentos
      await reload();
    } catch (err: any) {
      throw new Error(err.message || 'Erro ao remover pagamento');
    }
  };

  // Se for o Wesley, mostrar tabs de funcionários
  if (profileId === WESLEY_ID) {
    return (
      <div className="w-full max-w-5xl mx-auto p-3 sm:p-4 md:p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Contas de Despesa dos Funcionários</h1>
        <Tabs value={selectedEmployeeId || ''} onValueChange={setSelectedEmployeeId}>
          <TabsList className="w-full flex-wrap justify-start gap-1">
            {employees.map(emp => (
              <TabsTrigger key={emp.id} value={emp.id} className="text-xs sm:text-sm px-2 sm:px-4">{emp.name}</TabsTrigger>
            ))}
          </TabsList>
          {employees.map(emp => (
            <TabsContent key={emp.id} value={emp.id}>
              {empLoading && selectedEmployeeId === emp.id && <div className="text-center text-gray-500 py-6 sm:py-8">Carregando...</div>}
              {empError && selectedEmployeeId === emp.id && <div className="text-center text-red-500 py-6 sm:py-8 px-4">{empError}</div>}
              {!empLoading && !empAccount && selectedEmployeeId === emp.id && (
                <div className="flex flex-col items-center py-8 sm:py-12 px-4">
                  <div className="text-base sm:text-lg mb-4 text-center">Nenhuma conta de despesas aberta.</div>
                  <Button className="bg-green-600 hover:bg-green-700 w-full sm:w-auto" onClick={handleOpenAccountForEmployee}>
                    Abrir Nova Conta de Despesa
                  </Button>
                </div>
              )}
              {empAccount && selectedEmployeeId === emp.id && (
                <>
                  <div className="flex flex-col sm:flex-row gap-2 mb-4 sm:mb-6">
                    <Button
                      className="bg-orange-600 hover:bg-orange-700 flex items-center justify-center gap-2 w-full sm:w-auto"
                      onClick={() => setIsAddModalOpen(true)}
                    >
                      <Plus className="w-4 h-4" /> Adicionar Item
                    </Button>
                    {/* Botão para adicionar Vale (Wesley ou dono da conta) */}
                    {(profileId === WESLEY_ID || currentUser?.id === empAccount.owner_id || currentUser?.owner_id === empAccount.owner_id || currentUser?.role === 'admin') && (
                      <Button
                        className="bg-yellow-600 hover:bg-yellow-700 flex items-center justify-center gap-2 w-full sm:w-auto"
                        onClick={() => setIsAddAdvanceModalOpen(true)}
                        title="Adicionar Vale"
                      >
                        <Plus className="w-4 h-4" /> Adicionar Vale
                      </Button>
                    )}
                  </div>
                  <ExpenseAccountItemsList 
                    items={empItems} 
                    accountId={empAccount.id}
                    partialPayments={empAccount.partial_payments || []}
                    advances={empAdvances}
                    onAddPayment={handleAddPayment}
                    onRemovePayment={handleRemovePayment}
                    reload={async () => {
                      const its = await getExpenseAccountItems(empAccount.id);
                      setEmpItems(its);
                    }} 
                  />
                  {/* Lista de vales */}
                  <div className="mt-4">
                    <AdvancesList accountId={empAccount.id} employeeId={selectedEmployeeId} onChange={async () => {
                      const acc = await getOpenExpenseAccount(selectedEmployeeId);
                      setEmpAccount(acc);
                      try {
                        const adv = await listAdvances(acc.id);
                        setEmpAdvances(adv || []);
                      } catch (err) {
                        setEmpAdvances([]);
                      }
                    }} />
                  </div>
                  {/* Modal para adicionar vale */}
                  <AddAdvanceModal
                    isOpen={isAddAdvanceModalOpen}
                    onClose={() => setIsAddAdvanceModalOpen(false)}
                    accountId={empAccount.id}
                    employeeId={selectedEmployeeId || undefined}
                    onSaved={async () => {
                      const acc = await getOpenExpenseAccount(selectedEmployeeId);
                      setEmpAccount(acc);
                      try {
                        const adv = await listAdvances(acc.id);
                        setEmpAdvances(adv || []);
                      } catch (err) {
                        setEmpAdvances([]);
                      }
                    }}
                  />
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
    <div className="w-full max-w-5xl mx-auto p-3 sm:p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Conta de Despesas</h1>
      </div>
      {account && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4 sm:mb-6">
          <Button
            className="bg-orange-600 hover:bg-orange-700 flex items-center justify-center gap-2 w-full sm:w-auto"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4" /> Adicionar Item
          </Button>
          {/* Botão para adicionar Vale pelo dono da conta (admin) */}
          {(currentUser?.id === account.owner_id || currentUser?.owner_id === account.owner_id || currentUser?.role === 'admin') && (
            <Button
              className="bg-yellow-600 hover:bg-yellow-700 flex items-center justify-center gap-2 w-full sm:w-auto"
              onClick={() => setIsAddAdvanceModalOpen(true)}
              title="Adicionar Vale"
            >
              <Plus className="w-4 h-4" /> Adicionar Vale
            </Button>
          )}
        </div>
      )}
      {loading && <div className="text-center text-gray-500 py-6 sm:py-8">Carregando...</div>}
      {error && <div className="text-center text-red-500 py-6 sm:py-8 px-4">{error}</div>}
      {!loading && !account && (
        <div className="flex flex-col items-center py-8 sm:py-12 px-4">
          <div className="text-base sm:text-lg mb-4 text-center">Nenhuma conta de despesas aberta.</div>
          <Button className="bg-green-600 hover:bg-green-700 w-full sm:w-auto" onClick={openAccount}>
            Abrir Nova Conta de Despesa
          </Button>
        </div>
      )}
      {account && (
        <ExpenseAccountItemsList 
          items={items} 
          accountId={account.id}
          partialPayments={account.partial_payments || []}
          advances={account.advances || []}
          onAddPayment={handleAddPaymentForEmployee}
          onRemovePayment={handleRemovePaymentForEmployee}
          reload={reload} 
        />
      )}
      {account && (
        <div className="mt-4">
          <AdvancesList accountId={account.id} employeeId={profileId} onChange={async () => { await reload(); }} />
        </div>
      )}
      {/* Modal para adicionar item */}
      <AddExpenseItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddItems={addItems}
      />
      {/* Modal para adicionar vale (disponível ao dono da conta via botão acima) */}
      {account && (
        <AddAdvanceModal
          isOpen={isAddAdvanceModalOpen}
          onClose={() => setIsAddAdvanceModalOpen(false)}
          accountId={account.id}
          employeeId={(account as any).employee_profile_id}
          onSaved={async () => {
            await reload();
          }}
        />
      )}
    </div>
  );
};

export default ExpenseAccount; 