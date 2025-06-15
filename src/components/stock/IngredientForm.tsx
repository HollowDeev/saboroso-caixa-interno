
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Unit } from '@/types';

interface IngredientFormProps {
  ingredient: {
    name: string;
    unit: Unit;
    current_stock: number;
    min_stock: number;
    cost: number;
    supplier: string;
    description: string | null;
  };
  onChange: (field: string, value: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}

export const IngredientForm: React.FC<IngredientFormProps> = ({
  ingredient,
  onChange,
  onSubmit,
  onCancel,
  submitLabel
}) => {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          value={ingredient.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Digite o nome do ingrediente"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="unit">Unidade</Label>
        <Select
          value={ingredient.unit}
          onValueChange={(value) => onChange('unit', value as Unit)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a unidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="kg">Quilograma (kg)</SelectItem>
            <SelectItem value="g">Grama (g)</SelectItem>
            <SelectItem value="mg">Miligrama (mg)</SelectItem>
            <SelectItem value="L">Litro (L)</SelectItem>
            <SelectItem value="ml">Mililitro (ml)</SelectItem>
            <SelectItem value="unidade">Unidade</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="current_stock">Estoque Atual</Label>
          <Input
            id="current_stock"
            type="number"
            value={ingredient.current_stock}
            onChange={(e) => onChange('current_stock', Number(e.target.value))}
            placeholder="0"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="min_stock">Estoque Mínimo</Label>
          <Input
            id="min_stock"
            type="number"
            value={ingredient.min_stock}
            onChange={(e) => onChange('min_stock', Number(e.target.value))}
            placeholder="0"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cost">Custo por unidade</Label>
        <Input
          id="cost"
          type="number"
          step="0.01"
          value={ingredient.cost}
          onChange={(e) => onChange('cost', Number(e.target.value))}
          placeholder="0.00"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="supplier">Fornecedor</Label>
        <Input
          id="supplier"
          value={ingredient.supplier}
          onChange={(e) => onChange('supplier', e.target.value)}
          placeholder="Nome do fornecedor"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={ingredient.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Descrição opcional"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={onSubmit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
};
