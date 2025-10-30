import { useCallback, useEffect, useState } from 'react';
import { getOpenExpenseAccount, openExpenseAccount, getExpenseAccountItems, addExpenseAccountItems, listAdvances } from '../services/expenseAccountService';
import { useAppContext } from '../contexts/AppContext';

export function useExpenseAccount() {
  const { currentUser, profileId } = useAppContext();
  const [account, setAccount] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccountAndItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[useExpenseAccount] currentUser:', currentUser);
      console.log('[useExpenseAccount] profileId:', profileId);
      if (!profileId) throw new Error('Perfil do funcionário não encontrado');
      const acc = await getOpenExpenseAccount(profileId);
      setAccount(acc);
      if (acc) {
        const its = await getExpenseAccountItems(acc.id);
        setItems(its);
        try {
          const adv = await listAdvances(acc.id);
          // attach advances and advances_total to account object for convenience
          (acc as any).advances = adv;
          (acc as any).advances_total = adv.reduce((s: number, a: any) => s + (a.amount || 0), 0);
          setAccount(acc);
        } catch (err) {
          // ignore advances fetch error but log
          console.warn('[useExpenseAccount] Erro ao buscar vales:', err);
        }
      } else {
        setItems([]);
      }
    } catch (err: any) {
      console.error('[useExpenseAccount] Erro ao carregar conta de despesas:', err);
      setError(err.message || 'Erro ao carregar conta de despesas');
    } finally {
      setLoading(false);
    }
  }, [profileId, currentUser]);

  useEffect(() => {
    fetchAccountAndItems();
  }, [fetchAccountAndItems]);

  const handleOpenAccount = async () => {
    if (!currentUser?.id || !profileId) {
      console.log('[useExpenseAccount] handleOpenAccount: currentUser', currentUser, 'profileId', profileId);
      return;
    }
    setLoading(true);
    try {
      const acc = await openExpenseAccount(currentUser.id, profileId);
      setAccount(acc);
      setItems([]);
    } catch (err: any) {
      console.error('[useExpenseAccount] Erro ao abrir conta:', err);
      setError(err.message || 'Erro ao abrir conta');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItems = async (newItems: Array<{ product_id: string, product_type: string, quantity: number, unit_price: number, product_name: string }>) => {
    if (!account?.id) {
      console.log('[useExpenseAccount] handleAddItems: sem conta aberta', account);
      return;
    }
    setLoading(true);
    try {
      await addExpenseAccountItems(account.id, newItems, currentUser?.id);
      await fetchAccountAndItems();
    } catch (err: any) {
      console.error('[useExpenseAccount] Erro ao adicionar itens:', err);
      setError(err.message || 'Erro ao adicionar itens');
    } finally {
      setLoading(false);
    }
  };

  return {
    account,
    items,
    loading,
    error,
    openAccount: handleOpenAccount,
    addItems: handleAddItems,
    reload: fetchAccountAndItems,
  };
} 