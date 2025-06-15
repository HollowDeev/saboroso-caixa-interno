
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2, Clock, UtensilsCrossed } from 'lucide-react';
import { Product } from '@/types';
import { toast } from 'sonner';

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

  return (
    <>
      <Card className="w-full max-w-sm mx-auto hover:shadow-lg transition-shadow">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-semibold truncate">{product.name}</CardTitle>
            <Badge variant={product.available ? 'default' : 'secondary'} className="ml-2 flex-shrink-0">
              {product.available ? 'Disponível' : 'Indisponível'}
            </Badge>
          </div>
          {product.description && (
            <p className="text-sm text-gray-600 mt-1">{product.description}</p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-medium text-gray-700">Preço:</span>
              <p className="text-lg font-bold">R$ {product.price.toFixed(2)}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Custo:</span>
              <p className="text-lg">R$ {product.cost.toFixed(2)}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Categoria:</span>
              <p className="text-sm truncate">{product.category}</p>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1 text-gray-500" />
              <span className="text-sm">{product.preparation_time}min</span>
            </div>
          </div>

          {product.ingredients && product.ingredients.length > 0 && (
            <div>
              <span className="font-medium text-gray-700 text-sm">Ingredientes:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {product.ingredients.slice(0, 3).map((ing, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    <UtensilsCrossed className="h-3 w-3 mr-1" />
                    {ing.quantity} {ing.unit}
                  </Badge>
                ))}
                {product.ingredients.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{product.ingredients.length - 3} mais
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant={product.available ? "outline" : "default"}
              onClick={handleToggleAvailability}
              className="w-full"
            >
              {product.available ? 'Desabilitar' : 'Habilitar'}
            </Button>
            
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
    </>
  );
};
