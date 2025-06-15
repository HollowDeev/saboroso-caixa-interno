
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2, Plus, Minus, AlertTriangle } from 'lucide-react';
import { Ingredient } from '@/types';
import { IngredientForm } from './IngredientForm';
import { toast } from 'sonner';

interface IngredientCardProps {
  ingredient: Ingredient;
  onUpdate: (id: string, updates: Partial<Ingredient>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddStock?: (id: string, quantity: number) => void;
  onRemoveStock?: (id: string, quantity: number) => void;
}

export const IngredientCard: React.FC<IngredientCardProps> = ({
  ingredient,
  onUpdate,
  onDelete,
  onAddStock,
  onRemoveStock
}) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editedIngredient, setEditedIngredient] = useState(ingredient);

  const getStockStatus = (currentStock: number, minStock: number) => {
    if (currentStock === 0) return { status: 'out', color: 'destructive', text: 'Sem estoque' };
    if (currentStock <= minStock) return { status: 'low', color: 'warning', text: 'Estoque baixo' };
    return { status: 'good', color: 'default', text: 'Em estoque' };
  };

  const stockStatus = getStockStatus(ingredient.current_stock, ingredient.min_stock);

  const handleEdit = async () => {
    try {
      await onUpdate(ingredient.id, {
        name: editedIngredient.name,
        unit: editedIngredient.unit,
        current_stock: editedIngredient.current_stock,
        min_stock: editedIngredient.min_stock,
        cost: editedIngredient.cost,
        supplier: editedIngredient.supplier,
        description: editedIngredient.description,
      });
      setIsEditOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar ingrediente:', error);
      toast.error('Erro ao atualizar ingrediente');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja excluir este ingrediente?')) {
      try {
        await onDelete(ingredient.id);
      } catch (error) {
        console.error('Erro ao excluir ingrediente:', error);
      }
    }
  };

  return (
    <>
      <Card className="w-full max-w-sm mx-auto hover:shadow-lg transition-shadow">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-semibold truncate">{ingredient.name}</CardTitle>
            <Badge variant={stockStatus.color as any} className="ml-2 flex-shrink-0">
              {stockStatus.status === 'out' && <AlertTriangle className="h-3 w-3 mr-1" />}
              {stockStatus.text}
            </Badge>
          </div>
          {ingredient.description && (
            <p className="text-sm text-gray-600 mt-1">{ingredient.description}</p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-medium text-gray-700">Estoque:</span>
              <p className="text-lg font-bold">{ingredient.current_stock} {ingredient.unit}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Mínimo:</span>
              <p className="text-lg">{ingredient.min_stock} {ingredient.unit}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Custo:</span>
              <p className="text-lg">R$ {ingredient.cost.toFixed(2)}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Fornecedor:</span>
              <p className="text-sm truncate">{ingredient.supplier || '-'}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              {onAddStock && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddStock(ingredient.id, 1)}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              )}
              {onRemoveStock && ingredient.current_stock > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemoveStock(ingredient.id, 1)}
                  className="flex-1"
                >
                  <Minus className="h-4 w-4 mr-1" />
                  Remover
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditOpen(true)}
                className="flex-1"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDelete}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Ingrediente</DialogTitle>
          </DialogHeader>
          <IngredientForm
            ingredient={editedIngredient}
            onChange={(field, value) => setEditedIngredient(prev => ({ ...prev, [field]: value }))}
            onSubmit={handleEdit}
            onCancel={() => setIsEditOpen(false)}
            submitLabel="Salvar Alterações"
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
