
import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Ingredient, ExternalProduct, Product, FoodIngredient, Unit } from '@/types';
import { convertValue, getAvailableSubunits } from '@/utils/unitConversion';
import { Plus, Pencil, Trash2, AlertTriangle, Package, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

// Local interfaces for form state
interface LocalExternalProduct {
  name: string;
  brand: string;
  description?: string;
  cost: number;
  price: number;
  current_stock: number;
  min_stock: number;
}

export const StockManagement = () => {
  const { 
    currentUser,
    ingredients, 
    externalProducts, 
    products, 
    addIngredient, 
    updateIngredient, 
    deleteIngredient,
    addExternalProduct,
    updateExternalProduct,
    deleteExternalProduct,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock
  } = useAppContext();

  // State management
  const [activeTab, setActiveTab] = useState('ingredients');
  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false);
  const [isEditIngredientOpen, setIsEditIngredientOpen] = useState(false);
  const [isAddExternalProductOpen, setIsAddExternalProductOpen] = useState(false);
  const [isEditExternalProductOpen, setIsEditExternalProductOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [selectedExternalProduct, setSelectedExternalProduct] = useState<ExternalProduct | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form states
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    unit: 'kg' as Unit,
    current_stock: 0,
    min_stock: 0,
    cost: 0,
    supplier: '',
    description: null as string | null,
  });

  const [newExternalProduct, setNewExternalProduct] = useState<LocalExternalProduct>({
    name: '',
    brand: '',
    description: '',
    cost: 0,
    price: 0,
    current_stock: 0,
    min_stock: 0,
  });

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    cost: 0,
    available: true,
    category: '',
    preparation_time: 0,
    ingredients: [] as { ingredient_id: string; quantity: number; unit: string; }[],
  });

  const [editProduct, setEditProduct] = useState({
    name: '',
    description: '',
    price: 0,
    cost: 0,
    available: true,
    category: '',
    preparation_time: 0,
    ingredients: [] as { ingredient_id: string; quantity: number; unit: Unit; }[],
  });

  // Helper functions
  const resetNewIngredient = () => {
    setNewIngredient({
      name: '',
      unit: 'kg' as Unit,
      current_stock: 0,
      min_stock: 0,
      cost: 0,
      supplier: '',
      description: null,
    });
  };

  const resetNewExternalProduct = () => {
    setNewExternalProduct({
      name: '',
      brand: '',
      description: '',
      cost: 0,
      price: 0,
      current_stock: 0,
      min_stock: 0,
    });
  };

  const resetNewProduct = () => {
    setNewProduct({
      name: '',
      description: '',
      price: 0,
      cost: 0,
      available: true,
      category: '',
      preparation_time: 0,
      ingredients: [],
    });
  };

  // Event handlers
  const handleAddIngredient = async () => {
    if (!currentUser?.id) {
      toast.error('Usuário não encontrado');
      return;
    }

    try {
      await addIngredient({
        ...newIngredient,
        owner_id: currentUser.id,
      });
      setIsAddIngredientOpen(false);
      resetNewIngredient();
      toast.success('Ingrediente adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar ingrediente:', error);
      toast.error('Erro ao adicionar ingrediente');
    }
  };

  const handleEditIngredient = async () => {
    if (!selectedIngredient || !currentUser?.id) return;

    try {
      await updateIngredient(selectedIngredient.id, {
        name: selectedIngredient.name,
        unit: selectedIngredient.unit,
        current_stock: selectedIngredient.current_stock,
        min_stock: selectedIngredient.min_stock,
        cost: selectedIngredient.cost,
        supplier: selectedIngredient.supplier,
        description: selectedIngredient.description,
      });
      setIsEditIngredientOpen(false);
      setSelectedIngredient(null);
      toast.success('Ingrediente atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar ingrediente:', error);
      toast.error('Erro ao atualizar ingrediente');
    }
  };

  const handleDeleteIngredient = async (id: string) => {
    try {
      await deleteIngredient(id);
      toast.success('Ingrediente excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir ingrediente:', error);
      toast.error('Erro ao excluir ingrediente');
    }
  };

  const handleAddProduct = async () => {
    if (!currentUser?.id) {
      toast.error('Usuário não encontrado');
      return;
    }

    try {
      const productData = {
        ...newProduct,
        owner_id: currentUser.id,
      };

      // Remove ingredients from product data since they're handled separately
      const { ingredients, ...productDataWithoutIngredients } = productData;

      await addProduct(productDataWithoutIngredients);

      setIsAddProductOpen(false);
      resetNewProduct();
      toast.success('Produto adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      toast.error('Erro ao adicionar produto');
    }
  };

  const handleEditProduct = async () => {
    if (!selectedProduct) return;

    try {
      await updateProduct(selectedProduct.id, {
        name: editProduct.name,
        description: editProduct.description,
        price: editProduct.price,
        cost: editProduct.cost,
        available: editProduct.available,
        category: editProduct.category,
        preparation_time: editProduct.preparation_time,
      });

      setIsEditProductOpen(false);
      setSelectedProduct(null);
      toast.success('Produto atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast.error('Erro ao atualizar produto');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProduct(id);
      toast.success('Produto excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  const handleAddExternalProduct = async () => {
    if (!currentUser?.id) {
      toast.error('Usuário não encontrado');
      return;
    }

    try {
      await addExternalProduct({
        ...newExternalProduct,
        owner_id: currentUser.id,
      });
      setIsAddExternalProductOpen(false);
      resetNewExternalProduct();
      toast.success('Produto externo adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar produto externo:', error);
      toast.error('Erro ao adicionar produto externo');
    }
  };

  const handleEditExternalProduct = async () => {
    if (!selectedExternalProduct) return;

    try {
      await updateExternalProduct(selectedExternalProduct.id, {
        name: selectedExternalProduct.name,
        brand: selectedExternalProduct.brand,
        description: selectedExternalProduct.description,
        cost: selectedExternalProduct.cost,
        price: selectedExternalProduct.price,
        current_stock: selectedExternalProduct.current_stock,
        min_stock: selectedExternalProduct.min_stock,
      });
      setIsEditExternalProductOpen(false);
      setSelectedExternalProduct(null);
      toast.success('Produto externo atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar produto externo:', error);
      toast.error('Erro ao atualizar produto externo');
    }
  };

  const handleDeleteExternalProduct = async (id: string) => {
    try {
      await deleteExternalProduct(id);
      toast.success('Produto externo excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir produto externo:', error);
      toast.error('Erro ao excluir produto externo');
    }
  };

  const openEditIngredient = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setIsEditIngredientOpen(true);
  };

  const openEditExternalProduct = (product: ExternalProduct) => {
    setSelectedExternalProduct(product);
    setIsEditExternalProductOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setEditProduct({
      name: product.name,
      description: product.description || '',
      price: product.price,
      cost: product.cost,
      available: product.available,
      category: product.category,
      preparation_time: product.preparation_time,
      ingredients: (product.ingredients || []).map(ing => ({
        ingredient_id: ing.ingredient_id,
        quantity: ing.quantity,
        unit: ing.unit as Unit,
      })),
    });
    setIsEditProductOpen(true);
  };

  const addIngredientToProduct = () => {
    setNewProduct(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { ingredient_id: '', quantity: 0, unit: 'kg' }]
    }));
  };

  const removeIngredientFromProduct = (index: number) => {
    setNewProduct(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const updateProductIngredient = (index: number, field: string, value: any) => {
    setNewProduct(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      )
    }));
  };

  const addIngredientToEditProduct = () => {
    setEditProduct(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { ingredient_id: '', quantity: 0, unit: 'kg' as Unit }]
    }));
  };

  const removeIngredientFromEditProduct = (index: number) => {
    setEditProduct(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const updateEditProductIngredient = (index: number, field: string, value: any) => {
    setEditProduct(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      )
    }));
  };

  const getStockStatus = (currentStock: number, minStock: number) => {
    if (currentStock === 0) return { status: 'out', color: 'destructive', text: 'Sem estoque' };
    if (currentStock <= minStock) return { status: 'low', color: 'warning', text: 'Estoque baixo' };
    return { status: 'good', color: 'default', text: 'Em estoque' };
  };

  const calculateProductCost = (ingredientsList: { ingredient_id: string; quantity: number; unit: string; }[]) => {
    return ingredientsList.reduce((total, productIngredient) => {
      const ingredient = ingredients.find(ing => ing.id === productIngredient.ingredient_id);
      if (!ingredient) return total;

      try {
        const convertedQuantity = convertValue(
          productIngredient.quantity,
          productIngredient.unit as Unit,
          ingredient.unit as Unit
        );
        return total + (convertedQuantity * ingredient.cost);
      } catch (error) {
        console.error('Erro na conversão de unidades:', error);
        return total;
      }
    }, 0);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciamento de Estoque</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ingredients" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Ingredientes
          </TabsTrigger>
          <TabsTrigger value="external-products" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Produtos Externos
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Produtos
          </TabsTrigger>
        </TabsList>

        {/* Ingredients Tab */}
        <TabsContent value="ingredients" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Ingredientes</h2>
            <Dialog open={isAddIngredientOpen} onOpenChange={setIsAddIngredientOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Ingrediente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Ingrediente</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={newIngredient.name}
                      onChange={(e) => setNewIngredient(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Digite o nome do ingrediente"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="unit">Unidade</Label>
                    <Select
                      value={newIngredient.unit}
                      onValueChange={(value) => setNewIngredient(prev => ({ ...prev, unit: value as Unit }))}
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
                        value={newIngredient.current_stock}
                        onChange={(e) => setNewIngredient(prev => ({ ...prev, current_stock: Number(e.target.value) }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="min_stock">Estoque Mínimo</Label>
                      <Input
                        id="min_stock"
                        type="number"
                        value={newIngredient.min_stock}
                        onChange={(e) => setNewIngredient(prev => ({ ...prev, min_stock: Number(e.target.value) }))}
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
                      value={newIngredient.cost}
                      onChange={(e) => setNewIngredient(prev => ({ ...prev, cost: Number(e.target.value) }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="supplier">Fornecedor</Label>
                    <Input
                      id="supplier"
                      value={newIngredient.supplier}
                      onChange={(e) => setNewIngredient(prev => ({ ...prev, supplier: e.target.value }))}
                      placeholder="Nome do fornecedor"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={newIngredient.description || ''}
                      onChange={(e) => setNewIngredient(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição opcional"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddIngredientOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddIngredient}>
                    Adicionar Ingrediente
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Ingredientes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Estoque Atual</TableHead>
                    <TableHead>Estoque Mínimo</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredients.map((ingredient) => {
                    const stockStatus = getStockStatus(ingredient.current_stock, ingredient.min_stock);
                    return (
                      <TableRow key={ingredient.id}>
                        <TableCell className="font-medium">{ingredient.name}</TableCell>
                        <TableCell>{ingredient.unit}</TableCell>
                        <TableCell>{ingredient.current_stock}</TableCell>
                        <TableCell>{ingredient.min_stock}</TableCell>
                        <TableCell>R$ {ingredient.cost.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={stockStatus.color as any}>
                            {stockStatus.status === 'out' && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {stockStatus.text}
                          </Badge>
                        </TableCell>
                        <TableCell>{ingredient.supplier || '-'}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditIngredient(ingredient)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteIngredient(ingredient.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* External Products Tab */}
        <TabsContent value="external-products" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Produtos Externos</h2>
            <Dialog open={isAddExternalProductOpen} onOpenChange={setIsAddExternalProductOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produto Externo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Produto Externo</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={newExternalProduct.name}
                      onChange={(e) => setNewExternalProduct(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Digite o nome do produto"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="brand">Marca</Label>
                    <Input
                      id="brand"
                      value={newExternalProduct.brand}
                      onChange={(e) => setNewExternalProduct(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder="Digite a marca"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={newExternalProduct.description}
                      onChange={(e) => setNewExternalProduct(prev => ({ ...prev, description: e.target.value }))}
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
                        value={newExternalProduct.cost}
                        onChange={(e) => setNewExternalProduct(prev => ({ ...prev, cost: Number(e.target.value) }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="price">Preço</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={newExternalProduct.price}
                        onChange={(e) => setNewExternalProduct(prev => ({ ...prev, price: Number(e.target.value) }))}
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
                        value={newExternalProduct.current_stock}
                        onChange={(e) => setNewExternalProduct(prev => ({ ...prev, current_stock: Number(e.target.value) }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="min_stock">Estoque Mínimo</Label>
                      <Input
                        id="min_stock"
                        type="number"
                        value={newExternalProduct.min_stock}
                        onChange={(e) => setNewExternalProduct(prev => ({ ...prev, min_stock: Number(e.target.value) }))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddExternalProductOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddExternalProduct}>
                    Adicionar Produto
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Produtos Externos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Estoque Atual</TableHead>
                    <TableHead>Estoque Mínimo</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {externalProducts.map((product) => {
                    const stockStatus = getStockStatus(product.current_stock, product.min_stock);
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.brand || '-'}</TableCell>
                        <TableCell>{product.current_stock}</TableCell>
                        <TableCell>{product.min_stock}</TableCell>
                        <TableCell>R$ {product.cost.toFixed(2)}</TableCell>
                        <TableCell>R$ {product.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={stockStatus.color as any}>
                            {stockStatus.status === 'out' && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {stockStatus.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditExternalProduct(product)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteExternalProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Produtos</h2>
            <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Produto</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Digite o nome do produto"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={newProduct.description}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição do produto"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                      <Label htmlFor="price">Preço</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, price: Number(e.target.value) }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="preparation_time">Tempo de Preparo (min)</Label>
                      <Input
                        id="preparation_time"
                        type="number"
                        value={newProduct.preparation_time}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, preparation_time: Number(e.target.value) }))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Input
                      id="category"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="Categoria do produto"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <div className="flex justify-between items-center">
                      <Label>Ingredientes</Label>
                      <Button type="button" onClick={addIngredientToProduct} size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Ingrediente
                      </Button>
                    </div>
                    {newProduct.ingredients.map((ingredient, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-6">
                          <Select
                            value={ingredient.ingredient_id}
                            onValueChange={(value) => updateProductIngredient(index, 'ingredient_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o ingrediente" />
                            </SelectTrigger>
                            <SelectContent>
                              {ingredients.map((ing) => (
                                <SelectItem key={ing.id} value={ing.id}>
                                  {ing.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Qtd"
                            value={ingredient.quantity}
                            onChange={(e) => updateProductIngredient(index, 'quantity', Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-3">
                          <Select
                            value={ingredient.unit}
                            onValueChange={(value) => updateProductIngredient(index, 'unit', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Unidade" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="g">g</SelectItem>
                              <SelectItem value="mg">mg</SelectItem>
                              <SelectItem value="L">L</SelectItem>
                              <SelectItem value="ml">ml</SelectItem>
                              <SelectItem value="unidade">unidade</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeIngredientFromProduct(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-2">
                    <Label>Custo Calculado</Label>
                    <div className="text-lg font-semibold">
                      R$ {calculateProductCost(newProduct.ingredients).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddProductOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddProduct}>
                    Adicionar Produto
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Produtos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Margem</TableHead>
                    <TableHead>Tempo Preparo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const margin = product.price > 0 ? ((product.price - product.cost) / product.price * 100) : 0;
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>R$ {product.price.toFixed(2)}</TableCell>
                        <TableCell>R$ {product.cost.toFixed(2)}</TableCell>
                        <TableCell>{margin.toFixed(1)}%</TableCell>
                        <TableCell>{product.preparation_time}min</TableCell>
                        <TableCell>
                          <Badge variant={product.available ? 'default' : 'secondary'}>
                            {product.available ? 'Disponível' : 'Indisponível'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditProduct(product)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Ingredient Dialog */}
      <Dialog open={isEditIngredientOpen} onOpenChange={setIsEditIngredientOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Ingrediente</DialogTitle>
          </DialogHeader>
          {selectedIngredient && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={selectedIngredient.name}
                  onChange={(e) => setSelectedIngredient(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  placeholder="Digite o nome do ingrediente"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-unit">Unidade</Label>
                <Select
                  value={selectedIngredient.unit}
                  onValueChange={(value) => setSelectedIngredient(prev => prev ? ({ ...prev, unit: value }) : null)}
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
                  <Label htmlFor="edit-current_stock">Estoque Atual</Label>
                  <Input
                    id="edit-current_stock"
                    type="number"
                    value={selectedIngredient.current_stock}
                    onChange={(e) => setSelectedIngredient(prev => prev ? ({ ...prev, current_stock: Number(e.target.value) }) : null)}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-min_stock">Estoque Mínimo</Label>
                  <Input
                    id="edit-min_stock"
                    type="number"
                    value={selectedIngredient.min_stock}
                    onChange={(e) => setSelectedIngredient(prev => prev ? ({ ...prev, min_stock: Number(e.target.value) }) : null)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-cost">Custo por unidade</Label>
                <Input
                  id="edit-cost"
                  type="number"
                  step="0.01"
                  value={selectedIngredient.cost}
                  onChange={(e) => setSelectedIngredient(prev => prev ? ({ ...prev, cost: Number(e.target.value) }) : null)}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-supplier">Fornecedor</Label>
                <Input
                  id="edit-supplier"
                  value={selectedIngredient.supplier || ''}
                  onChange={(e) => setSelectedIngredient(prev => prev ? ({ ...prev, supplier: e.target.value }) : null)}
                  placeholder="Nome do fornecedor"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea
                  id="edit-description"
                  value={selectedIngredient.description || ''}
                  onChange={(e) => setSelectedIngredient(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                  placeholder="Descrição opcional"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditIngredientOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditIngredient}>
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit External Product Dialog */}
      <Dialog open={isEditExternalProductOpen} onOpenChange={setIsEditExternalProductOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Produto Externo</DialogTitle>
          </DialogHeader>
          {selectedExternalProduct && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-ext-name">Nome</Label>
                <Input
                  id="edit-ext-name"
                  value={selectedExternalProduct.name}
                  onChange={(e) => setSelectedExternalProduct(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  placeholder="Digite o nome do produto"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-ext-brand">Marca</Label>
                <Input
                  id="edit-ext-brand"
                  value={selectedExternalProduct.brand || ''}
                  onChange={(e) => setSelectedExternalProduct(prev => prev ? ({ ...prev, brand: e.target.value }) : null)}
                  placeholder="Digite a marca"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-ext-description">Descrição</Label>
                <Textarea
                  id="edit-ext-description"
                  value={selectedExternalProduct.description || ''}
                  onChange={(e) => setSelectedExternalProduct(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                  placeholder="Descrição do produto"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-ext-cost">Custo</Label>
                  <Input
                    id="edit-ext-cost"
                    type="number"
                    step="0.01"
                    value={selectedExternalProduct.cost}
                    onChange={(e) => setSelectedExternalProduct(prev => prev ? ({ ...prev, cost: Number(e.target.value) }) : null)}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-ext-price">Preço</Label>
                  <Input
                    id="edit-ext-price"
                    type="number"
                    step="0.01"
                    value={selectedExternalProduct.price}
                    onChange={(e) => setSelectedExternalProduct(prev => prev ? ({ ...prev, price: Number(e.target.value) }) : null)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-ext-current_stock">Estoque Atual</Label>
                  <Input
                    id="edit-ext-current_stock"
                    type="number"
                    value={selectedExternalProduct.current_stock}
                    onChange={(e) => setSelectedExternalProduct(prev => prev ? ({ ...prev, current_stock: Number(e.target.value) }) : null)}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-ext-min_stock">Estoque Mínimo</Label>
                  <Input
                    id="edit-ext-min_stock"
                    type="number"
                    value={selectedExternalProduct.min_stock}
                    onChange={(e) => setSelectedExternalProduct(prev => prev ? ({ ...prev, min_stock: Number(e.target.value) }) : null)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditExternalProductOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditExternalProduct}>
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-prod-name">Nome</Label>
              <Input
                id="edit-prod-name"
                value={editProduct.name}
                onChange={(e) => setEditProduct(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Digite o nome do produto"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-prod-description">Descrição</Label>
              <Textarea
                id="edit-prod-description"
                value={editProduct.description}
                onChange={(e) => setEditProduct(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do produto"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-prod-price">Preço</Label>
                <Input
                  id="edit-prod-price"
                  type="number"
                  step="0.01"
                  value={editProduct.price}
                  onChange={(e) => setEditProduct(prev => ({ ...prev, price: Number(e.target.value) }))}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-prod-preparation_time">Tempo de Preparo (min)</Label>
                <Input
                  id="edit-prod-preparation_time"
                  type="number"
                  value={editProduct.preparation_time}
                  onChange={(e) => setEditProduct(prev => ({ ...prev, preparation_time: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-prod-category">Categoria</Label>
              <Input
                id="edit-prod-category"
                value={editProduct.category}
                onChange={(e) => setEditProduct(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Categoria do produto"
              />
            </div>
            
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label>Ingredientes</Label>
                <Button type="button" onClick={addIngredientToEditProduct} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Ingrediente
                </Button>
              </div>
              {editProduct.ingredients.map((ingredient, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6">
                    <Select
                      value={ingredient.ingredient_id}
                      onValueChange={(value) => updateEditProductIngredient(index, 'ingredient_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o ingrediente" />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredients.map((ing) => (
                          <SelectItem key={ing.id} value={ing.id}>
                            {ing.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Qtd"
                      value={ingredient.quantity}
                      onChange={(e) => updateEditProductIngredient(index, 'quantity', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-3">
                    <Select
                      value={ingredient.unit}
                      onValueChange={(value) => updateEditProductIngredient(index, 'unit', value as Unit)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="mg">mg</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="unidade">unidade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeIngredientFromEditProduct(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditProductOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditProduct}>
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
