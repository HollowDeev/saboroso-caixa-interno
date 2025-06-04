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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Ingrediente</TableHead>
                    <TableHead>Estoque Atual</TableHead>
                    <TableHead>Estoque Mínimo</TableHead>
                    <TableHead>Custo Unitário</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredients.map((ingredient) => (
                    <TableRow key={ingredient.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStockIcon(ingredient.currentStock, ingredient.minStock)}
                          {getStockStatusBadge(ingredient.currentStock, ingredient.minStock)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{ingredient.name}</TableCell>
                      <TableCell>
                        <span className={`font-medium ${getStockStatus(ingredient.currentStock, ingredient.minStock).status === 'danger' ? 'text-red-600' :
                            getStockStatus(ingredient.currentStock, ingredient.minStock).status === 'warning' ? 'text-yellow-600' :
                              'text-green-600'
                          }`}>
                          {ingredient.currentStock} {ingredient.unit}
                        </span>
                      </TableCell>
                      <TableCell>{ingredient.minStock} {ingredient.unit}</TableCell>
                      <TableCell>R$ {ingredient.cost.toFixed(2)}</TableCell>
                      <TableCell>{ingredient.supplier || '-'}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openStockDialog(ingredient, 'add')}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openStockDialog(ingredient, 'remove')}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Estoque Atual</TableHead>
                    <TableHead>Estoque Mínimo</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {externalProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStockIcon(product.currentStock, product.minStock)}
                          {getStockStatusBadge(product.currentStock, product.minStock)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.brand}</TableCell>
                      <TableCell>
                        <span className={`font-medium ${getStockStatus(product.currentStock, product.minStock).status === 'danger' ? 'text-red-600' :
                            getStockStatus(product.currentStock, product.minStock).status === 'warning' ? 'text-yellow-600' :
                              'text-green-600'
                          }`}>
                          {product.currentStock} un
                        </span>
                      </TableCell>
                      <TableCell>{product.minStock} un</TableCell>
                      <TableCell>R$ {product.cost.toFixed(2)}</TableCell>
                      <TableCell>R$ {product.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Ingredientes</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>
                        {product.ingredients.map((ing, idx) => (
                          <Badge key={idx} variant="secondary" className="mr-1">
                            {ingredients.find(i => i.id === ing.ingredientId)?.name}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell>R$ {product.cost.toFixed(2)}</TableCell>
                      <TableCell>R$ {product.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={product.available ? 'default' : 'destructive'}>
                          {product.available ? 'Disponível' : 'Indisponível'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estoque Atual</TableHead>
                    <TableHead>Estoque Mínimo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalIngredients.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>Ingrediente</TableCell>
                      <TableCell>{item.currentStock} {item.unit}</TableCell>
                      <TableCell>{item.minStock} {item.unit}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">Crítico</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {externalProducts
                    .filter(p => getStockStatus(p.currentStock, p.minStock).status === 'danger')
                    .map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>Produto</TableCell>
                        <TableCell>{product.currentStock} un</TableCell>
                        <TableCell>{product.minStock} un</TableCell>
                        <TableCell>
                          <Badge variant="destructive">Crítico</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
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
