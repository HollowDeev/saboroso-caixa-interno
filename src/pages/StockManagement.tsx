
import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, ShoppingCart } from 'lucide-react';
import { IngredientsTab } from '@/components/stock/IngredientsTab';
import { ExternalProductsTab } from '@/components/stock/ExternalProductsTab';

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
  } = useApp();

  const [activeTab, setActiveTab] = useState('ingredients');

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

        <TabsContent value="ingredients" className="space-y-4">
          <IngredientsTab
            ingredients={ingredients}
            currentUser={currentUser}
            addIngredient={addIngredient}
            updateIngredient={updateIngredient}
            deleteIngredient={deleteIngredient}
          />
        </TabsContent>

        <TabsContent value="external-products" className="space-y-4">
          <ExternalProductsTab
            externalProducts={externalProducts}
            currentUser={currentUser}
            addExternalProduct={addExternalProduct}
            updateExternalProduct={updateExternalProduct}
            deleteExternalProduct={deleteExternalProduct}
          />
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="text-center py-8">
            <p>Funcionalidade de produtos em desenvolvimento...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
