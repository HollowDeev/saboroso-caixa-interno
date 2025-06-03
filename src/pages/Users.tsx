import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Users as UsersIcon, Shield } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User } from '@/types';
import { EmployeeManagement } from '@/components/EmployeeManagement';

export const Users = () => {
  const { currentUser } = useApp();
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'Admin User',
      email: 'admin@restaurant.com',
      role: 'admin',
      createdAt: new Date()
    },
    {
      id: '2',
      name: 'João Silva',
      email: 'joao@restaurant.com',
      role: 'manager',
      createdAt: new Date()
    },
    {
      id: '3',
      name: 'Maria Santos',
      email: 'maria@restaurant.com',
      role: 'cashier',
      createdAt: new Date()
    }
  ]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'cashier' as User['role']
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'cashier'
    });
    setEditingUser(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
      setUsers(prev => prev.map(user => 
        user.id === editingUser.id 
          ? { ...user, ...formData } 
          : user
      ));
    } else {
      const newUser: User = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date()
      };
      setUsers(prev => [...prev, newUser]);
    }
    
    resetForm();
    setIsDialogOpen(false);
  };

  const openEditDialog = (user: User) => {
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role
    });
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const deleteUser = (userId: string) => {
    if (userId === currentUser?.id) {
      alert('Você não pode deletar seu próprio usuário');
      return;
    }
    if (confirm('Tem certeza que deseja deletar este usuário?')) {
      setUsers(prev => prev.filter(user => user.id !== userId));
    }
  };

  const getRoleColor = (role: User['role']) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'cashier': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleText = (role: User['role']) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'cashier': return 'Operador de Caixa';
      default: return role;
    }
  };

  const canEditUser = (user: User) => {
    if (currentUser?.role === 'admin') return true;
    if (currentUser?.role === 'manager' && user.role === 'cashier') return true;
    return false;
  };

  const roleStats = {
    admin: users.filter(u => u.role === 'admin').length,
    manager: users.filter(u => u.role === 'manager').length,
    cashier: users.filter(u => u.role === 'cashier').length
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-600">Gerencie usuários e permissões do sistema</p>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => window.open('/employee-login', '_blank')}
          >
            Acesso Funcionário
          </Button>
          
          {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="role">Nível de Acesso</Label>
                    <Select 
                      value={formData.role} 
                      onValueChange={(value: User['role']) => setFormData({...formData, role: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentUser?.role === 'admin' && (
                          <SelectItem value="admin">Administrador</SelectItem>
                        )}
                        {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                          <SelectItem value="manager">Gerente</SelectItem>
                        )}
                        <SelectItem value="cashier">Operador de Caixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Permissões por Nível:</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>Administrador:</strong> Acesso total ao sistema</p>
                      <p><strong>Gerente:</strong> Pode gerenciar produtos, vendas e operadores</p>
                      <p><strong>Operador:</strong> Pode criar comandas e registrar vendas</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                      {editingUser ? 'Atualizar' : 'Criar'} Usuário
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
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Administradores</p>
                <p className="text-2xl font-bold text-gray-900">{roleStats.admin}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-100">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gerentes</p>
                <p className="text-2xl font-bold text-gray-900">{roleStats.manager}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Operadores</p>
                <p className="text-2xl font-bold text-gray-900">{roleStats.cashier}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <UsersIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Usuários Principais</TabsTrigger>
          <TabsTrigger value="employees">Funcionários</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Nível de Acesso</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleColor(user.role)}>
                          {getRoleText(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {canEditUser(user) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {currentUser?.role === 'admin' && user.id !== currentUser.id && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteUser(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="mt-6">
          {currentUser && (
            <EmployeeManagement currentUserId={currentUser.id} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
