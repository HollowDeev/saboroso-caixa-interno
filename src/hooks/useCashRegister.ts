
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

      const { data, error } = await supabase
        .from('cash_registers')
        .insert({
          owner_id: user.id,
          opening_amount: openingAmount,
          is_open: true
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentCashRegister(data);
      toast({
        title: "Caixa aberto com sucesso!",
        description: `Valor inicial: R$ ${openingAmount.toFixed(2)}`,
      });

      return data;
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
      toast({
        title: "Erro ao abrir caixa",
        description: "Tente novamente",
        variant: "destructive",
      });
      throw error;
    }
  };

  const closeCashRegister = async (closingAmount: number) => {
    try {
      if (!currentCashRegister) throw new Error('Nenhum caixa aberto');

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

      setCurrentCashRegister(null);
      toast({
        title: "Caixa fechado com sucesso!",
        description: `Valor final: R$ ${closingAmount.toFixed(2)}`,
      });
    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
      toast({
        title: "Erro ao fechar caixa",
        description: "Tente novamente",
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
