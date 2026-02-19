import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/contexts/AppContext';
import { Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';


export const Settings = () => {
    const { currentUser, profileId, isEmployee } = useAppContext();
    const [openCommerceModal, setOpenCommerceModal] = useState(false);

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



    // Estados para visualização de senha
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showProfileCurrentPassword, setShowProfileCurrentPassword] = useState(false);
    const [showProfileNewPassword, setShowProfileNewPassword] = useState(false);
    const [showProfileConfirmPassword, setShowProfileConfirmPassword] = useState(false);

    const [openProfileModal, setOpenProfileModal] = useState(false);

    const [commerceEmail, setCommerceEmail] = useState(currentUser?.email || '');

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


            <div className="space-y-4">
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
            </div>
        </div>
    );
};
