import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAppContext } from '@/contexts/AppContext';
import { NewExpense } from '@/types';
import { toast } from '@/components/ui/use-toast';
import { Search } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose }) => {
  const { products, externalProducts, addExpense, currentCashRegister, currentUser } = useAppContext();
  const [selectedTab, setSelectedTab] = useState('product_loss');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedFood, setSelectedFood] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expenseKind, setExpenseKind] = useState<'consumo' | 'perda'>('consumo');

  const filteredExternalProducts = useMemo(() => {
    return externalProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [externalProducts, searchTerm]);

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => p.available)
      .filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [products, searchTerm]);

  const resetForm = () => {
    setSelectedProduct('');
    setSelectedFood('');
    setQuantity(1);
    setAmount(0);
    setDescription('');
    setReason('');
    setSelectedTab('product_loss');
    setExpenseKind('consumo');
  };

  const calculateAmount = () => {
    if (selectedTab === 'product_loss' && selectedProduct && quantity) {
      const product = externalProducts.find(p => p.id === selectedProduct);
      if (product) {
        return expenseKind === 'consumo' ? product.cost * quantity : product.price * quantity;
      }
    } else if (selectedTab === 'ingredient_loss' && selectedFood && quantity) {
      const food = products.find(p => p.id === selectedFood);
      if (food) {
        return expenseKind === 'consumo' ? food.cost * quantity : food.price * quantity;
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

    if (!currentUser) {
      toast({
        title: "Erro",
        description: "Usuário não encontrado.",
        variant: "destructive"
      });
      return;
    }

    try {
      let expense: Omit<NewExpense & { user_id: string; cash_register_id: string }, 'id' | 'created_at'>;
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
          reason,
          user_id: currentUser.id,
          cash_register_id: currentCashRegister.id
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
          reason,
          user_id: currentUser.id,
          cash_register_id: currentCashRegister.id
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
          reason,
          user_id: currentUser.id,
          cash_register_id: currentCashRegister.id
        };
      }

      await addExpense(expense);

      toast({
        title: "Sucesso",
        description: "Despesa registrada com sucesso!",
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error('Erro ao registrar despesa:', error);
      toast({
        title: "Erro ao registrar despesa",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao registrar a despesa. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Registro de Despesa</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="product_loss">Produtos Externos</TabsTrigger>
              <TabsTrigger value="ingredient_loss">Comidas</TabsTrigger>
              <TabsTrigger value="other">Outras Despesas</TabsTrigger>
            </TabsList>

            {(selectedTab === 'product_loss' || selectedTab === 'ingredient_loss') && (
              <div className="mt-4">
                <Label>Pesquisar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Digite para pesquisar..."
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            {(selectedTab === 'product_loss' || selectedTab === 'ingredient_loss') && (
              <div className="mt-4">
                <Label>Tipo de Despesa</Label>
                <Select value={expenseKind} onValueChange={v => setExpenseKind(v as 'consumo' | 'perda')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consumo">Consumo</SelectItem>
                    <SelectItem value="perda">Perda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <TabsContent value="product_loss" className="space-y-4">
              <div>
                <Label>Produto Externo</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredExternalProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {expenseKind === 'consumo' ? `Custo: R$ ${product.cost.toFixed(2)}` : `Venda: R$ ${product.price.toFixed(2)}`} (Estoque: {product.current_stock})
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
                    {filteredProducts.map((food) => (
                      <SelectItem key={food.id} value={food.id}>
                        {food.name} - {expenseKind === 'consumo' ? `Custo: R$ ${food.cost.toFixed(2)}` : `Venda: R$ ${food.price.toFixed(2)}`}
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
        </div>

        <div className="flex gap-2 mt-6 sticky bottom-0 bg-background py-4 z-10">
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
