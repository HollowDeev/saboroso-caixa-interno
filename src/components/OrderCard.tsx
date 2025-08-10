import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Plus, User, Hash, CreditCard, X, Printer, AlertTriangle, Search, Trash2, Edit, MoreVertical, AlertTriangle as AlertTriangleIcon } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { Order, Product, ExternalProduct, PaymentMethod, OrderItem } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { getOpenExpenseAccount, openExpenseAccount, addExpenseAccountItems, getExpenseAccountItems, contestExpenseAccountItem } from '@/services/expenseAccountService';
import { removeItemFromOrder } from '@/services/orderService';
// toast is provided via useToast below
import { useToast } from '@/components/ui/use-toast';

import { OrderReceiptPrint } from './OrderReceiptPrint';
import { useActiveDiscounts } from '@/hooks/useActiveDiscounts';

interface OrderCardProps {
  order: Order;
}

interface EmployeeProfile {
  id: string;
  name: string;
  access_code: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export const OrderCard = ({ order }: OrderCardProps) => {
  const { products, externalProducts, addItemToOrder, closeOrder, updateOrder, currentUser } = useAppContext();
  const { toast } = useToast();
  const { discounts: activeDiscounts } = useActiveDiscounts();
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
  const [isCloseOrderOpen, setIsCloseOrderOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | ExternalProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [payments, setPayments] = useState<Array<{ method: PaymentMethod; amount: string }>>([
    { method: 'cash', amount: order.total.toFixed(2) }
  ]);
  const [isClosingOrder, setIsClosingOrder] = useState(false);
  const [showPrintAlert, setShowPrintAlert] = useState(false);
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);

  // Estados para desconto manual
  const [manualDiscounts, setManualDiscounts] = useState<number[]>([]);
  const [discountInput, setDiscountInput] = useState('');

  // Estados para novo modal de adição de itens
  const [addItemsSearch, setAddItemsSearch] = useState('');
  const [addItemsSelected, setAddItemsSelected] = useState<Array<{
    id: string;
    productId: string;
    product_name: string;
    product: Product | ExternalProduct;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product_type: 'food' | 'external_product';
    originalPrice?: number;
    discountValue?: number;
    discountId?: string;
  }>>([]);

  // Estados para modal de edição de itens
  const [editItemsSearch, setEditItemsSearch] = useState('');
  const [editItemsSelected, setEditItemsSelected] = useState<Array<{
    id: string;
    productId: string;
    product_name: string;
    product: Product | ExternalProduct;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product_type: 'food' | 'external_product';
    originalPrice?: number;
    discountValue?: number;
    discountId?: string;
  }>>([]);

  const allProducts = [...products.filter(p => p.available), ...externalProducts.filter(p => p.current_stock > 0)];

  // Estados para atribuir perda
  const [isAssignLossOpen, setIsAssignLossOpen] = useState(false);
  const [selectedItemForLoss, setSelectedItemForLoss] = useState<OrderItem | null>(null);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);
  const [isConfirmLossOpen, setIsConfirmLossOpen] = useState(false);

  // Funções para gerenciar descontos manuais
  const addManualDiscount = () => {
    const value = Number(discountInput.replace(',', '.'));
    if (!isNaN(value) && value > 0) {
      const newTotalDiscount = totalManualDiscount + value;
      if (newTotalDiscount > order.total) {
        toast({
          title: "Erro",
          description: "O desconto total não pode ser maior que o valor da comanda.",
          variant: "destructive",
        });
        return;
      }
      setManualDiscounts(prev => [...prev, value]);
      setDiscountInput('');
    }
  };

  const removeManualDiscount = (index: number) => {
    setManualDiscounts(prev => prev.filter((_, i) => i !== index));
  };

  const totalManualDiscount = manualDiscounts.reduce((acc, d) => acc + d, 0);
  const totalWithDiscount = Math.max(0, order.total - totalManualDiscount);

