import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChefHat, User, Users, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

interface LoginProps {
  onAdminLogin: (admin: { id: string; name: string; email: string; role: string }) => void;
  onEmployeeLogin: (employee: { id: string; name: string; owner_id: string; role: string }) => void;
}

export const Login = ({ onAdminLogin, onEmployeeLogin }: LoginProps) => {
  // Novo estado para controlar a etapa do login
  const [step, setStep] = useState<1 | 2>(1);
  const [userId, setUserId] = useState<string | null>(null);

  // Admin login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Employee login states
  const [accessKey, setAccessKey] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');
  const [showEmployeePassword, setShowEmployeePassword] = useState(false);

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

  // Nova função para autenticar o comércio
  const handleCommerceLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) {
        setUserId(data.user.id);
        setStep(2); // Avança para a etapa do funcionário
      }
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'message' in error) {
        setError((error as { message: string }).message || 'Erro ao autenticar comércio.');
      } else {
        setError('Erro ao autenticar comércio.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Nova função para autenticar funcionário
  const handleEmployeeProfileLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!userId) {
        setError('Usuário do comércio não autenticado.');
        return;
      }
      // Definir tipo para o retorno da função
      type EmployeeCredential = {
        employee_id: string;
        employee_name: string;
        owner_id: string;
        role: string;
      };
      // Verifica o funcionário usando a função RPC que já faz a verificação de senha
      const { data, error } = await supabase.rpc('verify_employee_credentials', {
        p_access_key: accessKey,
        p_password: employeePassword
      });
      // LOGS para debug
      console.log('Retorno verify_employee_credentials:', { data, error });
      if (error || !data || data.length === 0) {
        setError('Código de acesso ou senha incorretos.');
        return;
      }
      // Confirma se o funcionário pertence ao comércio autenticado
      const employee = (data as EmployeeCredential[]).find((emp) => emp.owner_id === userId);
      console.log('Funcionário encontrado para este comércio:', employee);
      if (!employee) {
        setError('Funcionário não pertence a este comércio.');
        return;
      }
      // Login bem-sucedido
      onEmployeeLogin({
        id: employee.employee_id,
        name: employee.employee_name,
        owner_id: employee.owner_id,
        role: employee.role
      });
      navigate('/');
    } catch (err: unknown) {
      console.error('Erro ao autenticar funcionário:', err);
      setError('Erro ao autenticar funcionário.');
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
            {step === 1 ? 'Acesse sua conta do comércio' : 'Acesse seu perfil de funcionário'}
          </p>
        </CardHeader>
        <CardContent key={step}>
          {step === 1 && (
            <form onSubmit={handleCommerceLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email do comércio</Label>
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
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    required
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
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
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></span>
                    Entrando...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Entrar
                  </>
                )}
              </Button>
            </form>
          )}
          {step === 2 && (
            <form onSubmit={handleEmployeeProfileLogin} className="space-y-4">
              <div>
                <Label htmlFor="accessKey">Código de Acesso</Label>
                <Input
                  id="accessKey"
                  type="text"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="Digite seu código de acesso"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="employeePassword">Senha</Label>
                <div className="relative">
                  <Input
                    id="employeePassword"
                    type={showEmployeePassword ? 'text' : 'password'}
                    value={employeePassword}
                    onChange={(e) => setEmployeePassword(e.target.value)}
                    placeholder="Digite sua senha"
                    required
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
                    onClick={() => setShowEmployeePassword((v) => !v)}
                  >
                    {showEmployeePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
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
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></span>
                    Entrando...
                  </>
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
