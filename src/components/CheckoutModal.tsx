
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { Order, OrderItem, Product, ExternalProduct } from '@/types';
import { Badge } from '@/components/ui/badge';

import { toast } from '@/components/ui/use-toast';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export const CheckoutModal = ({ isOpen, onClose, order }: CheckoutModalProps) => {
  const { products, externalProducts, updateOrder } = useAppContext();
  const [selectedProducts, setSelectedProducts] = useState<OrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix'>('cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  // Remover directDiscount do estado e do payload
  // O input de desconto direto deve atualizar total_discount (já existente)
  const [manualDiscounts, setManualDiscounts] = useState<number[]>([]);
  const [discountInput, setDiscountInput] = useState('');

  React.useEffect(() => {
    if (isOpen && order) {
      setSelectedProducts(order.items);
      setCustomerName(order.customer_name || '');
      // setDirectDiscount(order.direct_discount || 0); // Removido
    }
  }, [isOpen, order]);

  const addProductToOrder = (product: Product | ExternalProduct) => {
    const existingItem = selectedProducts.find(item => item.productId === product.id);

    if (existingItem) {
      setSelectedProducts(prev => prev.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * product.price }
          : item
      ));
    } else {
      const isExternalProduct = 'current_stock' in product;
      const newItem: OrderItem = {
        id: `temp-${Date.now()}`,
        productId: product.id,
        product_name: product.name,
        product: {
          ...product,
          available: isExternalProduct ? product.current_stock > 0 : product.available
        } as Product,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price,
        product_type: isExternalProduct ? 'external_product' : 'food'
      };
      setSelectedProducts(prev => [...prev, newItem]);
    }
  };

  const removeProductFromOrder = (productId: string) => {
    setSelectedProducts(prev => prev.filter(item => item.productId !== productId));
  };

  const updateProductQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeProductFromOrder(productId);
      return;
    }

    setSelectedProducts(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, quantity, totalPrice: quantity * item.unitPrice }
        : item
    ));
  };

  const subtotal = useMemo(() => selectedProducts.reduce((sum, item) => sum + item.totalPrice, 0), [selectedProducts]);
  const totalManualDiscount = useMemo(() => manualDiscounts.reduce((acc, d) => acc + d, 0), [manualDiscounts]);
  const totalDiscount = useMemo(() =>
    selectedProducts.reduce((acc, item) => acc + (item.discountValue ? item.discountValue * item.quantity : 0), 0) + totalManualDiscount,
    [selectedProducts, totalManualDiscount]
  );
  const total = useMemo(() => subtotal - totalDiscount, [subtotal, totalDiscount]);
  const change = useMemo(() => amountPaid > total ? amountPaid - total : 0, [amountPaid, total]);
  const remainingAmount = useMemo(() => {
    const diff = total - amountPaid;
    return diff > 0 ? diff : 0;
  }, [total, amountPaid]);

  const addManualDiscount = () => {
    const value = Number(discountInput.replace(',', '.'));
    if (!isNaN(value) && value > 0) {
      setManualDiscounts(prev => [...prev, value]);
      setDiscountInput('');
    }
  };
  const removeManualDiscount = (index: number) => {
    setManualDiscounts(prev => prev.filter((_, i) => i !== index));
  };

  const finalizeSale = async () => {
    if (!order) return;

    if (!customerName.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome do cliente é obrigatório para finalizar a comanda.',
        variant: 'destructive',
      });
      return;
    }

    // Permitir finalizar mesmo com troco (amountPaid >= totalWithDiscount) - Removido
    if (remainingAmount > 0) {
      toast({
        title: 'Erro',
        description: 'O valor pago é insuficiente para finalizar a comanda.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const updatedOrderData = {
        status: 'closed' as const,
        payment_method: paymentMethod,
        customer_name: customerName,
        subtotal,
        tax: 0,
        total,
        total_discount: totalDiscount,
        items: selectedProducts
      };

      await updateOrder(order.id, updatedOrderData);

      onClose();
      setSelectedProducts([]);
      setCustomerName('');
      setPaymentMethod('cash');
      setSearchTerm('');
      // setDirectDiscount(0); // Removido
      setManualDiscounts([]);
      setDiscountInput('');
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
    }
  };

  // Filtrar e ordenar produtos alfabeticamente
  const filteredFoodProducts = products
    .filter(p => p.available && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredExternalProducts = externalProducts
    .filter(p => p.current_stock > 0 && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
  
    </Dialog>
  );
};
