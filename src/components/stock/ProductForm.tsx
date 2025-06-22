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
import { ProductFormData, ProductIngredient, ExternalProduct, Ingredient } from '@/types';

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
  const { ingredients, externalProducts } = useApp();
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
      ingredient_name: '',
      quantity: 0,
      unit: 'unidade',
      type: 'ingredient',
    };
    onChange('ingredients', [...product.ingredients, newIngredient]);
  };

  const removeIngredient = (index: number) => {
    const updatedIngredients = product.ingredients.filter((_, i) => i !== index);
    onChange('ingredients', updatedIngredients);
  };

  const updateIngredient = (index: number, field: keyof ProductIngredient | 'type', value: string | number) => {
    const updatedIngredients = [...product.ingredients];
    if (field === 'type') {
      updatedIngredients[index] = {
        ...updatedIngredients[index],
        type: value as 'ingredient' | 'external_product',
        ingredient_id: '',
        ingredient_name: '',
        unit: 'unidade',
        quantity: 0,
      };
    } else if (field === 'ingredient_id') {
      const isExternal = updatedIngredients[index].type === 'external_product';
      const selected = isExternal
        ? externalProducts.find(prod => prod.id === value)
        : ingredients.find(ing => ing.id === value);
      if (selected) {
        updatedIngredients[index] = {
          ...updatedIngredients[index],
          ingredient_id: value as string,
          ingredient_name: selected.name,
          unit: !isExternal ? (selected as Ingredient).unit : 'unidade',
          quantity: updatedIngredients[index].quantity || 0,
        };
      }
    } else {
      updatedIngredients[index] = {
        ...updatedIngredients[index],
        [field]: value
      };
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
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Categoria *</Label>
        <Select
          value={product.category}
          onValueChange={(value) => onChange('category', value)}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="comida">Comida</SelectItem>
            <SelectItem value="bebida">Bebida</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Preço *</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0"
          value={product.price}
          onChange={(e) => onChange('price', parseFloat(e.target.value) || 0)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="preparation_time">Tempo de Preparo (minutos) *</Label>
        <Input
          id="preparation_time"
          type="number"
          min="0"
          value={product.preparation_time}
          onChange={(e) => onChange('preparation_time', parseInt(e.target.value) || 0)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={product.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
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
          const isExternal = productIngredient.type === 'external_product';
          const selectedList = isExternal ? externalProducts : ingredients;
          const selected = selectedList.find(i => i.id === productIngredient.ingredient_id);
          const availableUnits = isExternal ? ['1 und', '1/2 und', '1/4 und'] : getAvailableSubunits((selected && !isExternal) ? (selected as Ingredient).unit as Unit : 'unidade') || ['unidade'];
          
          return (
            <Card key={index} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={productIngredient.type || 'ingredient'}
                    onValueChange={value => updateIngredient(index, 'type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ingredient">Ingrediente</SelectItem>
                      <SelectItem value="external_product">Produto Externo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isExternal ? 'Produto Externo' : 'Ingrediente'}</Label>
                  <Select
                    value={productIngredient.ingredient_id || undefined}
                    onValueChange={value => updateIngredient(index, 'ingredient_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isExternal ? 'Selecione o produto externo' : 'Selecione o ingrediente'} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedList.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}{isExternal && (item as ExternalProduct).brand ? ` (${(item as ExternalProduct).brand})` : ''}{!isExternal ? ` (${(item as Ingredient).unit})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    step={isExternal ? 0.25 : 0.001}
                    min="0"
                    value={productIngredient.quantity}
                    onChange={e => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select
                    value={productIngredient.unit}
                    onValueChange={value => updateIngredient(index, 'unit', value)}
                    disabled={!productIngredient.ingredient_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUnits.map(unit => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
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
              {selected && productIngredient.quantity > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <span>Custo do {isExternal ? 'produto externo' : 'ingrediente'}:</span>
                    <Badge variant="secondary">
                      R$ {(() => {
                        try {
                          let cost = 0;
                          if (isExternal) {
                            let factor = 1;
                            if (productIngredient.unit === '1 und') factor = 1;
                            else if (productIngredient.unit === '1/2 und') factor = 0.5;
                            else if (productIngredient.unit === '1/4 und') factor = 0.25;
                            cost = factor * (selected as ExternalProduct).cost * productIngredient.quantity;
                          } else {
                            const quantityInBaseUnit = convertValue(
                              productIngredient.quantity,
                              productIngredient.unit as Unit,
                              (selected as Ingredient).unit as Unit
                            );
                            cost = quantityInBaseUnit * (selected as Ingredient).cost;
                          }
                          return cost.toFixed(2);
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
