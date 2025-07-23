import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2, Clock, UtensilsCrossed } from 'lucide-react';
import { Product, ProductFormData } from '@/types';
import { toast } from 'sonner';
import { ProductForm } from './ProductForm';

interface ProductCardProps {
  product: Product;
  onUpdate: (id: string, updates: Partial<Product>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onUpdate,
  onDelete,
}) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<ProductFormData | null>(null);

  const handleToggleAvailability = async () => {
    try {
      await onUpdate(product.id, { available: !product.available });
      toast.success(`Produto ${product.available ? 'desabilitado' : 'habilitado'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao atualizar disponibilidade:', error);
      toast.error('Erro ao atualizar disponibilidade');
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

  const handleEdit = () => {
    setEditData({
      name: product.name,
      description: product.description,
      price: product.price,
      cost: product.cost,
      available: product.available,
      category: product.category,
      preparation_time: product.preparation_time,
      ingredients: product.ingredients || [],
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editData) return;
    try {
      await onUpdate(product.id, editData);
      setIsEditOpen(false);
      toast.success('Comida atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar comida:', error);
      toast.error('Erro ao atualizar comida');
    }
  };

  return (
    <>
      <Card className="w-full max-w-sm mx-auto hover:shadow-lg transition-shadow">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start gap-3">
            <CardTitle className="text-lg font-semibold break-words">{product.name}</CardTitle>
            <Badge variant={product.available ? 'default' : 'secondary'} className="ml-2 flex-shrink-0 whitespace-nowrap">
              {product.available ? 'Disponível' : 'Indisponível'}
            </Badge>
          </div>
          {product.description && (
            <p className="text-sm text-gray-600 mt-2 break-words">{product.description}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Preço:</span>
              <p className="text-lg font-bold text-green-600">R$ {product.price.toFixed(2)}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Custo:</span>
              <p className="text-lg text-gray-700">R$ {product.cost.toFixed(2)}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Categoria:</span>
              <p className="text-sm break-words">{product.category}</p>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-blue-500" />
              <span className="text-sm">{product.preparation_time}min</span>
            </div>
          </div>

          {product.ingredients && product.ingredients.length > 0 && (
            <div>
              <span className="font-medium text-gray-700 text-sm block mb-2">Ingredientes:</span>
              <div className="flex flex-wrap gap-2">
                {product.ingredients.slice(0, 3).map((ing, index) => {
                  return (
                    <Badge key={index} variant="outline" className="text-xs py-1 px-2">
                      <UtensilsCrossed className="h-3 w-3 mr-2" />
                      {ing.ingredient_name || 'Sem nome'}: {ing.quantity} {ing.unit}
                    </Badge>
                  );
                })}
                {product.ingredients.length > 3 && (
                  <Badge variant="outline" className="text-xs py-1 px-2">
                    +{product.ingredients.length - 3} mais
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button
              size="default"
              variant={product.available ? "outline" : "default"}
              onClick={handleToggleAvailability}
              className="w-full py-5 text-base font-medium"
            >
              {product.available ? 'Desabilitar' : 'Habilitar'}
            </Button>

            <div className="flex gap-3">
              <Button
                size="default"
                variant="outline"
                onClick={handleEdit}
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
      {/* Modal de edição de comida */}
      {isEditOpen && editData && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Editar Comida</DialogTitle>
            </DialogHeader>
            <ProductForm
              product={editData}
              onChange={(field, value) => setEditData(prev => prev ? { ...prev, [field]: value } : prev)}
              onSubmit={handleEditSubmit}
              onCancel={() => setIsEditOpen(false)}
              submitLabel="Salvar Alterações"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
