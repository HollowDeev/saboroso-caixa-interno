import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Package, ShoppingCart, Plus, UtensilsCrossed, Search } from 'lucide-react';
import { IngredientCard } from '@/components/stock/IngredientCard';
import { ExternalProductCard } from '@/components/stock/ExternalProductCard';
import { ProductCard } from '@/components/stock/ProductCard';
import { IngredientForm } from '@/components/stock/IngredientForm';
import { ExternalProductForm } from '@/components/stock/ExternalProductForm';
import { ProductForm } from '@/components/stock/ProductForm';
import { toast } from 'sonner';
import { ProductFormData } from '@/types';
import { Input } from '@/components/ui/input';

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
    updateStock,
  } = useApp();

  const [activeTab, setActiveTab] = useState('ingredients');
  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false);
  const [isAddExternalProductOpen, setIsAddExternalProductOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newIngredient, setNewIngredient] = useState({
    name: '',
    unit: 'kg',
    current_stock: 0,
    min_stock: 0,
    cost: 0,
    supplier: null as string | null,
    description: null as string | null,
  });

  const [newExternalProduct, setNewExternalProduct] = useState({
    name: '',
    brand: null as string | null,
    description: null as string | null,
    cost: 0,
    price: 0,
    current_stock: 0,
    min_stock: 0,
  });

  const [newProduct, setNewProduct] = useState<ProductFormData>({
    name: '',
    description: null,
    price: 0,
    cost: 0,
    available: true,
    ingredients: [],
  });

  const resetNewIngredient = () => {
    setNewIngredient({
      name: '',
      unit: 'kg',
      current_stock: 0,
      min_stock: 0,
      cost: 0,
      supplier: null,
      description: null,
    });
  };

  const resetNewExternalProduct = () => {
    setNewExternalProduct({
      name: '',
      brand: null,
      description: null,
      cost: 0,
      price: 0,
      current_stock: 0,
      min_stock: 0,
    });
  };

  const resetNewProduct = () => {
    setNewProduct({
      name: '',
      description: null,
      price: 0,
      cost: 0,
      category: '',
      preparation_time: 0,
      available: true,
      ingredients: [],
    });
  };

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

  const handleAddProduct = async () => {
    if (!currentUser?.id) {
      toast.error('Usuário não encontrado');
      return;
    }

    if (!newProduct.name || newProduct.price <= 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      // Preparar os dados do produto para o backend
      const productData = {
        name: newProduct.name,
        description: newProduct.description,
        price: newProduct.price,
        cost: newProduct.cost,
        available: newProduct.available,
        owner_id: currentUser.id,
        ingredients: newProduct.ingredients.map(ing => ({
          id: '',
          food_id: '',
          ingredient_id: ing.ingredient_id,
          quantity: ing.quantity,
          unit: ing.unit,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
      };

      await addProduct(productData);
      setIsAddProductOpen(false);
      resetNewProduct();
      toast.success('Produto adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      toast.error('Erro ao adicionar produto');
    }
  };

  const handleAddStock = async (itemType: 'ingredient' | 'external_product', itemId: string, quantity: number) => {
    try {
      await updateStock(itemType, itemId, quantity, 'Adição manual de estoque');
      toast.success('Estoque adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar estoque:', error);
      toast.error('Erro ao adicionar estoque');
    }
  };

  const handleRemoveStock = async (itemType: 'ingredient' | 'external_product', itemId: string, quantity: number) => {
    try {
      await updateStock(itemType, itemId, -quantity, 'Remoção manual de estoque');
      toast.success('Estoque removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover estoque:', error);
      toast.error('Erro ao remover estoque');
    }
  };

  const filteredIngredients = useMemo(() => {
    if (!searchTerm) return ingredients;
    const term = searchTerm.toLowerCase();
    return ingredients.filter(ingredient =>
      ingredient.name.toLowerCase().includes(term) ||
      (ingredient.description?.toLowerCase().includes(term)) ||
      (ingredient.supplier?.toLowerCase().includes(term))
    );
  }, [ingredients, searchTerm]);

  const filteredExternalProducts = useMemo(() => {
    if (!searchTerm) return externalProducts;
    const term = searchTerm.toLowerCase();
    return externalProducts.filter(product =>
      product.name.toLowerCase().includes(term) ||
      (product.description?.toLowerCase().includes(term)) ||
      (product.brand?.toLowerCase().includes(term))
    );
  }, [externalProducts, searchTerm]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(term) ||
      (product.description?.toLowerCase().includes(term)) ||
      (product.category?.toLowerCase().includes(term))
    );
  }, [products, searchTerm]);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Gerenciamento de Estoque</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <TabsList className="grid w-full sm:w-auto grid-cols-3">
            <TabsTrigger value="ingredients" className="flex items-center gap-2 text-xs sm:text-sm">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Ingredientes</span>
              <span className="sm:hidden">Ingred.</span>
            </TabsTrigger>
            <TabsTrigger value="external-products" className="flex items-center gap-2 text-xs sm:text-sm">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Produtos Externos</span>
              <span className="sm:hidden">Externos</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2 text-xs sm:text-sm">
              <UtensilsCrossed className="h-4 w-4" />
              <span className="hidden sm:inline">Produtos</span>
              <span className="sm:hidden">Comidas</span>
            </TabsTrigger>
          </TabsList>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 h-10"
            />
          </div>
        </div>

        <TabsContent value="ingredients" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Ingredientes</h2>
            <Dialog open={isAddIngredientOpen} onOpenChange={setIsAddIngredientOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="min-h-[44px]">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Adicionar Ingrediente</span>
                  <span className="sm:hidden">Adicionar</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Ingrediente</DialogTitle>
                </DialogHeader>
                <IngredientForm
                  ingredient={newIngredient}
                  onChange={(field, value) => setNewIngredient(prev => ({ ...prev, [field]: value }))}
                  onSubmit={handleAddIngredient}
                  onCancel={() => setIsAddIngredientOpen(false)}
                  submitLabel="Adicionar Ingrediente"
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredIngredients.map((ingredient) => (
              <IngredientCard
                key={ingredient.id}
                ingredient={ingredient}
                onUpdate={updateIngredient}
                onDelete={deleteIngredient}
                onAddStock={(id, quantity) => handleAddStock('ingredient', id, quantity)}
                onRemoveStock={(id, quantity) => handleRemoveStock('ingredient', id, quantity)}
              />
            ))}
          </div>

          {filteredIngredients.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchTerm ? 'Nenhum ingrediente encontrado' : 'Nenhum ingrediente cadastrado'}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="external-products" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Produtos Externos</h2>
            <Dialog open={isAddExternalProductOpen} onOpenChange={setIsAddExternalProductOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="min-h-[44px]">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Adicionar Produto Externo</span>
                  <span className="sm:hidden">Adicionar</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Produto Externo</DialogTitle>
                </DialogHeader>
                <ExternalProductForm
                  product={newExternalProduct}
                  onChange={(field, value) => setNewExternalProduct(prev => ({ ...prev, [field]: value }))}
                  onSubmit={handleAddExternalProduct}
                  onCancel={() => setIsAddExternalProductOpen(false)}
                  submitLabel="Adicionar Produto"
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredExternalProducts.map((product) => (
              <ExternalProductCard
                key={product.id}
                product={product}
                onUpdate={updateExternalProduct}
                onDelete={deleteExternalProduct}
                onAddStock={(id, quantity) => handleAddStock('external_product', id, quantity)}
                onRemoveStock={(id, quantity) => handleRemoveStock('external_product', id, quantity)}
              />
            ))}
          </div>

          {filteredExternalProducts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchTerm ? 'Nenhum produto externo encontrado' : 'Nenhum produto externo cadastrado'}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Produtos (Comidas)</h2>
            <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="min-h-[44px]">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Adicionar Produto</span>
                  <span className="sm:hidden">Adicionar</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Produto</DialogTitle>
                </DialogHeader>
                <ProductForm
                  product={newProduct}
                  onChange={(field, value) => setNewProduct(prev => ({ ...prev, [field]: value }))}
                  onSubmit={handleAddProduct}
                  onCancel={() => setIsAddProductOpen(false)}
                  submitLabel="Adicionar Produto"
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onUpdate={updateProduct}
                onDelete={deleteProduct}
              />
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
