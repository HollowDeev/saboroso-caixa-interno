
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ExternalProductFormProps {
  product: {
    name: string;
    brand?: string | null;
    description?: string | null;
    cost: number;
    price: number;
    current_stock: number;
    min_stock: number;
  };
  onChange: (field: string, value: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}

export const ExternalProductForm: React.FC<ExternalProductFormProps> = ({
  product,
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
          value={product.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Digite o nome do produto"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="brand">Marca</Label>
        <Input
          id="brand"
          value={product.brand || ''}
          onChange={(e) => onChange('brand', e.target.value || null)}
          placeholder="Digite a marca"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={product.description || ''}
          onChange={(e) => onChange('description', e.target.value || null)}
          placeholder="Descrição do produto"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="cost">Custo</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            value={product.cost}
            onChange={(e) => onChange('cost', Number(e.target.value))}
            placeholder="0.00"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="price">Preço</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={product.price}
            onChange={(e) => onChange('price', Number(e.target.value))}
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="current_stock">Estoque Atual</Label>
          <Input
            id="current_stock"
            type="number"
            value={product.current_stock}
            onChange={(e) => onChange('current_stock', Number(e.target.value))}
            placeholder="0"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="min_stock">Estoque Mínimo</Label>
          <Input
            id="min_stock"
            type="number"
            value={product.min_stock}
            onChange={(e) => onChange('min_stock', Number(e.target.value))}
            placeholder="0"
          />
        </div>
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
