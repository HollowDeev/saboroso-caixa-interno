
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Employee {
  id: string;
  access_key: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface EmployeeManagementProps {
  currentUserId: string;
}

export const EmployeeManagement = ({ currentUserId }: EmployeeManagementProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    accessKey: '',
    password: ''
  });
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, [currentUserId]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('owner_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Erro ao buscar funcionários:', err);
      setError('Erro ao carregar funcionários');
    } finally {
      setLoading(false);
    }
  };

  const generateAccessKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const { data, error } = await supabase.rpc('create_employee', {
        p_owner_id: currentUserId,
        p_access_key: formData.accessKey,
        p_password: formData.password,
        p_name: formData.name
      });

      if (error) throw error;

      setSuccess('Funcionário criado com sucesso!');
      setFormData({ name: '', accessKey: '', password: '' });
      setIsDialogOpen(false);
      fetchEmployees();
    } catch (err: any) {
      console.error('Erro ao criar funcionário:', err);
      if (err.message.includes('duplicate key')) {
        setError('Esta chave de acesso já está em uso. Tente outra.');
      } else {
        setError('Erro ao criar funcionário. Tente novamente.');
      }
    }
  };

  const toggleEmployeeStatus = async (employeeId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: !isActive })
        .eq('id', employeeId);

      if (error) throw error;
      
      fetchEmployees();
    } catch (err) {
      console.error('Erro ao atualizar funcionário:', err);
      setError('Erro ao atualizar status do funcionário');
    }
  };

  const deleteEmployee = async (employeeId: string) => {
    if (!confirm('Tem certeza que deseja excluir este funcionário?')) return;

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (error) throw error;
      
      fetchEmployees();
      setSuccess('Funcionário excluído com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir funcionário:', err);
      setError('Erro ao excluir funcionário');
    }
  };

  const togglePasswordVisibility = (employeeId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [employeeId]: !prev[employeeId]
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Gerenciar Funcionários</h3>
          <p className="text-gray-600">Crie e gerencie contas de acesso para funcionários</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              Novo Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Funcionário</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="employeeName">Nome do Funcionário</Label>
                <Input
                  id="employeeName"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Digite o nome completo"
                  required
                />
              </div>

              <div>
                <Label htmlFor="accessKey">Chave de Acesso</Label>
                <div className="flex space-x-2">
                  <Input
                    id="accessKey"
                    value={formData.accessKey}
                    onChange={(e) => setFormData({...formData, accessKey: e.target.value})}
                    placeholder="Ex: ABC12345"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData({...formData, accessKey: generateAccessKey()})}
                  >
                    Gerar
                  </Button>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Chave única que o funcionário usará para fazer login
                </p>
              </div>

              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Digite uma senha segura"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Mínimo de 6 caracteres
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-2">
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                  Criar Funcionário
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Funcionários</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhum funcionário cadastrado</p>
              <p className="text-sm text-gray-400">
                Clique em "Novo Funcionário" para criar o primeiro acesso
              </p>
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
                    <TableCell>
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                        {employee.access_key}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={employee.is_active}
                          onCheckedChange={() => toggleEmployeeStatus(employee.id, employee.is_active)}
                        />
                        <span className={employee.is_active ? 'text-green-600' : 'text-red-600'}>
                          {employee.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(employee.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
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

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Instruções para Funcionários:</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>1. Acesse o sistema usando a chave de acesso e senha fornecidas</p>
          <p>2. Funcionários podem criar e gerenciar comandas</p>
          <p>3. Funcionários podem visualizar e registrar vendas</p>
          <p>4. O acesso é restrito apenas às funcionalidades operacionais</p>
        </div>
      </div>
    </div>
  );
};