  // Controlar impressão
  useEffect(() => {
    if (orderToPrint) {
      const timer = setTimeout(() => {
        window.print();
        setOrderToPrint(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [orderToPrint]);

  // Atualizar valor inicial dos pagamentos quando desconto for aplicado
  useEffect(() => {
    if (payments.length === 1 && payments[0].amount === order.total.toFixed(2)) {
      setPayments([{ method: 'cash', amount: totalWithDiscount.toFixed(2) }]);
    }
  }, [totalWithDiscount, order.total]);

  const handlePaymentAmountChange = (index: number, amount: string) => {
    // Trocar vírgula por ponto e remover caracteres não numéricos exceto ponto
    let cleanValue = amount.replace(/,/g, '.').replace(/[^\d.]/g, '');
    // Garantir que só há um ponto decimal
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return;
    }
    // Limitar a 2 casas decimais
    if (parts[1] && parts[1].length > 2) {
      cleanValue = parts[0] + '.' + parts[1].slice(0, 2);
    }
    const newPayments = [...payments];
    newPayments[index].amount = cleanValue;
    setPayments(newPayments);
  };

  // Formatar valor ao sair do campo (onBlur)
  const handlePaymentAmountBlur = (index: number) => {
    const newPayments = [...payments];
    const value = newPayments[index].amount.replace(/,/g, '.');
    let num = parseFloat(value);
    if (!isNaN(num)) {
      num = Math.round(num * 100) / 100;
      newPayments[index].amount = num.toFixed(2);
    } else {
      newPayments[index].amount = '';
    }
    setPayments(newPayments);
  };

  const round2 = (num: number) => Math.round(num * 100) / 100;

  const totalPaid = payments.reduce((sum, payment) => sum + (round2(parseFloat(payment.amount)) || 0), 0);
  const remainingAmount = round2(totalWithDiscount) - round2(totalPaid);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'open':
        return 'default';
      case 'closed':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'open':
        return 'Aberta';
      case 'closed':
        return 'Fechada';
      default:
        return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'partial':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'partial':
        return 'Parcial';
      default:
        return status;
    }
  };

  const handleAddItem = async () => {
    if (!selectedProduct) {
      toast({
        title: "Erro",
        description: "Selecione um produto.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Buscar desconto ativo para o produto
      const discount = activeDiscounts.find(
        d => d.productId === selectedProduct.id && d.active && d.productType === ('current_stock' in selectedProduct ? 'external_product' : 'food')
      );
      const priceToUse = discount ? discount.newPrice : selectedProduct.price;
      
      const isExternalProduct = 'current_stock' in selectedProduct;
      const newItem = {
        productId: selectedProduct.id,
        product: selectedProduct,
        quantity,
        unitPrice: priceToUse,
        totalPrice: priceToUse * quantity,
        product_name: selectedProduct.name,
        product_type: isExternalProduct ? 'external_product' as const : 'food' as const,
        // Dados de desconto
        originalPrice: discount ? selectedProduct.price : undefined,
        discountValue: discount ? selectedProduct.price - discount.newPrice : undefined,
        discountId: discount?.id
      };

      await addItemToOrder(order.id, newItem);
      setIsAddItemOpen(false);
      setSelectedProduct(null);
      setQuantity(1);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Não foi possível adicionar o item.";
      toast({
        title: "Erro ao adicionar item",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handlePaymentMethodChange = (index: number, method: PaymentMethod) => {
    const newPayments = [...payments];
    newPayments[index].method = method;
    setPayments(newPayments);
  };

  const validatePayments = () => {
    // Verificar se há valores inválidos
    const hasInvalidValues = payments.some(payment => {
      const amount = parseFloat(payment.amount.replace(/,/g, '.'));
      return isNaN(amount) || amount <= 0;
    });

    if (hasInvalidValues) {
      toast({
        title: "Erro de validação",
        description: "Todos os valores de pagamento devem ser maiores que zero.",
        variant: "destructive"
      });
      return false;
    }

    // Tolerância aumentada para 0.05
    if (Math.abs(remainingAmount) > 0.05) {
      toast({
        title: "Erro de validação",
        description: `O total dos pagamentos deve ser igual ao valor da comanda com desconto. Falta pagar: R$ ${Math.abs(remainingAmount).toFixed(2)}`,
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const addPayment = () => {
    setPayments([...payments, { method: 'cash', amount: remainingAmount > 0 ? remainingAmount.toFixed(2) : '0' }]);
  };

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleCloseOrder = async () => {
    try {
      if (!validatePayments()) {
        return;
      }

      setIsClosingOrder(true);

      // Converter os valores de string para número
      const processedPayments = payments.map(payment => ({
        method: payment.method,
        amount: parseFloat(payment.amount.replace(/,/g, '.'))
      }));

      await closeOrder(order.id, processedPayments, totalManualDiscount);

      setIsCloseOrderOpen(false);
      setManualDiscounts([]);
      setDiscountInput('');
      toast({
        title: "Comanda fechada",
        description: "Comanda fechada com sucesso!"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Não foi possível fechar a comanda.";
      toast({
        title: "Erro ao fechar comanda",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsClosingOrder(false);
    }
  };

  // Funções para adicionar/remover/alterar itens
  const addProductToSelection = (product: Product | ExternalProduct) => {
    // Buscar desconto ativo para o produto
    const discount = activeDiscounts.find(
      d => d.productId === product.id && d.active && d.productType === ('current_stock' in product ? 'external_product' : 'food')
    );
    const priceToUse = discount ? discount.newPrice : product.price;
    
    const exists = addItemsSelected.find(item => item.productId === product.id);
    if (exists) {
      setAddItemsSelected(prev => prev.map(item =>
        item.productId === product.id
          ? { 
              ...item, 
              quantity: item.quantity + 1, 
              totalPrice: (item.quantity + 1) * priceToUse,
              unitPrice: priceToUse
              // Dados de desconto já estão preservados pelo spread operator (...item)
            }
          : item
      ));
    } else {
      const isExternalProduct = 'current_stock' in product;
      setAddItemsSelected(prev => [...prev, {
        id: `temp-${Date.now()}-${product.id}`,
        productId: product.id,
        product_name: product.name,
        product,
        quantity: 1,
        unitPrice: priceToUse,
        totalPrice: priceToUse,
        product_type: isExternalProduct ? 'external_product' : 'food',
        // Dados de desconto
        originalPrice: discount ? product.price : undefined,
        discountValue: discount ? product.price - discount.newPrice : undefined,
        discountId: discount?.id
      }]);
    }
  };
  const removeProductFromSelection = (productId: string) => {
    setAddItemsSelected(prev => prev.filter(item => item.productId !== productId));
  };
  const updateProductQuantityInSelection = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeProductFromSelection(productId);
      return;
    }
    setAddItemsSelected(prev => prev.map(item =>
      item.productId === productId
        ? { 
            ...item, 
            quantity, 
            totalPrice: quantity * item.unitPrice
            // Dados de desconto já estão preservados pelo spread operator (...item)
          }
        : item
    ));
  };
  // Produtos filtrados
  const filteredFoodProducts = products
    .filter(p => p.available && p.name.toLowerCase().includes(addItemsSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  const filteredExternalProducts = externalProducts
    .filter(p => p.current_stock > 0 && p.name.toLowerCase().includes(addItemsSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Função para confirmar adição dos itens
  const handleAddItemsToOrder = async () => {
    for (const item of addItemsSelected) {
      await addItemToOrder(order.id, {
        productId: item.productId,
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        product_name: item.product_name,
        product_type: item.product_type,
        // Usar dados de desconto já calculados
        originalPrice: item.originalPrice,
        discountValue: item.discountValue,
        discountId: item.discountId
      });
    }
    setAddItemsSelected([]);
    setIsAddItemOpen(false);
    setAddItemsSearch('');
  };

  // Funções para gerenciar edição de itens
  const initializeEditItems = () => {
    setEditItemsSelected(order.items.map(item => ({
      id: item.id,
      productId: item.productId,
      product_name: item.product_name,
      product: item.product || { id: item.productId, name: item.product_name, price: item.unitPrice } as Product,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      product_type: item.product_type,
      originalPrice: item.originalPrice,
      discountValue: item.discountValue,
      discountId: item.discountId
    })));
  };

  const removeItemFromEdit = (itemId: string) => {
    const item = editItemsSelected.find(item => item.id === itemId);
    if (!item) return;

    const confirmed = window.confirm(
      `Título: Remoção do item ${item.product_name}\n\nConfirma a remoção do item? Será necessário adiciona-lo novamente caso seja removido errado.`
    );

    if (confirmed) {
      setEditItemsSelected(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const updateItemQuantityInEdit = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItemFromEdit(itemId);
      return;
    }

    setEditItemsSelected(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, quantity, totalPrice: quantity * item.unitPrice }
        : item
    ));
  };

  const handleSaveEditItems = async () => {
    try {
      // Remover itens que foram removidos do editItemsSelected
      const currentItemIds = new Set(order.items.map(item => item.id));
      const editedItemIds = new Set(editItemsSelected.map(item => item.id));
      const removedItemIds = Array.from(currentItemIds).filter(id => !editedItemIds.has(id));

      // Remover itens no backend
      for (const itemId of removedItemIds) {
        await removeItemFromOrder(order.id, itemId);
      }

      // Atualizar itens modificados (aqui pode-se implementar updateItemInOrder se necessário)
      // ...

      setIsEditOrderOpen(false);
      setEditItemsSelected([]);
      toast({
        title: "Sucesso",
        description: "Comanda atualizada com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao salvar edições:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar edições da comanda.",
        variant: "destructive"
      });
    }
  };

  // Calcular totais para o modal de edição
  const editSubtotal = editItemsSelected.reduce((sum, item) => sum + item.totalPrice, 0);
  const editTotal = editSubtotal; // Assumindo que não há taxas

  // Função para dar desconto de cortesia
  const giveCourtesyDiscount = async (itemId: string) => {
    try {
      const item = order.items.find(item => item.id === itemId);
      if (!item) return;

      // Adicionar o valor do item como desconto manual
      const itemTotal = item.totalPrice;
      setManualDiscounts(prev => [...prev, itemTotal]);
      
      toast({
        title: "Cortesia Aplicada",
        description: `${item.product_name} foi dado de cortesia (R$ ${itemTotal.toFixed(2)})`,
      });
    } catch (error) {
      console.error('Erro ao aplicar cortesia:', error);
      toast({
        title: "Erro",
        description: "Erro ao aplicar cortesia.",
        variant: "destructive",
      });
    }
  };

  // Função para buscar funcionários
  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, access_key, is_active, created_at, owner_id')
        .eq('owner_id', currentUser?.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setEmployees((data as any[]) as EmployeeProfile[] || []);
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar funcionários.",
        variant: "destructive",
      });
    }
  };

  // Função para abrir modal de atribuir perda
  const openAssignLossModal = async (item: OrderItem) => {
    setSelectedItemForLoss(item);
    await fetchEmployees();
    setIsAssignLossOpen(true);
  };

  // Função para selecionar funcionário
  const selectEmployeeForLoss = (employee: EmployeeProfile) => {
    setSelectedEmployee(employee);
    setIsAssignLossOpen(false);
    setIsConfirmLossOpen(true);
  };

  // Função para confirmar atribuição de perda
  const confirmAssignLoss = async () => {
    if (!selectedItemForLoss || !selectedEmployee || !currentUser) return;

    try {
      // 1. Verificar se existe conta de despesa aberta para o funcionário
      let expenseAccount = await getOpenExpenseAccount(selectedEmployee.id);
      
      // 2. Se não existir, criar uma nova conta
      if (!expenseAccount) {
        expenseAccount = await openExpenseAccount(currentUser.id, selectedEmployee.id);
      }

      // 3. Adicionar o item à conta de despesa com contestação
      await addExpenseAccountItems(
        expenseAccount.id,
        [{
          product_id: selectedItemForLoss.productId,
          product_type: selectedItemForLoss.product_type,
          quantity: selectedItemForLoss.quantity,
          unit_price: selectedItemForLoss.unitPrice,
          product_name: selectedItemForLoss.product_name
        }],
        currentUser.id
      );

      // 4. Marcar o item como contestado
      const items = await getExpenseAccountItems(expenseAccount.id);
      const lastItem = items[0]; // O item mais recente
      if (lastItem) {
        await contestExpenseAccountItem(lastItem.id, "Item cadastrado como perda de uma comanda");
      }

      // 5. Remover o item da comanda (backend)
      await removeItemFromOrder(order.id, selectedItemForLoss.id);

      // 6. Atualizar o estado local removendo o item
      if (order.items) {
        order.items = order.items.filter(item => item.id !== selectedItemForLoss.id);
      }

      toast({
        title: "Perda Atribuída",
        description: `${selectedItemForLoss.product_name} foi atribuído como perda para ${selectedEmployee.name}`,
      });

      // Limpar estados
      setSelectedItemForLoss(null);
      setSelectedEmployee(null);
      setIsConfirmLossOpen(false);

    } catch (error) {
      console.error('Erro ao atribuir perda:', error);
      toast({
        title: "Erro",
        description: "Erro ao atribuir perda ao funcionário.",
        variant: "destructive",
      });
    }
  };
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 w-full">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 w-full">
              {order.customer_name && (
                <>
                  <User className="h-4 w-4 mr-1 shrink-0" />
                  <span className="font-semibold break-all whitespace-normal">{order.customer_name}</span>
                </>
              )}
              {order.table_number !== undefined && order.table_number !== null && (
                <>
                  <span className="mx-2 text-gray-400">|</span>
                  <Hash className="h-4 w-4 mr-1 shrink-0" />
                  <span className="font-semibold">Mesa {order.table_number}</span>
                </>
              )}
              {!order.customer_name && !order.table_number && (
                <>
                  <Hash className="h-4 w-4 mr-1 shrink-0" />
                  <span className="font-semibold">Mesa S/N</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 min-w-fit">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={e => { 
                  e.stopPropagation(); 
                  setOrderToPrint(order);
                }}
              >
                <Printer className="h-4 w-4" />
              </Button>
              <Badge variant={getStatusColor(order.status)}>
                {getStatusText(order.status)}
              </Badge>
              <span className="text-xs text-gray-600">
                {order.status === 'closed' ? 'Fechada' : 'Aberta'}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="space-y-4">
          {/* Lista de Itens */}
          <div className="space-y-2">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm gap-2">
                <div className="flex-1">
                  <span className="font-medium">{item.product_name}</span>
                  <span className="text-gray-500 ml-2">({item.quantity}x)</span>
                  {(Number(item.discountValue) > 0) && (
                    <>
                      <div className="text-xs text-orange-700">
                        Preço original: R$ {item.originalPrice?.toFixed(2)}
                      </div>
                      <div className="text-xs text-green-700">
                        Desconto: R$ {item.discountValue?.toFixed(2)}
                      </div>
                    </>
                  )}
                </div>
                <div className="text-right mr-2">
                   <div className="text-gray-500">R$ {item.unitPrice.toFixed(2)} cada</div>
                   <div>R$ {item.totalPrice.toFixed(2)}</div>
                </div>
                {order.status === 'open' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => giveCourtesyDiscount(item.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Dar de Cortesia
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => openAssignLossModal(item)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <AlertTriangleIcon className="h-4 w-4 mr-2" />
                        Atribuir perda
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="border-t pt-2">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>R$ {order.total.toFixed(2)}</span>
            </div>
          </div>

          {order.status === 'open' && (
            <div className="flex flex-col gap-2 mt-4">
              <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-1" />
                    Inserir Pedido
                  </Button>
                </DialogTrigger>
                {/* Modal de adicionar itens - conteúdo existente */}
              </Dialog>

              <Dialog open={isEditOrderOpen} onOpenChange={(open) => {
                if (open) {
                  initializeEditItems();
                }
                setIsEditOrderOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Edit className="h-4 w-4 mr-1" />
                    Editar Comanda
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-6">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Editar Itens da Comanda</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-3">Itens da Comanda</h3>
                      <div className="h-96 overflow-y-auto border rounded-lg p-3 bg-white">
                        {editItemsSelected.length === 0 ? (
                          <div className="text-gray-500 text-center py-8">Nenhum item na comanda.</div>
                        ) : (
                          editItemsSelected.map(item => (
                            <div key={item.id} className="flex items-center justify-between border-b py-2">
                              <div>
                                <p className="font-medium text-sm">{item.product_name}</p>
                                <p className="text-xs text-gray-500">{item.product_type === 'food' ? 'Comida' : 'Produto Externo'}</p>
                                <p className="text-sm text-gray-600">R$ {item.unitPrice.toFixed(2)} x {item.quantity}</p>
                                {item.discountValue && item.discountValue > 0 && (
                                  <>
                                    <p className="text-xs text-orange-700">Preço original: R$ {item.originalPrice?.toFixed(2)}</p>
                                    <p className="text-xs text-green-700">Desconto: R$ {item.discountValue.toFixed(2)}</p>
                                  </>
                                )}
                                <p className="text-xs font-semibold mt-1">Total: R$ {item.totalPrice.toFixed(2)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={e => updateItemQuantityInEdit(item.id, Number(e.target.value))}
                                  className="w-16"
                                />
                                <Button type="button" size="icon" variant="ghost" onClick={() => removeItemFromEdit(item.id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Totais */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Subtotal:</span>
                        <span>R$ {editSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>R$ {editTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={() => setIsEditOrderOpen(false)} className="flex-1">
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveEditItems} className="flex-1 bg-blue-600 hover:bg-blue-700">
                        Salvar Alterações
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-6">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Adicionar Itens à Comanda</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="addItemSearch">Pesquisar Produtos</Label>
                        <div className="relative mt-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            id="addItemSearch"
                            value={addItemsSearch}
                            onChange={e => setAddItemsSearch(e.target.value)}
                            placeholder="Digite o nome do produto..."
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-3">Produtos Disponíveis</h3>
                        <div className="grid grid-cols-1 gap-2 h-96 overflow-y-auto border rounded-lg p-3">
                          {filteredFoodProducts.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-2 sticky top-0 bg-white py-1">Comidas ({filteredFoodProducts.length})</h4>
                              {filteredFoodProducts.map(product => {
                                const discount = activeDiscounts.find(
                                  d => d.productId === product.id && d.active && d.productType === 'food'
                                );
                                return (
                                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-white">
                                    <div className="flex-1 flex items-center gap-2">
                                      <p className="font-medium text-sm">{product.name}</p>
                                      {discount && (
                                        <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-bold border border-green-300">Promoção</span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600">R$ {product.price.toFixed(2)}</p>
                                    {product.description && (
                                      <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                                    )}
                                    <Button
                                      size="sm"
                                      onClick={() => addProductToSelection(product)}
                                      className="bg-green-500 hover:bg-green-600 ml-2"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {filteredExternalProducts.length > 0 && (
                            <div className={filteredFoodProducts.length > 0 ? 'mt-4' : ''}>
                              <h4 className="text-sm font-medium text-gray-500 mb-2 sticky top-0 bg-white py-1">Produtos Externos ({filteredExternalProducts.length})</h4>
                              {filteredExternalProducts.map(product => {
                                const discount = activeDiscounts.find(
                                  d => d.productId === product.id && d.active && d.productType === 'external_product'
                                );
                                return (
                                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-white">
                                    <div className="flex-1 flex items-center gap-2">
                                      <p className="font-medium text-sm">{product.name}</p>
                                      {discount && (
                                        <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-bold border border-green-300">Promoção</span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600">R$ {product.price.toFixed(2)}</p>
                                    {product.description && (
                                      <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                                    )}
                                    <Button
                                      size="sm"
                                      onClick={() => addProductToSelection(product)}
                                      className="bg-green-500 hover:bg-green-600 ml-2"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {filteredFoodProducts.length === 0 && filteredExternalProducts.length === 0 && (
                            <div className="text-gray-500 text-center py-8">Nenhum item encontrado.</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <h3 className="font-semibold mb-3">Itens Selecionados</h3>
                      <div className="h-96 overflow-y-auto border rounded-lg p-3 bg-white">
                        {addItemsSelected.length === 0 ? (
                          <div className="text-gray-500 text-center py-8">Nenhum item selecionado.</div>
                        ) : (
                          addItemsSelected.map(item => (
                            <div key={item.productId} className="flex items-center justify-between border-b py-2">
                              <div>
                                <p className="font-medium text-sm">{item.product_name}</p>
                                <p className="text-xs text-gray-500">{item.product_type === 'food' ? 'Comida' : 'Produto Externo'}</p>
                                <p className="text-sm text-gray-600">R$ {item.unitPrice.toFixed(2)} x {item.quantity}</p>
                                {item.discountValue && item.discountValue > 0 && (
                                  <>
                                    <p className="text-xs text-orange-700">Preço original: R$ {item.originalPrice?.toFixed(2)}</p>
                                    <p className="text-xs text-green-700">Desconto: R$ {item.discountValue.toFixed(2)}</p>
                                  </>
                                )}
                                <p className="text-xs font-semibold mt-1">Total: R$ {item.totalPrice.toFixed(2)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={e => updateProductQuantityInSelection(item.productId, Number(e.target.value))}
                                  className="w-16"
                                />
                                <Button type="button" size="icon" variant="ghost" onClick={() => removeProductFromSelection(item.productId)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <Button onClick={handleAddItemsToOrder} className="w-full bg-green-600 hover:bg-green-700" disabled={addItemsSelected.length === 0}>
                        Adicionar {addItemsSelected.length > 1 ? 'Itens' : 'Item'} à Comanda
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isCloseOrderOpen} onOpenChange={(open) => {
                console.log('onOpenChange:', open);
                setIsCloseOrderOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-green-500 hover:bg-green-600 relative z-10">
                    <CreditCard className="h-4 w-4 mr-1" />
                    Fechar Comanda
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Fechar Comanda</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Detalhes do Pedido */}
                    <div className="space-y-2 border-b pb-4">
                      <h3 className="font-medium text-sm text-gray-600">Detalhes do Pedido</h3>
                      <div className="space-y-2">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <div className="flex-1">
                              <span className="font-medium">{item.product_name}</span>
                              <span className="text-gray-500 ml-2">({item.quantity}x)</span>
                            </div>
                            <div className="text-right">
                              <div className="text-gray-500">R$ {item.unitPrice.toFixed(2)} cada</div>
                              <div>R$ {item.totalPrice.toFixed(2)}</div>
                            </div>
                            {order.status === 'open' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => giveCourtesyDiscount(item.id)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Dar de Cortesia
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => openAssignLossModal(item)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <AlertTriangleIcon className="h-4 w-4 mr-2" />
                                    Atribuir perda
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Campo para adicionar desconto manual */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm text-gray-600">Desconto</h3>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label htmlFor="manualDiscount">Adicionar Desconto (R$)</Label>
                          <Input
                            id="manualDiscount"
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            value={discountInput}
                            onChange={e => setDiscountInput(e.target.value)}
                            placeholder="Ex: 10,00"
                            className="mt-1"
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addManualDiscount(); } }}
                          />
                        </div>
                        <Button type="button" onClick={addManualDiscount} className="h-10">
                          Adicionar
                        </Button>
                      </div>
                      {/* Lista de descontos aplicados */}
                      {manualDiscounts.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {manualDiscounts.map((d, i) => (
                            <Badge key={i} variant="secondary" className="flex items-center gap-1">
                              R$ {d.toFixed(2)}
                              <Button size="icon" variant="ghost" onClick={() => removeManualDiscount(i)} className="ml-1 p-0 h-4 w-4">×</Button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Pagamentos */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm text-gray-600">Pagamentos</h3>
                      <div className="space-y-2">
                        {payments.map((payment, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Select
                              value={payment.method}
                              onValueChange={(value: PaymentMethod) => handlePaymentMethodChange(index, value)}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Dinheiro</SelectItem>
                                <SelectItem value="card">Cartão</SelectItem>
                                <SelectItem value="pix">PIX</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="text"
                              value={payment.amount}
                              onChange={(e) => handlePaymentAmountChange(index, e.target.value)}
                              onBlur={() => handlePaymentAmountBlur(index)}
                              className="w-32"
                            />
                            {index > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removePayment(index)}
                                className="h-8 w-8"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addPayment}
                        className="w-full mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Pagamento
                      </Button>
                    </div>



                    {/* Totais */}
                    <div className="space-y-1 pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Total da Venda:</span>
                        <span>R$ {order.total.toFixed(2)}</span>
                      </div>
                      {totalManualDiscount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Descontos:</span>
                          <span>- R$ {totalManualDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold">
                        <span>Total com Desconto:</span>
                        <span>R$ {totalWithDiscount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total Pago:</span>
                        <span>R$ {totalPaid.toFixed(2)}</span>
                      </div>
                      <div className={`flex justify-between font-bold ${remainingAmount > 0 ? 'text-orange-500' : remainingAmount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        <span>Falta Pagar:</span>
                        <span>R$ {Math.abs(remainingAmount).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Botões alinhados: Cancelar | Fechar | Imprimir */}
                    <div className="flex flex-row gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsCloseOrderOpen(false)} className="flex-1">
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => setShowPrintAlert(true)}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        disabled={remainingAmount > 0 || isClosingOrder}
                      >
                        {isClosingOrder ? (
                          <>
                            <span className="animate-spin mr-2">◌</span>
                            Finalizando...
                          </>
                        ) : (
                          'Fechar Comanda'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setOrderToPrint(order)}
                        className="flex-1"
                      >
                        Imprimir
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </CardContent>
      {/* Alerta de confirmação de impressão */}
      <AlertDialog open={showPrintAlert} onOpenChange={setShowPrintAlert}>
        <AlertDialogContent className="border-red-600">
          <div className="flex flex-col items-center justify-center">
            <AlertTriangle className="text-red-600 mb-2" size={48} />
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-bold text-red-700 text-center">
                Atenção!
              </AlertDialogTitle>
              <AlertDialogDescription className="text-lg text-red-600 font-semibold text-center mt-2">
                É necessário imprimir a comanda para conferência do cliente antes do pagamento.<br />
                <span className="block mt-2">Você já realizou a impressão?</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowPrintAlert(false)} className="font-bold">
              Não, voltar para imprimir
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowPrintAlert(false);
                await handleCloseOrder();
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Sim, já imprimi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {orderToPrint && (
        <div id="print-content-order">
          <OrderReceiptPrint order={orderToPrint} />
        </div>
      )}

      {/* Modal para selecionar funcionário para atribuir perda */}
      <Dialog open={isAssignLossOpen} onOpenChange={setIsAssignLossOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Funcionário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Selecione o funcionário para atribuir a perda do item: <strong>{selectedItemForLoss?.product_name}</strong>
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {employees.map((employee) => (
                <Button
                  key={employee.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => selectEmployeeForLoss(employee)}
                >
                  <User className="h-4 w-4 mr-2" />
                  {employee.name}
                </Button>
              ))}
            </div>
            {employees.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                Nenhum funcionário encontrado.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Alerta de confirmação para atribuir perda */}
      <AlertDialog open={isConfirmLossOpen} onOpenChange={setIsConfirmLossOpen}>
        <AlertDialogContent className="border-red-600">
          <div className="flex flex-col items-center justify-center">
            <AlertTriangleIcon className="text-red-600 mb-2" size={48} />
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-bold text-red-700 text-center">
                Atribuir perda à {selectedEmployee?.name}?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-lg text-red-600 font-semibold text-center mt-2">
                Ao confirmar, esse item irá entrar na conta despesa desse funcionário e será removido da comanda, <strong>NÃO SENDO REVERTÍVEL</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmLossOpen(false)} className="font-bold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAssignLoss}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
