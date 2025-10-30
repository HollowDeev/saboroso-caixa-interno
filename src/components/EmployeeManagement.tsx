import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import ExpenseAccountItemsList from '@/components/expense-account/ExpenseAccountItemsList';
import AddExpenseItemModal from '@/components/expense-account/AddExpenseItemModal';
import AdvancesList from '@/components/expense-account/AdvancesList';
import AddAdvanceModal from '@/components/expense-account/AddAdvanceModal';
import { listAdvances, addPartialPayment, removePartialPayment } from '@/services/expenseAccountService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
type EmployeeProfile = Database['public']['Tables']['employee_profile']['Row'];

interface EmployeeManagementProps {
  currentUserId: string;
}

export const EmployeeManagement = ({ currentUserId }: EmployeeManagementProps) => {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    access_key: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  // Estado para visualizar/manipular conta de despesa por funcionário (para o dono)
  const [selectedEmployeeForAccount, setSelectedEmployeeForAccount] = useState<string | null>(null);
  const [empAccount, setEmpAccount] = useState<any | null>(null);
  const [empItems, setEmpItems] = useState<any[]>([]);
  const [empAdvances, setEmpAdvances] = useState<any[]>([]);
  const [empAccountLoading, setEmpAccountLoading] = useState(false);
  const [isAddItemModalOpenForAccount, setIsAddItemModalOpenForAccount] = useState(false);
  const [isAddAdvanceModalOpenForAccount, setIsAddAdvanceModalOpenForAccount] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [currentUserId]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employee_profile')
        .select('id, name, access_code, role, is_active, created_at')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar funcionários',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAccessKey = () => {
    const key = Math.random().toString(36).substring(2, 8).toUpperCase();
    setNewEmployee(prev => ({ ...prev, access_key: key }));
  };

  const generatePassword = () => {
    const password = Math.random().toString(36).substring(2, 10);
    setNewEmployee(prev => ({ ...prev, password }));
  };

  const createEmployee = async () => {
    try {
      if (!newEmployee.name || !newEmployee.access_key || !newEmployee.password) {
        toast({
          title: 'Erro',
          description: 'Todos os campos são obrigatórios',
          variant: 'destructive',
        });
        return;
      }
      // Verificar se a chave de acesso já existe
      const { data: existingEmployee } = await supabase
        .from('employee_profile')
        .select('access_code')
        .eq('access_code', newEmployee.access_key)
        .eq('user_id', currentUserId)
        .single();
      if (existingEmployee) {
        toast({
          title: 'Erro',
          description: 'Esta chave de acesso já está em uso',
          variant: 'destructive',
        });
        return;
      }
      // Inserir novo funcionário (hash da senha via SQL)
      const { error } = await supabase.rpc('create_employee_profile', {
        p_user_id: currentUserId,
        p_access_code: newEmployee.access_key,
        p_password: newEmployee.password,
        p_name: newEmployee.name,
        p_role: 'Funcionario'
      });
      if (error) throw error;
      toast({
        title: 'Sucesso',
        description: 'Funcionário criado com sucesso',
      });
      setNewEmployee({ name: '', access_key: '', password: '' });
      setIsModalOpen(false);
      fetchEmployees();
    } catch (error: unknown) {
      console.error('Erro ao criar funcionário:', error);
      toast({
        title: 'Erro',
        description: (typeof error === 'object' && error !== null && 'message' in error) ? (error as { message: string }).message : 'Erro ao criar funcionário',
        variant: 'destructive',
      });
    }
  };

  const toggleEmployeeStatus = async (employeeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('employee_profile')
        .update({ is_active: !currentStatus })
        .eq('id', employeeId)
        .eq('user_id', currentUserId);
      if (error) throw error;
      toast({
        title: 'Sucesso',
        description: `Funcionário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`,
      });
      fetchEmployees();
    } catch (error) {
      console.error('Erro ao alterar status do funcionário:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao alterar status do funcionário',
        variant: 'destructive',
      });
    }
  };

  const deleteEmployee = async (employeeId: string) => {
    try {
      const confirmed = window.confirm('Tem certeza que deseja excluir este funcionário?');
      if (!confirmed) return;
      const { error } = await supabase
        .from('employee_profile')
        .delete()
        .eq('id', employeeId)
        .eq('user_id', currentUserId);
      if (error) throw error;
      toast({
        title: 'Sucesso',
        description: 'Funcionário excluído com sucesso',
      });
      fetchEmployees();
    } catch (error) {
      console.error('Erro ao excluir funcionário:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir funcionário',
        variant: 'destructive',
      });
    }
  };

  // --- Conta de despesas (dono pode abrir aqui) ---
  const getOpenExpenseAccount = async (employeeProfileId: string) => {
    const { data, error } = await supabase
      .from('expense_accounts')
      .select('*')
      .eq('employee_profile_id', employeeProfileId)
      .eq('status', 'open')
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  };

  const getExpenseAccountItems = async (accountId: string) => {
    const { data, error } = await supabase
      .from('expense_account_items')
      .select('*')
      .eq('expense_account_id', accountId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  useEffect(() => {
    if (!selectedEmployeeForAccount) return;
    (async () => {
      setEmpAccountLoading(true);
      try {
        const acc = await getOpenExpenseAccount(selectedEmployeeForAccount);
        setEmpAccount(acc);
        if (acc) {
          const its = await getExpenseAccountItems(acc.id);
          setEmpItems(its);
          try {
            const adv = await listAdvances(acc.id);
            setEmpAdvances(adv || []);
          } catch (err) {
            setEmpAdvances([]);
          }
        } else {
          setEmpItems([]);
          setEmpAdvances([]);
        }
      } catch (err) {
        console.error('Erro ao carregar conta de despesa:', err);
        toast({ title: 'Erro', description: 'Erro ao carregar conta de despesa', variant: 'destructive' });
      } finally {
        setEmpAccountLoading(false);
      }
    })();
  }, [selectedEmployeeForAccount]);

  const handleAddPayment = async (amount: number) => {
    if (!empAccount?.id) return;
    try {
      await addPartialPayment(empAccount.id, amount);
      const acc = await getOpenExpenseAccount(selectedEmployeeForAccount!);
      setEmpAccount(acc);
    } catch (err: any) {
      throw new Error(err.message || 'Erro ao registrar pagamento');
    }
  };

  const handleRemovePayment = async (paymentId: string) => {
    if (!empAccount?.id) return;
    try {
      await removePartialPayment(empAccount.id, paymentId);
      const acc = await getOpenExpenseAccount(selectedEmployeeForAccount!);
      setEmpAccount(acc);
    } catch (err: any) {
      throw new Error(err.message || 'Erro ao remover pagamento');
    }
  };

  const handleOpenAccountForEmployee = async (employeeProfileId: string) => {
    if (!currentUserId) return;
    setEmpAccountLoading(true);
    try {
      const { data, error } = await supabase
        .from('expense_accounts')
        .insert({ owner_id: currentUserId, employee_profile_id: employeeProfileId, status: 'open' })
        .select()
        .single();
      if (error) throw error;
      setEmpAccount(data);
      setEmpItems([]);
    } catch (err: any) {
      console.error('Erro ao abrir conta:', err);
      toast({ title: 'Erro', description: 'Erro ao abrir conta', variant: 'destructive' });
    } finally {
      setEmpAccountLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando funcionários...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Gerenciar Funcionários</CardTitle>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-500 hover:bg-green-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Funcionário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Funcionário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="employeeName">Nome</Label>
                    <Input
                      id="employeeName"
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome do funcionário"
                    />
                  </div>
                  <div>
                    <Label htmlFor="accessKey">Chave de Acesso</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="accessKey"
                        value={newEmployee.access_key}
                        onChange={(e) => setNewEmployee(prev => ({ ...prev, access_key: e.target.value }))}
                        placeholder="Chave de acesso"
                      />
                      <Button type="button" onClick={generateAccessKey} variant="outline">
                        Gerar
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="password">Senha</Label>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={newEmployee.password}
                          onChange={(e) => setNewEmployee(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Senha"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button type="button" onClick={generatePassword} variant="outline">
                        Gerar
                      </Button>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={createEmployee} className="flex-1">
                      Criar Funcionário
                    </Button>
                    <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Nenhum funcionário cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Chave de Acesso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.filter(emp => emp.role !== 'Admin').map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell className="font-mono">{employee.access_code}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${employee.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {employee.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(employee.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant={employee.is_active ? "destructive" : "default"}
                          onClick={() => toggleEmployeeStatus(employee.id, employee.is_active)}
                        >
                          {employee.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteEmployee(employee.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {/* Botão para visualizar/gerenciar Conta de Despesa do funcionário (para o dono) */}
                        <Button
                          size="sm"
                          variant="default"
                          onClick={async () => {
                            setSelectedEmployeeForAccount(employee.id);
                          }}
                        >
                          Conta
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {/* Dialog global para gerenciar conta de despesa do funcionário selecionado */}
      <Dialog open={!!selectedEmployeeForAccount} onOpenChange={(open) => { if (!open) setSelectedEmployeeForAccount(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Conta de Despesa - {selectedEmployeeForAccount ? (employees.find(e => e.id === selectedEmployeeForAccount)?.name ?? '') : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {empAccountLoading && <div className="text-center text-gray-500 py-8">Carregando...</div>}
            {!empAccountLoading && !empAccount && (
              <div className="flex flex-col items-center py-6">
                <div className="text-lg mb-4">Nenhuma conta de despesas aberta.</div>
                <div className="flex gap-2">
                  <Button className="bg-green-600" onClick={() => handleOpenAccountForEmployee(selectedEmployeeForAccount!)}>Abrir Nova Conta de Despesa</Button>
                  <Button variant="outline" onClick={() => setSelectedEmployeeForAccount(null)}>Fechar</Button>
                </div>
              </div>
            )}
            {empAccount && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setIsAddItemModalOpenForAccount(true)}><Plus className="w-4 h-4" /> Adicionar Item</Button>
                  <Button className="bg-yellow-600 hover:bg-yellow-700" onClick={() => setIsAddAdvanceModalOpenForAccount(true)}><Plus className="w-4 h-4" /> Adicionar Vale</Button>
                </div>
                <ExpenseAccountItemsList
                  items={empItems}
                  accountId={empAccount.id}
                  partialPayments={(empAccount as any)?.partial_payments || []}
                  advances={empAdvances}
                  onAddPayment={handleAddPayment}
                  onRemovePayment={handleRemovePayment}
                  reload={async () => {
                    const its = await getExpenseAccountItems(empAccount.id);
                    setEmpItems(its);
                  }}
                />
                <div className="mt-4">
                  <AdvancesList accountId={empAccount.id} employeeId={selectedEmployeeForAccount} onChange={async () => {
                    const acc = await getOpenExpenseAccount(selectedEmployeeForAccount!);
                    setEmpAccount(acc);
                    try {
                      const adv = await listAdvances(acc.id);
                      setEmpAdvances(adv || []);
                    } catch (err) {
                      setEmpAdvances([]);
                    }
                  }} />
                </div>
                <AddExpenseItemModal
                  isOpen={isAddItemModalOpenForAccount}
                  onClose={() => setIsAddItemModalOpenForAccount(false)}
                  onAddItems={async (newItems) => {
                    if (!empAccount?.id) return;
                    const insertData = newItems.map((item: any) => ({
                      expense_account_id: empAccount.id,
                      product_id: item.product_id,
                      product_type: item.product_type,
                      quantity: item.quantity,
                      unit_price: item.unit_price,
                      product_name: item.product_name,
                    }));
                    const { error } = await supabase.from('expense_account_items').insert(insertData);
                    if (error) { toast({ title: 'Erro', description: 'Erro ao adicionar itens', variant: 'destructive' }); return; }
                    const its = await getExpenseAccountItems(empAccount.id);
                    setEmpItems(its);
                    setIsAddItemModalOpenForAccount(false);
                  }}
                />
                <AddAdvanceModal
                  isOpen={isAddAdvanceModalOpenForAccount}
                  onClose={() => setIsAddAdvanceModalOpenForAccount(false)}
                  accountId={empAccount.id}
                  employeeId={selectedEmployeeForAccount!}
                  onSaved={async () => {
                    const acc = await getOpenExpenseAccount(selectedEmployeeForAccount!);
                    setEmpAccount(acc);
                    try {
                      const adv = await listAdvances(acc.id);
                      setEmpAdvances(adv || []);
                    } catch (err) {
                      setEmpAdvances([]);
                    }
                    setIsAddAdvanceModalOpenForAccount(false);
                  }}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
