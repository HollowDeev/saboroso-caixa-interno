
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EmployeeLoginProps {
  onEmployeeLogin: (employee: {
    id: string;
    name: string;
    owner_id: string;
  }) => void;
}

export const EmployeeLogin = ({ onEmployeeLogin }: EmployeeLoginProps) => {
  const [accessKey, setAccessKey] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.rpc('verify_employee_credentials', {
        p_access_key: accessKey,
        p_password: password
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Acesso de Funcionário
          </CardTitle>
          <p className="text-gray-600">
            Entre com sua chave de acesso e senha
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                  Entrar
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
