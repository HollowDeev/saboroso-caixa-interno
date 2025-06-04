import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChefHat, User, Users, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

interface LoginProps {
  onAdminLogin: (admin: { id: string; name: string; email: string; role: string }) => void;
  onEmployeeLogin: (employee: { id: string; name: string; owner_id: string }) => void;
}

export const Login = ({ onAdminLogin, onEmployeeLogin }: LoginProps) => {
  const [loginType, setLoginType] = useState<'admin' | 'employee'>('admin');

  // Admin login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Employee login states
  const [accessKey, setAccessKey] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  const navigate = useNavigate();

  // Verificar se já existe uma sessão ativa ao carregar
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Buscar dados do perfil do admin
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!profileError && profile) {
            onAdminLogin({
              id: session.user.id,
              name: profile.name || 'Admin',
              email: session.user.email || '',
              role: profile.role || 'admin'
            });
            return;
          }
        }
      } catch (err) {
        console.error('Erro ao verificar sessão existente:', err);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkExistingSession();
  }, [onAdminLogin]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) throw profileError;

        onAdminLogin({
          id: data.user.id,
          name: profile.name || 'Admin',
          email: data.user.email || '',
          role: profile.role || 'admin'
        });

        navigate('/');
      }
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      toast({
        title: 'Erro ao fazer login',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.rpc('verify_employee_credentials', {
        p_access_key: accessKey,
        p_password: employeePassword
      });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const employee = data[0];
        onEmployeeLogin({
          id: employee.employee_id,
          name: employee.employee_name,
          owner_id: employee.owner_id
        });
      } else {
        setError('Chave de acesso ou senha incorretos');
      }
    } catch (err) {
      console.error('Erro no login do funcionário:', err);
      setError('Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <ChefHat className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            VarandaOS
          </CardTitle>
          <p className="text-gray-600">
            Acesse sua conta
          </p>
        </CardHeader>

        <CardContent>
          {/* Login Type Selection */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <Button
              type="button"
              variant={loginType === 'admin' ? 'default' : 'outline'}
              onClick={() => setLoginType('admin')}
              className="flex items-center space-x-2"
            >
              <User className="h-4 w-4" />
              <span>Admin</span>
            </Button>
            <Button
              type="button"
              variant={loginType === 'employee' ? 'default' : 'outline'}
              onClick={() => setLoginType('employee')}
              className="flex items-center space-x-2"
            >
              <Users className="h-4 w-4" />
              <span>Funcionário</span>
            </Button>
          </div>

          {/* Admin Login Form */}
          {loginType === 'admin' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Entrando...
                  </div>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Entrar como Admin
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Employee Login Form */}
          {loginType === 'employee' && (
            <form onSubmit={handleEmployeeLogin} className="space-y-4">
              <div>
                <Label htmlFor="accessKey">Chave de Acesso</Label>
                <Input
                  id="accessKey"
                  type="text"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="Digite sua chave de acesso"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="employeePassword">Senha</Label>
                <Input
                  id="employeePassword"
                  type="password"
                  value={employeePassword}
                  onChange={(e) => setEmployeePassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Entrando...
                  </div>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Entrar como Funcionário
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
