import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Minus, Package, AlertTriangle, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Ingredient, Product } from '@/types';

// Interface para produtos externos (como bebidas)
interface ExternalProduct {
  id: string;
  name: string;
  brand: string;
  cost: number;
  price: number;
  currentStock: number;
  minStock: number;
}

export const StockManagement = () => {
  const { ingredients, products, updateIngredient } = useApp();
  const [activeTab, setActiveTab] = useState('ingredients');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');

  // Estado para produtos externos (como bebidas)
  const [externalProducts] = useState<ExternalProduct[]>([
    {
      id: '1',
      name: 'Coca-Cola',
      brand: 'Coca-Cola',
      cost: 3.50,
      price: 7.00,
      currentStock: 24,
      minStock: 12
    },
    {
      id: '2',
      name: 'Heineken',
      brand: 'Heineken',
      cost: 4.50,
      price: 12.00,
      currentStock: 36,
      minStock: 24
    }
  ]);

  // Funções de status de estoque
  const getStockStatus = (current: number, min: number) => {
    const stockPercentage = current / min;

    if (stockPercentage <= 1) {
      return { status: 'danger', color: 'red', label: 'Crítico' };
    } else if (stockPercentage <= 2) {
      return { status: 'warning', color: 'yellow', label: 'Baixo' };
    } else {
      return { status: 'safe', color: 'green', label: 'Normal' };
    }
  };

  const getStockStatusBadge = (current: number, min: number) => {
    const { status, label } = getStockStatus(current, min);

    const variants = {
      danger: 'destructive',
      warning: 'outline',
      safe: 'default'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {label}
      </Badge>
    );
  };

  const getStockIcon = (current: number, min: number) => {
    const { status } = getStockStatus(current, min);

    if (status === 'danger') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    } else if (status === 'warning') {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    } else {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  // Funções de ajuste de estoque
  const openStockDialog = (ingredient: Ingredient, type: 'add' | 'remove') => {
    setSelectedIngredient(ingredient);
    setAdjustmentType(type);
    setAdjustmentQuantity(0);
    setIsDialogOpen(true);
  };

  const handleStockAdjustment = () => {
    if (!selectedIngredient || adjustmentQuantity <= 0) return;

    const newStock = adjustmentType === 'add'
      ? selectedIngredient.currentStock + adjustmentQuantity
      : Math.max(0, selectedIngredient.currentStock - adjustmentQuantity);

    updateIngredient(selectedIngredient.id, {
      currentStock: newStock
    });

    setIsDialogOpen(false);
    setSelectedIngredient(null);
    setAdjustmentQuantity(0);
  };

  // Contadores para o dashboard
  const criticalIngredients = ingredients.filter(ing => getStockStatus(ing.currentStock, ing.minStock).status === 'danger');
  const warningIngredients = ingredients.filter(ing => getStockStatus(ing.currentStock, ing.minStock).status === 'warning');
  const safeIngredients = ingredients.filter(ing => getStockStatus(ing.currentStock, ing.minStock).status === 'safe');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Estoque</h1>
          <p className="text-gray-600">Controle completo do estoque</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-[400px]">
          <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="food">Comidas</TabsTrigger>
          <TabsTrigger value="control">Controle</TabsTrigger>
        </TabsList>

        {/* Seção de Ingredientes */}
        <TabsContent value="ingredients">
          <Card>
            <CardHeader>
              <CardTitle>Controle de Ingredientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ingredients.map((ingredient) => (
                  <Card key={ingredient.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{ingredient.name}</CardTitle>
                        {getStockStatusBadge(ingredient.currentStock, ingredient.minStock)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          {getStockIcon(ingredient.currentStock, ingredient.minStock)}
                          <span className={`font-medium ${getStockStatus(ingredient.currentStock, ingredient.minStock).status === 'danger' ? 'text-red-600' :
                            getStockStatus(ingredient.currentStock, ingredient.minStock).status === 'warning' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                            {ingredient.currentStock} {ingredient.unit}
                          </span>
                          <span className="text-gray-500">/ {ingredient.minStock} {ingredient.unit} min</span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Custo Unitário:</span>
                            <span>R$ {ingredient.cost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Fornecedor:</span>
                            <span>{ingredient.supplier || '-'}</span>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openStockDialog(ingredient, 'add')}
                            className="flex-1 text-green-600 hover:text-green-700"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openStockDialog(ingredient, 'remove')}
                            className="flex-1 text-red-600 hover:text-red-700"
                          >
                            <Minus className="h-4 w-4 mr-2" />
                            Remover
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seção de Produtos Externos */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Produtos Externos</CardTitle>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Produto
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {externalProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <p className="text-sm text-gray-500">{product.brand}</p>
                        </div>
                        {getStockStatusBadge(product.currentStock, product.minStock)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          {getStockIcon(product.currentStock, product.minStock)}
                          <span className={`font-medium ${getStockStatus(product.currentStock, product.minStock).status === 'danger' ? 'text-red-600' :
                            getStockStatus(product.currentStock, product.minStock).status === 'warning' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                            {product.currentStock} un
                          </span>
                          <span className="text-gray-500">/ {product.minStock} un min</span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Custo:</span>
                            <span>R$ {product.cost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Preço:</span>
                            <span className="font-medium">R$ {product.price.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                          >
                            <Minus className="h-4 w-4 mr-2" />
                            Remover
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seção de Comidas */}
        <TabsContent value="food">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Comidas</CardTitle>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Comida
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <p className="text-sm text-gray-500">{product.category}</p>
                        </div>
                        <Badge variant={product.available ? 'default' : 'destructive'}>
                          {product.available ? 'Disponível' : 'Indisponível'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Custo:</span>
                            <span>R$ {product.cost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Preço:</span>
                            <span className="font-medium">R$ {product.price.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-500">Ingredientes:</p>
                          <div className="flex flex-wrap gap-1">
                            {product.ingredients.map((ing, idx) => (
                              <Badge key={idx} variant="secondary">
                                {ingredients.find(i => i.id === ing.ingredientId)?.name}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seção de Controle */}
        <TabsContent value="control">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-800 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Estoque Crítico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-900">{criticalIngredients.length}</div>
                <p className="text-sm text-red-700">Itens em nível crítico</p>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-yellow-800 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Estoque Baixo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-900">{warningIngredients.length}</div>
                <p className="text-sm text-yellow-700">Itens com estoque baixo</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-green-800 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Estoque Normal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">{safeIngredients.length}</div>
                <p className="text-sm text-green-700">Itens com estoque adequado</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Itens com Estoque Crítico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {criticalIngredients.map((item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow border-red-200 bg-red-50">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                          <p className="text-sm text-red-600">Ingrediente</p>
                        </div>
                        <Badge variant="destructive">Crítico</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="font-medium text-red-600">
                            {item.currentStock} {item.unit}
                          </span>
                          <span className="text-red-500">/ {item.minStock} {item.unit} min</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {externalProducts
                  .filter(p => getStockStatus(p.currentStock, p.minStock).status === 'danger')
                  .map((product) => (
                    <Card key={product.id} className="hover:shadow-lg transition-shadow border-red-200 bg-red-50">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{product.name}</CardTitle>
                            <p className="text-sm text-red-600">Produto Externo</p>
                          </div>
                          <Badge variant="destructive">Crítico</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="font-medium text-red-600">
                              {product.currentStock} un
                            </span>
                            <span className="text-red-500">/ {product.minStock} un min</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo de Ajuste de Estoque */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === 'add' ? 'Adicionar ao Estoque' : 'Remover do Estoque'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Item</Label>
              <p className="text-lg font-medium">{selectedIngredient?.name}</p>
            </div>

            <div>
              <Label htmlFor="quantity">Quantidade ({selectedIngredient?.unit})</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.1"
                value={adjustmentQuantity}
                onChange={(e) => setAdjustmentQuantity(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleStockAdjustment}>
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
