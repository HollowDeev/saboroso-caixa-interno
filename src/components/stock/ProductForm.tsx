import React, { useState, useEffect, useMemo } from 'react';
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
  onChange: (field: keyof ProductFormData, value: ProductFormData[keyof ProductFormData]) => void;
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

  // Memoize os ingredientes e unidades disponíveis para cada ingrediente do produto
  const productIngredientsData = useMemo(() => {
    console.log('Recalculando productIngredientsData:', { ingredients, productIngredients: product.ingredients });
    return product.ingredients.map(productIngredient => {
      const ingredient = ingredients.find(i => i.id === productIngredient.ingredient_id);
      let availableUnits: string[] = ['unidade'];
      
      if (ingredient?.unit) {
        try {
          console.log('Unidade base do ingrediente:', ingredient.unit);
          availableUnits = getAvailableSubunits(ingredient.unit as Unit);
          console.log('Unidades disponíveis:', availableUnits);
        } catch (error) {
          console.error('Erro ao obter subunidades:', error);
          console.error('Unidade base inválida:', ingredient.unit);
        }
      }
      
      console.log('Dados do ingrediente:', { productIngredient, ingredient, availableUnits });
      return { ingredient, availableUnits };
    });
  }, [ingredients, product.ingredients]);

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
      unit: ''  // Deixar vazio até que o ingrediente seja selecionado
    };
    console.log('Adicionando novo ingrediente:', newIngredient);
    onChange('ingredients', [...product.ingredients, newIngredient]);
  };

  const removeIngredient = (index: number) => {
    const updatedIngredients = product.ingredients.filter((_, i) => i !== index);
    onChange('ingredients', updatedIngredients);
  };

  const updateIngredient = (index: number, field: keyof ProductIngredient, value: string | number) => {
    console.log('Atualizando ingrediente:', { field, value });
    const updatedIngredients = [...product.ingredients];
    
    switch (field) {
      case 'ingredient_id': {
        const selectedIngredient = ingredients.find(i => i.id === value);
        if (selectedIngredient?.unit) {
          console.log('Ingrediente selecionado:', selectedIngredient);
          // Mantém a unidade atual se já estiver definida e for válida para o ingrediente
          const currentUnit = updatedIngredients[index].unit;
          const availableUnits = getAvailableSubunits(selectedIngredient.unit as Unit);
          const unit = availableUnits.includes(currentUnit) ? currentUnit : selectedIngredient.unit;
          
          updatedIngredients[index] = {
            ingredient_id: value as string,
            quantity: updatedIngredients[index].quantity || 0,
            unit
          };
          console.log('Ingrediente atualizado:', updatedIngredients[index]);
        } else {
          updatedIngredients[index] = {
            ingredient_id: value as string,
            quantity: 0,
            unit: 'unidade'
          };
        }
        break;
      }
      case 'unit':
        if (value) { // Só atualiza se houver um valor
          updatedIngredients[index] = {
            ...updatedIngredients[index],
            unit: value as string
          };
        }
        break;
      case 'quantity':
        updatedIngredients[index] = {
          ...updatedIngredients[index],
          quantity: value as number
        };
        break;
    }
    
    onChange('ingredients', updatedIngredients);
  };

  const getIngredientSubunits = (ingredientId: string) => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    console.log('Buscando subunidades para ingrediente:', ingredient);
    if (!ingredient) return ['unidade'];
    
    const baseUnit = ingredient.unit as Unit;
    console.log('Unidade base para subunidades:', baseUnit);
    const subunits = getAvailableSubunits(baseUnit);
    console.log('Subunidades disponíveis:', subunits);
    return subunits;
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
          const { ingredient, availableUnits } = productIngredientsData[index];
          
          return (
            <Card key={index} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Ingrediente</Label>
                  <Select
                    value={productIngredient.ingredient_id || undefined}
                    defaultValue=""
                    onValueChange={(value) => {
                      console.log('Selecionando ingrediente:', value);
                      updateIngredient(index, 'ingredient_id', value);
                    }}
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
                    onValueChange={(value) => {
                      if (value) {
                        console.log('Selecionando unidade:', value);
                        updateIngredient(index, 'unit', value);
                      }
                    }}
                    disabled={!productIngredient.ingredient_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
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
