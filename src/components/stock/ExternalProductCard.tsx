import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2, Plus, Minus, AlertTriangle } from 'lucide-react';
import { ExternalProduct } from '@/types';
import { ExternalProductForm } from './ExternalProductForm';
import { toast } from 'sonner';

interface ExternalProductCardProps {
  product: ExternalProduct;
  onUpdate: (id: string, updates: Partial<ExternalProduct>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddStock?: (id: string, quantity: number) => void;
  onRemoveStock?: (id: string, quantity: number) => void;
}

export const ExternalProductCard: React.FC<ExternalProductCardProps> = ({
  product,
  onUpdate,
  onDelete,
  onAddStock,
  onRemoveStock
}) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editedProduct, setEditedProduct] = useState(product);

  const getStockStatus = (currentStock: number, minStock: number) => {
    if (currentStock === 0) return { status: 'out', color: 'destructive', text: 'Sem estoque' };
    if (currentStock <= minStock) return { status: 'low', color: 'warning', text: 'Estoque baixo' };
    return { status: 'good', color: 'default', text: 'Em estoque' };
  };

  const stockStatus = getStockStatus(product.current_stock, product.min_stock);

  const handleEdit = async () => {
    try {
      await onUpdate(product.id, {
        name: editedProduct.name,
        brand: editedProduct.brand,
        description: editedProduct.description,
        cost: editedProduct.cost,
        price: editedProduct.price,
        current_stock: editedProduct.current_stock,
        min_stock: editedProduct.min_stock,
      });
      setIsEditOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast.error('Erro ao atualizar produto');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await onDelete(product.id);
      } catch (error) {
        console.error('Erro ao excluir produto:', error);
      }
    }
  };

  return (
    <>
      <Card className="w-full max-w-sm mx-auto hover:shadow-lg transition-shadow">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start gap-3">
            <CardTitle className="text-lg font-semibold break-words">{product.name}</CardTitle>
            <Badge variant={stockStatus.color as any} className="ml-2 flex-shrink-0 whitespace-nowrap">
              {stockStatus.status === 'out' && <AlertTriangle className="h-3 w-3 mr-2" />}
              {stockStatus.text}
            </Badge>
          </div>
          {product.brand && (
            <p className="text-sm text-gray-600 mt-2 break-words">Marca: {product.brand}</p>
          )}
          {product.description && (
            <p className="text-sm text-gray-600 mt-2 break-words">{product.description}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Estoque:</span>
              <p className="text-lg font-bold text-blue-600">{product.current_stock}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Mínimo:</span>
              <p className="text-lg text-gray-700">{product.min_stock}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Custo:</span>
              <p className="text-lg text-gray-700">R$ {product.cost.toFixed(2)}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Preço:</span>
              <p className="text-lg text-green-600">R$ {product.price.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              {onAddStock && (
                <Button
                  size="default"
                  variant="outline"
                  onClick={() => onAddStock(product.id, 1)}
                  className="flex-1 py-5 text-base font-medium"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Adicionar
                </Button>
              )}
              {onRemoveStock && product.current_stock > 0 && (
                <Button
                  size="default"
                  variant="outline"
                  onClick={() => onRemoveStock(product.id, 1)}
                  className="flex-1 py-5 text-base font-medium"
                >
                  <Minus className="h-5 w-5 mr-2" />
                  Remover
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                size="default"
                variant="outline"
                onClick={() => setIsEditOpen(true)}
                className="flex-1 py-5 text-base font-medium"
              >
                <Pencil className="h-5 w-5 mr-2" />
                Editar
              </Button>
              <Button
                size="default"
                variant="outline"
                onClick={handleDelete}
                className="flex-1 py-5 text-base font-medium"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Excluir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Produto Externo</DialogTitle>
          </DialogHeader>
          <ExternalProductForm
            product={editedProduct}
            onChange={(field, value) => setEditedProduct(prev => ({ ...prev, [field]: value }))}
            onSubmit={handleEdit}
            onCancel={() => setIsEditOpen(false)}
            submitLabel="Salvar Alterações"
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
