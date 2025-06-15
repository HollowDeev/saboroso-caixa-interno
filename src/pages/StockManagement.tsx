
import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Package, ShoppingCart, Plus, UtensilsCrossed } from 'lucide-react';
import { IngredientCard } from '@/components/stock/IngredientCard';
import { ExternalProductCard } from '@/components/stock/ExternalProductCard';
import { ProductCard } from '@/components/stock/ProductCard';
import { IngredientForm } from '@/components/stock/IngredientForm';
import { ExternalProductForm } from '@/components/stock/ExternalProductForm';
import { toast } from 'sonner';

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

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Gerenciamento de Estoque</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
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
            {ingredients.map((ingredient) => (
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

          {ingredients.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum ingrediente cadastrado</p>
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
            {externalProducts.map((product) => (
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

          {externalProducts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum produto externo cadastrado</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Produtos (Comidas)</h2>
            <Button size="sm" className="min-h-[44px]" disabled>
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Adicionar Produto</span>
              <span className="sm:hidden">Adicionar</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onUpdate={updateProduct}
                onDelete={deleteProduct}
              />
            ))}
          </div>

          {products.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum produto cadastrado</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
