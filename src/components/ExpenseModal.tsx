
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/contexts/AppContext';
import { NewExpense } from '@/types';
import { toast } from '@/components/ui/use-toast';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpenseModal = ({ isOpen, onClose }: ExpenseModalProps) => {
  const { products, externalProducts, addExpense, currentCashRegister } = useApp();
  const [selectedTab, setSelectedTab] = useState('product_loss');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedFood, setSelectedFood] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');

  const resetForm = () => {
    setSelectedProduct('');
    setSelectedFood('');
    setQuantity(1);
    setAmount(0);
    setDescription('');
    setReason('');
    setSelectedTab('product_loss');
  };

  const calculateAmount = () => {
    if (selectedTab === 'product_loss' && selectedProduct && quantity) {
      const product = externalProducts.find(p => p.id === selectedProduct);
      if (product) {
        return product.cost * quantity;
      }
    } else if (selectedTab === 'ingredient_loss' && selectedFood && quantity) {
      const food = products.find(p => p.id === selectedFood);
      if (food) {
        return food.cost * quantity;
      }
    }
    return amount;
  };

  const handleSubmit = async () => {
    if (!currentCashRegister) {
      toast({
        title: "Erro",
        description: "Não há caixa aberto para registrar a despesa.",
        variant: "destructive"
      });
      return;
    }

    try {
      let expense: NewExpense;
      const calculatedAmount = calculateAmount();

      if (selectedTab === 'product_loss') {
        if (!selectedProduct || !quantity) {
          toast({
            title: "Erro",
            description: "Selecione um produto e informe a quantidade.",
            variant: "destructive"
          });
          return;
        }

        const product = externalProducts.find(p => p.id === selectedProduct);
        expense = {
          type: 'product_loss',
          product_id: selectedProduct,
          description: `Perda/Consumo: ${product?.name}`,
          amount: calculatedAmount,
          quantity,
          reason
        };
      } else if (selectedTab === 'ingredient_loss') {
        if (!selectedFood || !quantity) {
          toast({
            title: "Erro",
            description: "Selecione uma comida e informe a quantidade.",
            variant: "destructive"
          });
          return;
        }

        const food = products.find(p => p.id === selectedFood);
        expense = {
          type: 'ingredient_loss',
          product_id: selectedFood,
          ingredient_ids: food?.ingredients?.map(i => i.ingredient_id) || [],
          description: `Perda/Consumo: ${food?.name}`,
          amount: calculatedAmount,
          quantity,
          reason
        };
      } else {
        if (!description || amount <= 0) {
          toast({
            title: "Erro",
            description: "Informe uma descrição e um valor válido.",
            variant: "destructive"
          });
          return;
        }

        expense = {
          type: 'other',
          description,
          amount,
          reason
        };
      }

      await addExpense(expense);

      toast({
        title: "Sucesso",
        description: "Despesa registrada com sucesso!",
      });

      resetForm();
      onClose();
    } catch (error: any) {
      console.error('Erro ao registrar despesa:', error);
      toast({
        title: "Erro ao registrar despesa",
        description: error.message || "Ocorreu um erro ao registrar a despesa. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registro de Despesa</DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="product_loss">Produtos Externos</TabsTrigger>
            <TabsTrigger value="ingredient_loss">Comidas</TabsTrigger>
            <TabsTrigger value="other">Outras Despesas</TabsTrigger>
          </TabsList>

          <TabsContent value="product_loss" className="space-y-4">
            <div>
              <Label>Produto Externo</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {externalProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - R$ {product.cost.toFixed(2)} (Estoque: {product.current_stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>

            <div>
              <Label>Valor Calculado</Label>
              <Input
                type="text"
                value={`R$ ${calculateAmount().toFixed(2)}`}
                disabled
              />
            </div>

            <div>
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Produto vencido, consumo interno, etc."
              />
            </div>
          </TabsContent>

          <TabsContent value="ingredient_loss" className="space-y-4">
            <div>
              <Label>Comida</Label>
              <Select value={selectedFood} onValueChange={setSelectedFood}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma comida" />
                </SelectTrigger>
                <SelectContent>
                  {products.filter(p => p.available).map((food) => (
                    <SelectItem key={food.id} value={food.id}>
                      {food.name} - Custo: R$ {food.cost.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>

            <div>
              <Label>Valor Calculado</Label>
              <Input
                type="text"
                value={`R$ ${calculateAmount().toFixed(2)}`}
                disabled
              />
            </div>

            <div>
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Comida queimada, erro na preparação, etc."
              />
            </div>
          </TabsContent>

          <TabsContent value="other" className="space-y-4">
            <div>
              <Label>Descrição</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Manutenção equipamento, conta de luz, etc."
              />
            </div>

            <div>
              <Label>Valor</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Detalhes adicionais sobre a despesa"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="flex-1 bg-yellow-500 hover:bg-yellow-600">
            Registrar Despesa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
