
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Minus, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Ingredient } from '@/types';

export const StockManagement = () => {
  const { ingredients, updateIngredient } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');

  const getStockStatus = (ingredient: Ingredient) => {
    const { currentStock, minStock } = ingredient;
    const stockPercentage = currentStock / minStock;
    
    if (stockPercentage <= 1) {
      return { status: 'danger', color: 'red', label: 'Crítico' };
    } else if (stockPercentage <= 2) {
      return { status: 'warning', color: 'yellow', label: 'Baixo' };
    } else {
      return { status: 'safe', color: 'green', label: 'Normal' };
    }
  };

  const getStockStatusBadge = (ingredient: Ingredient) => {
    const { status, label } = getStockStatus(ingredient);
    
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

  const getStockIcon = (ingredient: Ingredient) => {
    const { status } = getStockStatus(ingredient);
    
    if (status === 'danger') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    } else if (status === 'warning') {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    } else {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

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

  const criticalIngredients = ingredients.filter(ing => getStockStatus(ing).status === 'danger');
  const warningIngredients = ingredients.filter(ing => getStockStatus(ing).status === 'warning');
  const safeIngredients = ingredients.filter(ing => getStockStatus(ing).status === 'safe');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Estoque</h1>
          <p className="text-gray-600">Monitore e ajuste o estoque de ingredientes</p>
        </div>
      </div>

      {/* Cards de resumo */}
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
            <p className="text-sm text-red-700">Ingredientes em nível crítico</p>
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
            <p className="text-sm text-yellow-700">Ingredientes com estoque baixo</p>
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
            <p className="text-sm text-green-700">Ingredientes com estoque adequado</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de ingredientes */}
      <Card>
        <CardHeader>
          <CardTitle>Controle de Estoque</CardTitle>
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
                      {getStockIcon(ingredient)}
                      {getStockStatusBadge(ingredient)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{ingredient.name}</TableCell>
                  <TableCell>
                    <span className={`font-medium ${
                      getStockStatus(ingredient).status === 'danger' ? 'text-red-600' :
                      getStockStatus(ingredient).status === 'warning' ? 'text-yellow-600' :
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

      {/* Dialog para ajuste de estoque */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === 'add' ? 'Adicionar' : 'Remover'} Estoque
            </DialogTitle>
          </DialogHeader>
          
          {selectedIngredient && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selectedIngredient.name}</p>
                <p className="text-sm text-gray-600">
                  Estoque atual: {selectedIngredient.currentStock} {selectedIngredient.unit}
                </p>
              </div>
              
              <div>
                <Label htmlFor="quantity">
                  Quantidade a {adjustmentType === 'add' ? 'adicionar' : 'remover'} ({selectedIngredient.unit})
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={adjustmentQuantity}
                  onChange={(e) => setAdjustmentQuantity(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              
              {adjustmentType === 'add' && (
                <p className="text-sm text-gray-600">
                  Novo estoque: {(selectedIngredient.currentStock + adjustmentQuantity).toFixed(2)} {selectedIngredient.unit}
                </p>
              )}
              
              {adjustmentType === 'remove' && (
                <p className="text-sm text-gray-600">
                  Novo estoque: {Math.max(0, selectedIngredient.currentStock - adjustmentQuantity).toFixed(2)} {selectedIngredient.unit}
                </p>
              )}
              
              <div className="flex space-x-2">
                <Button 
                  onClick={handleStockAdjustment}
                  disabled={adjustmentQuantity <= 0}
                  className={adjustmentType === 'add' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}
                >
                  {adjustmentType === 'add' ? 'Adicionar' : 'Remover'} Estoque
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
