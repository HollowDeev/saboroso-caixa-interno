import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Product } from '@/types';

export const Products = () => {
  const { products, ingredients, addProduct, updateProduct } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: 0,
    description: '',
    preparationTime: 0,
    available: true
  });
  const [selectedIngredients, setSelectedIngredients] = useState<{ ingredientId: string, quantity: number }[]>([]);

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      price: 0,
      description: '',
      preparationTime: 0,
      available: true
    });
    setSelectedIngredients([]);
    setEditingProduct(null);
  };

  const addIngredientToProduct = () => {
    setSelectedIngredients([...selectedIngredients, { ingredientId: '', quantity: 0 }]);
  };

  const updateProductIngredient = (index: number, field: string, value: string | number) => {
    const updated = [...selectedIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedIngredients(updated);
  };

  const removeIngredientFromProduct = (index: number) => {
    setSelectedIngredients(selectedIngredients.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const productData = {
      ...formData,
      ingredients: selectedIngredients.filter(ing => ing.ingredientId && ing.quantity > 0)
    };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await addProduct(productData);
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      // Aqui você pode adicionar uma notificação de erro para o usuário
    }
  };

  const openEditDialog = (product: Product) => {
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price,
      description: product.description,
      preparationTime: product.preparationTime,
      available: product.available
    });
    setSelectedIngredients(product.ingredients);
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const getIngredientName = (ingredientId: string) => {
    const ingredient = ingredients.find(ing => ing.id === ingredientId);
    return ingredient ? ingredient.name : 'Ingrediente não encontrado';
  };

  const getIngredientUnit = (ingredientId: string) => {
    const ingredient = ingredients.find(ing => ing.id === ingredientId);
    return ingredient ? ingredient.unit : '';
  };

  const formatIngredientQuantity = (ingredientId: string, quantity: number) => {
    const unit = getIngredientUnit(ingredientId);

    // Formatação baseada na unidade
    if (unit === 'g' && quantity >= 1000) {
      return `${(quantity / 1000).toFixed(2)} kg`;
    } else if (unit === 'ml' && quantity >= 1000) {
      return `${(quantity / 1000).toFixed(2)} L`;
    } else {
      return `${quantity} ${unit}`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-600">Gerencie o cardápio do restaurante</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome do Produto</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Pizza, Bebida, Sobremesa..."
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="preparationTime">Tempo de Preparo (min)</Label>
                  <Input
                    id="preparationTime"
                    type="number"
                    value={formData.preparationTime}
                    onChange={(e) => setFormData({ ...formData, preparationTime: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Ingredientes</Label>
                  <Button type="button" size="sm" onClick={addIngredientToProduct}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedIngredients.map((ingredient, index) => {
                    const selectedIngredientData = ingredients.find(ing => ing.id === ingredient.ingredientId);
                    return (
                      <div key={index} className="flex space-x-2 items-end">
                        <div className="flex-1">
                          <Select
                            value={ingredient.ingredientId}
                            onValueChange={(value) => updateProductIngredient(index, 'ingredientId', value)}
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
                        <div className="w-32">
                          <Input
                            type="number"
                            step="0.001"
                            placeholder={`Qtd (${selectedIngredientData?.unit || 'unidade'})`}
                            value={ingredient.quantity}
                            onChange={(e) => updateProductIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => removeIngredientFromProduct(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={formData.available}
                  onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                />
                <Label htmlFor="available">Produto disponível</Label>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                  {editingProduct ? 'Atualizar' : 'Criar'} Produto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <Badge variant={product.available ? 'default' : 'secondary'}>
                  {product.available ? 'Disponível' : 'Indisponível'}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{product.category}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">{product.description}</p>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">R$ {product.price.toFixed(2)}</span>
                  <span className="text-sm text-gray-600">{product.preparationTime} min</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">Ingredientes:</p>
                  {product.ingredients.map((ing, index) => (
                    <p key={index} className="text-xs text-gray-600">
                      {formatIngredientQuantity(ing.ingredientId, ing.quantity)} de {getIngredientName(ing.ingredientId)}
                    </p>
                  ))}
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(product)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant={product.available ? 'secondary' : 'default'}
                    onClick={() => updateProduct(product.id, { available: !product.available })}
                  >
                    {product.available ? 'Desabilitar' : 'Habilitar'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum produto cadastrado ainda.</p>
            <p className="text-sm text-gray-500">Clique em "Novo Produto" para começar.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
