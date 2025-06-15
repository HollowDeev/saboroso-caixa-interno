
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductFormData {
  name: string;
  description: string | null;
  price: number;
  cost: number;
  category: string;
  preparation_time: number;
  available: boolean;
}

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <div className="grid grid-cols-2 gap-4">
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
        <div className="space-y-2">
          <Label htmlFor="cost">Custo (R$) *</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            min="0"
            value={product.cost}
            onChange={(e) => onChange('cost', parseFloat(e.target.value) || 0)}
            placeholder="0,00"
            required
          />
        </div>
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
