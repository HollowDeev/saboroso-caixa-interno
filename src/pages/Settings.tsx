import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/contexts/AppContext';
import { ServiceTax } from '@/types';
import { Pencil, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

export const Settings = () => {
    const { serviceTaxes, addServiceTax, updateServiceTax, deleteServiceTax, currentUser, profileId, isEmployee } = useApp();
    const [isAddTaxOpen, setIsAddTaxOpen] = useState(false);
    const [editingTax, setEditingTax] = useState<ServiceTax | null>(null);
    const [newTax, setNewTax] = useState({
        name: '',
        description: '',
        percentage: 0,
        is_active: true
    });

    // Estados para alteração de senha do comércio
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

    // Estados para alteração de senha do perfil admin
    const [profileCurrentPassword, setProfileCurrentPassword] = useState('');
    const [profileNewPassword, setProfileNewPassword] = useState('');
    const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
    const [profilePasswordLoading, setProfilePasswordLoading] = useState(false);
    const [profilePasswordMessage, setProfilePasswordMessage] = useState<string | null>(null);

    const [openCommerceModal, setOpenCommerceModal] = useState(false);
    const [openProfileModal, setOpenProfileModal] = useState(false);

    const [commerceEmail, setCommerceEmail] = useState(currentUser?.email || '');

    // Estados para visualização de senha
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showProfileCurrentPassword, setShowProfileCurrentPassword] = useState(false);
    const [showProfileNewPassword, setShowProfileNewPassword] = useState(false);
    const [showProfileConfirmPassword, setShowProfileConfirmPassword] = useState(false);

    const handleAddTax = () => {
        addServiceTax(newTax);
        setNewTax({
            name: '',
            description: '',
            percentage: 0,
            is_active: true
        });
        setIsAddTaxOpen(false);
    };

    const handleUpdateTax = () => {
        if (editingTax) {
            updateServiceTax(editingTax.id, newTax);
            setEditingTax(null);
            setNewTax({
                name: '',
                description: '',
                percentage: 0,
                is_active: true
            });
        }
    };

    const handleDeleteTax = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta taxa?')) {
            deleteServiceTax(id);
        }
    };

    const openEditTax = (tax: ServiceTax) => {
        setEditingTax(tax);
        setNewTax({
            name: tax.name,
            description: tax.description,
            percentage: tax.percentage,
            is_active: tax.is_active
        });
    };

    // Função para alterar senha do comércio (Supabase)
    const handleChangeCommercePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage(null);
        if (!commerceEmail) return setPasswordMessage('Informe o e-mail do comércio.');
        if (!currentPassword || !newPassword || !confirmPassword) return setPasswordMessage('Preencha todos os campos.');
        if (newPassword !== confirmPassword) return setPasswordMessage('As senhas não coincidem.');
        setPasswordLoading(true);
        try {
            // Reautenticar e alterar senha
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: commerceEmail,
                password: currentPassword
            });
            if (signInError) throw signInError;
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setPasswordMessage('Senha alterada com sucesso!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: unknown) {
            setPasswordMessage((err instanceof Error && err.message) ? err.message : 'Erro ao alterar senha.');
        } finally {
            setPasswordLoading(false);
        }
    };

    // Função para alterar senha do perfil admin (funcionário)
    const handleChangeProfilePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfilePasswordMessage(null);
        if (!profileId) return setProfilePasswordMessage('Perfil não encontrado.');
        if (!profileCurrentPassword || !profileNewPassword || !profileConfirmPassword) return setProfilePasswordMessage('Preencha todos os campos.');
        if (profileNewPassword !== profileConfirmPassword) return setProfilePasswordMessage('As senhas não coincidem.');
        setProfilePasswordLoading(true);
        try {
            // Chamar função RPC para alterar senha do perfil
            const { error } = await supabase.rpc('update_employee_password', {
                p_employee_id: profileId,
                p_current_password: profileCurrentPassword,
                p_new_password: profileNewPassword
            });
            if (error) throw error;
            setProfilePasswordMessage('Senha do perfil alterada com sucesso!');
            setProfileCurrentPassword('');
            setProfileNewPassword('');
            setProfileConfirmPassword('');
        } catch (err: unknown) {
            setProfilePasswordMessage((err instanceof Error && err.message) ? err.message : 'Erro ao alterar senha do perfil.');
        } finally {
            setProfilePasswordLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
                <p className="text-gray-600">Gerencie as configurações do sistema</p>
            </div>

            <Tabs defaultValue="account">
                <TabsList>
                    <TabsTrigger value="account">Conta</TabsTrigger>
                    <TabsTrigger value="taxes">Taxas de Serviço</TabsTrigger>
                </TabsList>

                <TabsContent value="account" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Senha do Comércio</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600 mb-4">Altere a senha de acesso do comércio (conta principal do sistema).</p>
                            <Dialog open={openCommerceModal} onOpenChange={setOpenCommerceModal}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">Trocar Senha do Comércio</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Alterar Senha do Comércio</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleChangeCommercePassword} className="space-y-2 mt-2">
                                        <Input
                                            type="email"
                                            placeholder="E-mail do comércio"
                                            value={commerceEmail}
                                            onChange={e => setCommerceEmail(e.target.value)}
                                            required
                                        />
                                        <div className="relative">
                                            <Input
                                                type={showCurrentPassword ? 'text' : 'password'}
                                                placeholder="Senha atual"
                                                value={currentPassword}
                                                onChange={e => setCurrentPassword(e.target.value)}
                                                required
                                            />
                                            <Button type="button" variant="ghost" size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1" onClick={() => setShowCurrentPassword(v => !v)}>
                                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                type={showNewPassword ? 'text' : 'password'}
                                                placeholder="Nova senha"
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                                required
                                            />
                                            <Button type="button" variant="ghost" size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1" onClick={() => setShowNewPassword(v => !v)}>
                                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                placeholder="Confirmar nova senha"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                required
                                            />
                                            <Button type="button" variant="ghost" size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1" onClick={() => setShowConfirmPassword(v => !v)}>
                                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                        <Button type="submit" disabled={passwordLoading} className="w-full">
                                            {passwordLoading ? 'Salvando...' : 'Alterar Senha'}
                                        </Button>
                                        {passwordMessage && <p className="text-sm text-red-600 mt-1">{passwordMessage}</p>}
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                    {isEmployee && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Senha do Seu Perfil</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-600 mb-4">Altere a senha do seu perfil de funcionário/admin.</p>
                                <Dialog open={openProfileModal} onOpenChange={setOpenProfileModal}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline">Trocar Senha do Perfil</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Alterar Senha do Perfil</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={handleChangeProfilePassword} className="space-y-2 mt-2">
                                            <div className="relative">
                                                <Input
                                                    type={showProfileCurrentPassword ? 'text' : 'password'}
                                                    placeholder="Senha atual do perfil"
                                                    value={profileCurrentPassword}
                                                    onChange={e => setProfileCurrentPassword(e.target.value)}
                                                    required
                                                />
                                                <Button type="button" variant="ghost" size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1" onClick={() => setShowProfileCurrentPassword(v => !v)}>
                                                    {showProfileCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                            <div className="relative">
                                                <Input
                                                    type={showProfileNewPassword ? 'text' : 'password'}
                                                    placeholder="Nova senha do perfil"
                                                    value={profileNewPassword}
                                                    onChange={e => setProfileNewPassword(e.target.value)}
                                                    required
                                                />
                                                <Button type="button" variant="ghost" size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1" onClick={() => setShowProfileNewPassword(v => !v)}>
                                                    {showProfileNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                            <div className="relative">
                                                <Input
                                                    type={showProfileConfirmPassword ? 'text' : 'password'}
                                                    placeholder="Confirmar nova senha do perfil"
                                                    value={profileConfirmPassword}
                                                    onChange={e => setProfileConfirmPassword(e.target.value)}
                                                    required
                                                />
                                                <Button type="button" variant="ghost" size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1" onClick={() => setShowProfileConfirmPassword(v => !v)}>
                                                    {showProfileConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                            <Button type="submit" disabled={profilePasswordLoading} className="w-full">
                                                {profilePasswordLoading ? 'Salvando...' : 'Alterar Senha do Perfil'}
                                            </Button>
                                            {profilePasswordMessage && <p className="text-sm text-red-600 mt-1">{profilePasswordMessage}</p>}
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="taxes" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Taxas de Serviço</CardTitle>
                            <Button onClick={() => setIsAddTaxOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nova Taxa
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {serviceTaxes.length === 0 ? (
                                    <p className="text-center text-gray-600">
                                        Nenhuma taxa cadastrada. Clique em "Nova Taxa" para começar.
                                    </p>
                                ) : (
                                    serviceTaxes.map((tax) => (
                                        <div key={tax.id} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="space-y-1">
                                                <h3 className="font-medium">{tax.name}</h3>
                                                <p className="text-sm text-gray-600">{tax.description}</p>
                                                <p className="text-sm font-medium">{tax.percentage}%</p>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        checked={tax.is_active}
                                                        onCheckedChange={(checked) => updateServiceTax(tax.id, { is_active: checked })}
                                                    />
                                                    <span className="text-sm text-gray-600">
                                                        {tax.is_active ? 'Ativa' : 'Inativa'}
                                                    </span>
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => openEditTax(tax)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteTax(tax.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isAddTaxOpen || !!editingTax} onOpenChange={() => {
                if (isAddTaxOpen) setIsAddTaxOpen(false);
                if (editingTax) setEditingTax(null);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingTax ? 'Editar Taxa' : 'Nova Taxa'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="taxName">Nome da Taxa</Label>
                            <Input
                                id="taxName"
                                value={newTax.name}
                                onChange={(e) => setNewTax({ ...newTax, name: e.target.value })}
                                placeholder="Ex: Taxa de Serviço"
                            />
                        </div>
                        <div>
                            <Label htmlFor="taxDescription">Descrição</Label>
                            <Textarea
                                id="taxDescription"
                                value={newTax.description}
                                onChange={(e) => setNewTax({ ...newTax, description: e.target.value })}
                                placeholder="Descreva o propósito desta taxa"
                            />
                        </div>
                        <div>
                            <Label htmlFor="taxPercentage">Porcentagem (%)</Label>
                            <Input
                                id="taxPercentage"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={newTax.percentage}
                                onChange={(e) => setNewTax({ ...newTax, percentage: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="taxActive"
                                checked={newTax.is_active}
                                onCheckedChange={(checked) => setNewTax({ ...newTax, is_active: checked })}
                            />
                            <Label htmlFor="taxActive">Taxa Ativa</Label>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => {
                                setIsAddTaxOpen(false);
                                setEditingTax(null);
                                setNewTax({
                                    name: '',
                                    description: '',
                                    percentage: 0,
                                    is_active: true
                                });
                            }}>
                                Cancelar
                            </Button>
                            <Button onClick={editingTax ? handleUpdateTax : handleAddTax}>
                                {editingTax ? 'Salvar' : 'Adicionar'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
