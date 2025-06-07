
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: string;
  name: string;
  access_key: string;
  is_active: boolean;
  created_at: string;
}

interface EmployeeManagementProps {
  currentUserId: string;
}

export const EmployeeManagement = ({ currentUserId }: EmployeeManagementProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    access_key: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmployees();
  }, [currentUserId]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('owner_id', currentUserId)
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
        .from('employees')
        .select('access_key')
        .eq('access_key', newEmployee.access_key)
        .single();

      if (existingEmployee) {
        toast({
          title: 'Erro',
          description: 'Esta chave de acesso já está em uso',
          variant: 'destructive',
        });
        return;
      }

      // Usar a função create_employee do Supabase
      const { data, error } = await supabase.rpc('create_employee', {
        p_owner_id: currentUserId,
        p_access_key: newEmployee.access_key,
        p_password: newEmployee.password,
        p_name: newEmployee.name
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Funcionário criado com sucesso',
      });

      setNewEmployee({ name: '', access_key: '', password: '' });
      setIsModalOpen(false);
      fetchEmployees();
    } catch (error: any) {
      console.error('Erro ao criar funcionário:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar funcionário',
        variant: 'destructive',
      });
    }
  };

  const toggleEmployeeStatus = async (employeeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: !currentStatus })
        .eq('id', employeeId)
        .eq('owner_id', currentUserId);

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
        .from('employees')
        .delete()
        .eq('id', employeeId)
        .eq('owner_id', currentUserId);

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
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell className="font-mono">{employee.access_key}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          employee.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
