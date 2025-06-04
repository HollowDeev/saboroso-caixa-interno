
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CashRegister } from '@/types';
import { useToast } from '@/hooks/use-toast';

export const useCashRegister = () => {
  const [currentCashRegister, setCurrentCashRegister] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const checkOpenCashRegister = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      console.log('Verificando caixa aberto para o usuário:', user.id);

      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_open', true)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar caixa aberto:', error);
        return;
      }

      console.log('Caixa encontrado:', data);
      setCurrentCashRegister(data || null);
    } catch (error) {
      console.error('Erro ao verificar caixa:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCashRegister = async (openingAmount: number = 0) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      console.log('Abrindo caixa para o usuário:', user.id, 'com valor:', openingAmount);

      // Verificar se já existe um caixa aberto
      const { data: existingCash } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_open', true)
        .maybeSingle();

      if (existingCash) {
        throw new Error('Já existe um caixa aberto. Feche-o antes de abrir um novo.');
      }

      const { data, error } = await supabase
        .from('cash_registers')
        .insert({
          owner_id: user.id,
          opening_amount: openingAmount,
          total_sales: 0,
          total_orders: 0,
          is_open: true
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Caixa aberto com sucesso:', data);
      setCurrentCashRegister(data);
      toast({
        title: "Caixa aberto com sucesso!",
        description: `Valor inicial: R$ ${openingAmount.toFixed(2)}`,
      });

      return data;
    } catch (error: any) {
      console.error('Erro ao abrir caixa:', error);
      toast({
        title: "Erro ao abrir caixa",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
      throw error;
    }
  };

  const closeCashRegister = async (closingAmount: number) => {
    try {
      if (!currentCashRegister) throw new Error('Nenhum caixa aberto');

      console.log('Fechando caixa:', currentCashRegister.id, 'com valor:', closingAmount);

      const { error } = await supabase
        .from('cash_registers')
        .update({
          closed_at: new Date().toISOString(),
          closing_amount: closingAmount,
          is_open: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentCashRegister.id);

      if (error) throw error;

      console.log('Caixa fechado com sucesso');
      setCurrentCashRegister(null);
      toast({
        title: "Caixa fechado com sucesso!",
        description: `Valor final: R$ ${closingAmount.toFixed(2)}`,
      });
    } catch (error: any) {
      console.error('Erro ao fechar caixa:', error);
      toast({
        title: "Erro ao fechar caixa",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    checkOpenCashRegister();
  }, []);

  return {
    currentCashRegister,
    loading,
    openCashRegister,
    closeCashRegister,
    refreshCashRegister: checkOpenCashRegister
  };
};
