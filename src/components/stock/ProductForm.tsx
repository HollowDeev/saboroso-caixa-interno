
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { Plus, Trash2 } from 'lucide-react';
import { convertValue, getAvailableSubunits, Unit } from '@/utils/unitConversion';
import { ProductFormData, ProductIngredient } from '@/types';

interface ProductFormProps {
  product: ProductFormData;
  onChange: (field: keyof ProductFormData, value: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  product,
  onChange,
  onSubmit,
  onCancel,
  submitLabel
}) => {
  const { ingredients } = useApp();
  const [calculatedCost, setCalculatedCost] = useState(0);

  const categories = [
    'Lanches',
    'Pizzas',
    'Bebidas',
    'Sobremesas',
    'Pratos Principais',
    'Entradas',
    'Saladas',
    'Outros'
  ];

  // Calcular custo automaticamente quando ingredientes mudarem
  useEffect(() => {
    const totalCost = product.ingredients.reduce((total, productIngredient) => {
      const ingredient = ingredients.find(i => i.id === productIngredient.ingredient_id);
      if (!ingredient) return total;

      try {
        // Converter a quantidade para a unidade base do ingrediente
        const quantityInBaseUnit = convertValue(
          productIngredient.quantity,
          productIngredient.unit as Unit,
          ingredient.unit as Unit
        );
        
        const cost = quantityInBaseUnit * ingredient.cost;
        return total + cost;
      } catch (error) {
        console.error('Erro ao converter unidade:', error);
        return total;
      }
    }, 0);

    setCalculatedCost(totalCost);
    onChange('cost', totalCost);
  }, [product.ingredients, ingredients, onChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const addIngredient = () => {
    const newIngredient: ProductIngredient = {
      ingredient_id: '',
      quantity: 0,
      unit: 'kg'
    };
    onChange('ingredients', [...product.ingredients, newIngredient]);
  };

  const removeIngredient = (index: number) => {
    const updatedIngredients = product.ingredients.filter((_, i) => i !== index);
    onChange('ingredients', updatedIngredients);
  };

  const updateIngredient = (index: number, field: keyof ProductIngredient, value: any) => {
    const updatedIngredients = [...product.ingredients];
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
    
    // Se mudou o ingrediente, atualizar a unidade para a unidade base do ingrediente
    if (field === 'ingredient_id') {
      const selectedIngredient = ingredients.find(i => i.id === value);
      if (selectedIngredient) {
        updatedIngredients[index].unit = selectedIngredient.unit;
      }
    }
    
    onChange('ingredients', updatedIngredients);
  };

  const getIngredientSubunits = (ingredientId: string) => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    if (!ingredient) return ['unidade'];
    return getAvailableSubunits(ingredient.unit as Unit);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto">
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          type="text"
          value={product.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Nome do produto"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={product.description || ''}
          onChange={(e) => onChange('description', e.target.value || null)}
          placeholder="Descrição do produto"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Categoria *</Label>
        <Select
          value={product.category}
          onValueChange={(value) => onChange('category', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="preparation_time">Tempo de Preparo (minutos) *</Label>
        <Input
          id="preparation_time"
          type="number"
          min="0"
          value={product.preparation_time}
          onChange={(e) => onChange('preparation_time', parseInt(e.target.value) || 0)}
          placeholder="0"
          required
        />
      </div>

      {/* Seção de Ingredientes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Ingredientes</Label>
          <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Ingrediente
          </Button>
        </div>

        {product.ingredients.map((productIngredient, index) => {
          const ingredient = ingredients.find(i => i.id === productIngredient.ingredient_id);
          const availableUnits = getIngredientSubunits(productIngredient.ingredient_id);
          
          return (
            <Card key={index} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Ingrediente</Label>
                  <Select
                    value={productIngredient.ingredient_id}
                    onValueChange={(value) => updateIngredient(index, 'ingredient_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ingrediente" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map((ing) => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={productIngredient.quantity}
                    onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select
                    value={productIngredient.unit}
                    onValueChange={(value) => updateIngredient(index, 'unit', value)}
                    disabled={!productIngredient.ingredient_id}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUnits.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeIngredient(index)}
                  className="h-10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {ingredient && productIngredient.quantity > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <span>Custo do ingrediente:</span>
                    <Badge variant="secondary">
                      R$ {(() => {
                        try {
                          const quantityInBaseUnit = convertValue(
                            productIngredient.quantity,
                            productIngredient.unit as Unit,
                            ingredient.unit as Unit
                          );
                          return (quantityInBaseUnit * ingredient.cost).toFixed(2);
                        } catch (error) {
                          return '0.00';
                        }
                      })()}
                    </Badge>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Resumo de Custos */}
      <Card className="bg-gray-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Resumo de Custos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">Custo Total dos Ingredientes:</span>
            <Badge variant="secondary" className="text-base">
              R$ {calculatedCost.toFixed(2)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="price">Preço de Venda (R$) *</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0"
          value={product.price}
          onChange={(e) => onChange('price', parseFloat(e.target.value) || 0)}
          placeholder="0,00"
          required
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
