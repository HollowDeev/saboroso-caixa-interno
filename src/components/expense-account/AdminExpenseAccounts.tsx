import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Plus, XCircle, Clipboard, AlertTriangle, CreditCard, X } from 'lucide-react';
import AddExpenseItemModal from './AddExpenseItemModal';
import { PartialPaymentModal } from './PartialPaymentModal';
import { contestExpenseAccountItem, addExpenseAccountItems, getExpenseAccountItems, addPartialPayment, calculateTotalPaid, calculateRemainingAmount, removePartialPayment } from '../../services/expenseAccountService';
import { Switch } from '../ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { processOrderItemsStockConsumption } from '../../utils/stockConsumption';

interface EmployeeAccountCard {
  accountId: string;
  employeeName: string;
}

interface ExpenseItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  created_at: string;
  contested: boolean;
  contest_message: string | null;
  removed_by_admin: boolean;
}

const pastelOrange = 'bg-[#FFF5E5]'; // laranja pastel claro
const borderOrange = 'border border-[#FFD9A0]'; // borda laranja clara

const AdminExpenseAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<EmployeeAccountCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EmployeeAccountCard | null>(null);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  // Estado local para itens desconsiderados
  const [ignoredItems, setIgnoredItems] = useState<{ [id: string]: boolean }>({});
  const [confirmClose, setConfirmClose] = useState(false);
  const [afterClose, setAfterClose] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [accountData, setAccountData] = useState<any>(null);
  const [removingPayment, setRemovingPayment] = useState<string | null>(null);
  const [confirmRemovePayment, setConfirmRemovePayment] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentUser } = useAppContext();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data: accountsData, error } = await supabase
        .from('expense_accounts')
        .select('id, employee_profile_id, employee_profile(name)')
        .eq('status', 'open');
      
      if (error) {
        console.error('Erro ao buscar contas:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar contas: ' + error.message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      const result: EmployeeAccountCard[] = (accountsData || []).map((acc: any) => ({
        accountId: acc.id,
        employeeName: acc.employee_profile?.name || 'Funcionário',
      }));
      setAccounts(result);
    } catch (err) {
      console.error('Erro geral ao buscar contas:', err);
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao carregar contas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (acc: EmployeeAccountCard) => {
    setSelected(acc);
    setModalOpen(true);
    setItemsLoading(true);
    
    try {
      // Buscar dados da conta (incluindo pagamentos parciais)
      const { data: accountData, error: accountError } = await supabase
        .from('expense_accounts')
        .select('*')
        .eq('id', acc.accountId)
        .single();
      
      if (accountError) {
        console.error('Erro ao buscar dados da conta:', accountError);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar dados da conta: ' + accountError.message,
          variant: 'destructive',
        });
      } else {
        setAccountData(accountData);
      }
      
      // Buscar todos os itens da conta ao abrir o modal
      const { data: itemsData, error } = await supabase
        .from('expense_account_items')
        .select('id, product_name, product_id, product_type, quantity, unit_price, created_at, contested, contest_message, removed_by_admin')
        .eq('expense_account_id', acc.accountId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar itens:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar itens da conta: ' + error.message,
          variant: 'destructive',
        });
      } else {
        setItems(itemsData || []);
      }
    } catch (err) {
      console.error('Erro geral:', err);
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao carregar dados',
        variant: 'destructive',
      });
    } finally {
      setItemsLoading(false);
    }
  };

  const reloadItems = async () => {
    if (!selected) return;
    setItemsLoading(true);
    
    // Recarregar dados da conta
    const { data: accountData } = await supabase
      .from('expense_accounts')
      .select('*')
      .eq('id', selected.accountId)
      .single();
    setAccountData(accountData);
    
    const { data: itemsData } = await supabase
      .from('expense_account_items')
      .select('id, product_name, product_id, product_type, quantity, unit_price, created_at, contested, contest_message, removed_by_admin')
      .eq('expense_account_id', selected.accountId)
      .order('created_at', { ascending: false });
    setItems(itemsData || []);
    setItemsLoading(false);
  };

  const handleRemoveItem = async (itemId: string) => {
    setRemoving(itemId);
    // Buscar o item completo para saber tipo, quantidade, nome, etc.
    const { data: item } = await supabase
      .from('expense_account_items')
      .select('id, product_id, product_type, quantity, unit_price, product_name')
      .eq('id', itemId)
      .single();
    if (item) {
      await processOrderItemsStockConsumption([
        {
          productId: item.product_id,
          quantity: -item.quantity, // negativo para devolver ao estoque
          product: {
            id: item.product_id,
            name: item.product_name,
            price: item.unit_price,
            available: true,
            product_type: item.product_type
          }
        }
      ], currentUser?.id || '', 'Remoção de item da conta de despesas');
    }
    await supabase
      .from('expense_account_items')
      .update({ removed_by_admin: true })
      .eq('id', itemId);
    await reloadItems();
    setRemoving(null);
  };

  const handleAddItems = async (newItems: any[]) => {
    if (!selected) return;
    if (!currentUser?.id) return;

    // Tenta consumir estoque de todos os itens
    const { processOrderItemsStockConsumption } = await import('../../utils/stockConsumption');
    const stockResult = await processOrderItemsStockConsumption(
      newItems.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        product: {
          id: item.product_id,
          name: item.product_name,
          price: item.unit_price,
          available: true,
          product_type: item.product_type
        }
      })),
      currentUser.id,
      'Consumo por conta de despesa'
    );

    // Se todos passaram, adiciona normalmente
    if (stockResult.success) {
      await addExpenseAccountItems(selected.accountId, newItems, currentUser.id);
      setAddModalOpen(false);
      await reloadItems();
      return;
    }

    // Se houver erro, filtra os itens que podem ser adicionados
    const errorMessages = stockResult.errors.join('\n');
    // Para saber quais itens falharam, busca pelo nome no erro
    const failedNames = stockResult.errors.map(err => {
      const match = err.match(/para ([^\.]+)\./);
      return match ? match[1] : null;
    }).filter(Boolean);
    const validItems = newItems.filter(item => !failedNames.includes(item.product_name));

    if (validItems.length > 0) {
      await addExpenseAccountItems(selected.accountId, validItems, currentUser.id);
      await reloadItems();
    }
    setAddModalOpen(false);
    toast({
      title: 'Erro ao adicionar itens',
      description: errorMessages,
      variant: 'destructive',
    });
  };

  // Função para copiar dados formatados para a área de transferência (pode ser usada no fechamento)
  const copyData = () => {
    if (!selected || !accountData) return;
    const filteredItems = items.filter(i => !i.removed_by_admin && !ignoredItems[i.id]);
    const itemsByDate = groupByDate(filteredItems);
    const totalItens = filteredItems.reduce((sum, i) => sum + i.quantity, 0);
    const valorTotalItens = filteredItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    const totalPago = calculateTotalPaid(accountData.partial_payments || []);
    const valorRestante = calculateRemainingAmount(valorTotalItens, totalPago);
    const nome = selected.employeeName;
    const dataAbertura = items.length > 0 ? format(new Date(items[items.length - 1].created_at), 'dd/MM/yyyy', { locale: ptBR }) : '-';
    const dataFechamento = format(new Date(), 'dd/MM/yyyy', { locale: ptBR });
    
    let texto = `== *Consumo do ${nome}* ==\n\n_Varanda Boteco_\n\nConta aberta: ${dataAbertura}\nConta fechada: ${dataFechamento}\n\n`;
    
    Object.entries(itemsByDate).forEach(([date, its]) => {
      texto += `📅 ${date}\n\n`;
      its.forEach(item => {
        texto += `${item.quantity}x ${item.product_name} – R$ ${item.unit_price.toFixed(2)}\n`;
      });
      texto += '\n';
    });
    
    texto += `🧾 Total de itens consumidos: ${totalItens}\n`;
    texto += `💰 Valor total dos itens: R$ ${valorTotalItens.toFixed(2)}\n`;
    
    // Adicionar seção de pagamentos parciais se houver
    if (accountData.partial_payments && accountData.partial_payments.length > 0) {
      texto += `\n💳 Pagamentos realizados:\n`;
      accountData.partial_payments.forEach((payment: any) => {
        const dataPagamento = format(new Date(payment.date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
        texto += `   • ${dataPagamento} - R$ ${payment.amount.toFixed(2)}\n`;
      });
      texto += `   Total pago: R$ ${totalPago.toFixed(2)}\n`;
    }
    
    texto += `\n💸 Valor restante a descontar: R$ ${valorRestante.toFixed(2)}\n\n=============================`;
    navigator.clipboard.writeText(texto);
  };

  const handleCloseAccount = async () => {
    setConfirmClose(true);
  };

  const confirmCloseAccount = async () => {
    // Copiar dados antes de fechar
    copyData();
    if (!selected) return;
    setClosing(true);
    await supabase
      .from('expense_accounts')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', selected.accountId);
    setClosing(false);
    setModalOpen(false);
    setConfirmClose(false);
    setAfterClose(true);
    await fetchAccounts();
  };

  // Função para alternar o estado de desconsiderar
  const toggleIgnore = (id: string) => {
    setIgnoredItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Função para adicionar pagamento parcial
  const handleAddPayment = async (amount: number) => {
    if (!selected?.accountId) return;
    try {
      await addPartialPayment(selected.accountId, amount);
      await reloadItems(); // Recarregar dados incluindo pagamentos
      toast({
        title: 'Pagamento registrado!',
        description: `Pagamento de R$ ${amount.toFixed(2)} foi registrado com sucesso.`,
      });
    } catch (err: any) {
      throw new Error(err.message || 'Erro ao registrar pagamento');
    }
  };

  // Função para confirmar remoção de pagamento
  const handleConfirmRemovePayment = (paymentId: string) => {
    setConfirmRemovePayment(paymentId);
  };

  // Função para remover pagamento parcial
  const handleRemovePayment = async (paymentId: string) => {
    if (!selected?.accountId) return;
    setRemovingPayment(paymentId);
    setConfirmRemovePayment(null);
    try {
      await removePartialPayment(selected.accountId, paymentId);
      await reloadItems(); // Recarregar dados incluindo pagamentos
      toast({
        title: 'Pagamento removido!',
        description: 'O pagamento foi removido com sucesso.',
      });
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao remover pagamento: ' + (err.message || 'Erro desconhecido'),
        variant: 'destructive',
      });
    } finally {
      setRemovingPayment(null);
    }
  };

  // Agrupar itens por data
  const groupByDate = (items: ExpenseItem[]) => {
    return items.reduce((acc, item) => {
      const dateObj = new Date(item.created_at);
      const date = format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
      const weekDay = format(dateObj, 'EEEE', { locale: ptBR });
      const label = `${weekDay.charAt(0).toUpperCase() + weekDay.slice(1)} - ${date}`;
      if (!acc[label]) acc[label] = [];
      acc[label].push(item);
      return acc;
    }, {} as Record<string, ExpenseItem[]>);
  };

  // Função para copiar dados formatados para a área de transferência
  const handleCopy = () => {
    if (!selected || !accountData) return;
    const filteredItems = items.filter(i => !i.removed_by_admin && !ignoredItems[i.id]);
    const itemsByDate = groupByDate(filteredItems);
    const totalItens = filteredItems.reduce((sum, i) => sum + i.quantity, 0);
    const valorTotalItens = filteredItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    const totalPago = calculateTotalPaid(accountData.partial_payments || []);
    const valorRestante = calculateRemainingAmount(valorTotalItens, totalPago);
    const nome = selected.employeeName;
    const dataAbertura = items.length > 0 ? format(new Date(items[items.length - 1].created_at), 'dd/MM/yyyy', { locale: ptBR }) : '-';
    const dataFechamento = format(new Date(), 'dd/MM/yyyy', { locale: ptBR });
    
    let texto = `== *Consumo do ${nome}* ==\n\n_Varanda Boteco_\n\nConta aberta: ${dataAbertura}\nConta fechada: ${dataFechamento}\n\n`;
    
    Object.entries(itemsByDate).forEach(([date, its]) => {
      texto += `📅 ${date}\n\n`;
      its.forEach(item => {
        texto += `${item.quantity}x ${item.product_name} – R$ ${item.unit_price.toFixed(2)}\n`;
      });
      texto += '\n';
    });
    
    texto += `🧾 Total de itens consumidos: ${totalItens}\n`;
    texto += `💰 Valor total dos itens: R$ ${valorTotalItens.toFixed(2)}\n`;
    
    // Adicionar seção de pagamentos parciais se houver
    if (accountData.partial_payments && accountData.partial_payments.length > 0) {
      texto += `\n💳 Pagamentos realizados:\n`;
      accountData.partial_payments.forEach((payment: any) => {
        const dataPagamento = format(new Date(payment.date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
        texto += `   • ${dataPagamento} - R$ ${payment.amount.toFixed(2)}\n`;
      });
      texto += `   Total pago: R$ ${totalPago.toFixed(2)}\n`;
    }
    
    texto += `\n💸 Valor restante a descontar: R$ ${valorRestante.toFixed(2)}\n\n=============================`;
    navigator.clipboard.writeText(texto);
    toast({ title: 'Dados copiados!', description: 'Os dados foram copiados para a área de transferência.' });
  };

  if (loading) return <div>Carregando contas de despesas...</div>;

  return (
    <>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(acc => (
          <Card key={acc.accountId} className={`${pastelOrange} ${borderOrange} flex flex-col items-center justify-center py-8`}>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-center">{acc.employeeName}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => handleView(acc)} className="bg-orange-500 hover:bg-orange-600 text-white w-full">Visualizar</Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Conta de Despesas de {selected?.employeeName}</DialogTitle>
          </DialogHeader>
          {itemsLoading ? (
            <div className="text-center py-8 flex-1 overflow-y-auto">Carregando itens...</div>
          ) : (
            <div className="relative pb-32 flex-1 overflow-y-auto"> {/* espaço extra para rodapé e resumo, rolagem interna */}
              
              {/* Resumo Financeiro */}
              {accountData && (
                <div className="mb-6 bg-white rounded shadow p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Resumo da Conta</h3>
                  {(() => {
                    const filteredItems = items.filter(i => !i.removed_by_admin && !ignoredItems[i.id]);
                    const totalItems = filteredItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
                    const totalPaid = calculateTotalPaid(accountData.partial_payments || []);
                    const remainingAmount = calculateRemainingAmount(totalItems, totalPaid);
                    
                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="text-sm text-gray-600 mb-1">Total dos Itens</div>
                            <div className="text-xl font-bold">R$ {totalItems.toFixed(2)}</div>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg">
                            <div className="text-sm text-green-600 mb-1">Total Pago</div>
                            <div className="text-xl font-bold text-green-600">R$ {totalPaid.toFixed(2)}</div>
                          </div>
                          <div className="bg-red-50 p-4 rounded-lg">
                            <div className="text-sm text-red-600 mb-1">Valor Restante</div>
                            <div className="text-xl font-bold text-red-600">R$ {remainingAmount.toFixed(2)}</div>
                          </div>
                        </div>
                        
                        {/* Lista de Pagamentos Parciais */}
                        {accountData.partial_payments && accountData.partial_payments.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Pagamentos Realizados:</h4>
                            <div className="space-y-1">
                              {accountData.partial_payments.map((payment: any, index: number) => (
                                <div key={payment.id || index} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                                  <div className="flex items-center gap-2">
                                    <span>{format(new Date(payment.date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                                    <span className="font-medium">R$ {payment.amount.toFixed(2)}</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleConfirmRemovePayment(payment.id)}
                                    disabled={removingPayment === payment.id}
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    {removingPayment === payment.id ? (
                                      <span className="animate-spin w-3 h-3 border border-red-500 border-t-transparent rounded-full inline-block"></span>
                                    ) : (
                                      <X className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Botão de Pagamento Parcial */}
                        {remainingAmount > 0 && (
                          <Button
                            onClick={() => setPaymentModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                          >
                            <CreditCard className="w-4 h-4" />
                            Registrar Pagamento Parcial
                          </Button>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
              
              {items.length === 0 ? (
                <div className="text-gray-500 text-center py-8">Nenhum item marcado nesta conta.</div>
              ) : (
                <>
                  {Object.entries(groupByDate(items.filter(i => !i.removed_by_admin))).map(([date, its]) => (
                    <div key={date} className="mb-6 bg-gray-100 rounded-lg p-3">
                      <h2 className="text-lg font-semibold mb-2">{date}</h2>
                      <ul className="divide-y">
                        {its.map(item => (
                          <li key={item.id} className={`flex flex-col md:flex-row md:items-center md:justify-between py-2 rounded-lg px-2 ${item.contested ? 'bg-[#e3f0fd] border border-blue-800' : 'border border-gray-200'}`}>
                            <div className="flex-1 flex flex-col gap-1">
                              <div className="flex flex-row items-center gap-2">
                                <span className={`font-medium ${item.contested ? 'text-[#17497a]' : ''}`}>{item.quantity}x {item.product_name}</span>
                                <span className={`font-medium ${item.contested ? 'text-[#17497a]' : ''}`}>– R$ {item.unit_price.toFixed(2)}</span>
                              </div>
                              {item.contested && (
                                <>
                                  <div className="w-full">
                                    <span className="inline-block bg-blue-800 text-white text-xs font-semibold rounded px-2 py-0.5 mb-1">Contestado</span>
                                  </div>
                                  <div className="w-full">
                                    <span className="block text-sm font-normal text-black bg-transparent w-full"><b>Mensagem:</b> {item.contest_message}</span>
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="flex flex-col md:items-end gap-2 mt-2 md:mt-0 md:ml-6">
                              <Button size="sm" variant="destructive" onClick={() => handleRemoveItem(item.id)} disabled={removing === item.id} className="flex items-center gap-1 w-full md:w-auto">
                                {removing === item.id ? (
                                  <span className="animate-spin mr-1 w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full inline-block"></span>
                                ) : (
                                  <Trash2 className="h-4 w-4 mr-1" />
                                )}
                                Remover
                              </Button>
                              <div className="flex items-center gap-2 mt-2">
                                <Switch checked={!!ignoredItems[item.id]} onCheckedChange={() => toggleIgnore(item.id)} />
                                <span className={`text-xs font-medium ${ignoredItems[item.id] ? 'text-green-600' : 'text-gray-500'}`}>Desconsiderar</span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {/* Resumo total */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <span className="font-medium text-gray-700">Total de itens consumidos: {items.filter(i => !i.removed_by_admin && !ignoredItems[i.id]).reduce((sum, i) => sum + i.quantity, 0)}</span>
                    <span className="font-medium text-gray-700">Valor total: R$ {items.filter(i => !i.removed_by_admin && !ignoredItems[i.id]).reduce((sum, i) => sum + i.quantity * i.unit_price, 0).toFixed(2)}</span>
                  </div>
                </>
              )}
              {/* Rodapé fixo com botões */}
              <div className="fixed left-0 right-0 bottom-0 z-50 bg-white border-t border-gray-200 flex flex-row justify-between p-4 max-w-2xl mx-auto rounded-b-lg">
                <div className="flex gap-2">
                  <Button onClick={() => setAddModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2">
                    <Plus className="w-4 h-4" />Adicionar Item
                  </Button>
                  <Button onClick={handleCopy} variant="outline" className="border border-gray-400 flex items-center gap-2 bg-white text-gray-700">
                    <Clipboard className="w-4 h-4" /> Copiar Dados
                  </Button>
                </div>
                <Button onClick={handleCloseAccount} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2" disabled={closing}>
                  {closing ? 'Fechando...' : 'Fechar Conta'}
                </Button>
              </div>
              <AddExpenseItemModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} onAddItems={handleAddItems} />
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Confirmação de fechamento */}
      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent className="max-w-md flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <div className="text-lg font-semibold mb-2">Tem certeza que deseja fechar a conta?</div>
          <div className="mb-4 text-gray-700">Ao fechar a comanda a mesma não poderá mais ser modificada e todas as novas despesas registradas pelo <b>{selected?.employeeName}</b> estarão na próxima conta aberta.<br /> <span className='font-bold text-red-600'>TEM CERTEZA?</span></div>
          <div className="flex gap-4 justify-center mt-2">
            <Button variant="outline" onClick={() => setConfirmClose(false)}>Cancelar</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={confirmCloseAccount}>Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Mensagem após fechamento */}
      <Dialog open={afterClose} onOpenChange={setAfterClose}>
        <DialogContent className="max-w-md flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <div className="text-lg font-semibold mb-2">Conta fechada e dados copiados!</div>
          <div className="mb-4 text-gray-700">O conteúdo foi copiado para a área de transferência. Utilize-o antes que outra coisa seja copiada no lugar.</div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white mt-2" onClick={() => setAfterClose(false)}>OK</Button>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Pagamento Parcial */}
      {accountData && selected && (
        <PartialPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onAddPayment={handleAddPayment}
          currentTotal={items.filter(i => !i.removed_by_admin && !ignoredItems[i.id]).reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)}
          totalPaid={calculateTotalPaid(accountData.partial_payments || [])}
          remainingAmount={calculateRemainingAmount(
            items.filter(i => !i.removed_by_admin && !ignoredItems[i.id]).reduce((sum, item) => sum + (item.unit_price * item.quantity), 0),
            calculateTotalPaid(accountData.partial_payments || [])
          )}
        />
      )}
      
      {/* Modal de Confirmação para Remover Pagamento */}
      <Dialog open={!!confirmRemovePayment} onOpenChange={() => setConfirmRemovePayment(null)}>
        <DialogContent className="max-w-md flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <div className="text-lg font-semibold mb-2">Remover Pagamento?</div>
          <div className="mb-4 text-gray-700">
            Tem certeza que deseja remover este pagamento? Esta ação não pode ser desfeita.
          </div>
          <div className="flex gap-4 justify-center mt-2">
            <Button variant="outline" onClick={() => setConfirmRemovePayment(null)}>
              Cancelar
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white" 
              onClick={() => confirmRemovePayment && handleRemovePayment(confirmRemovePayment)}
            >
              Remover
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminExpenseAccounts; 