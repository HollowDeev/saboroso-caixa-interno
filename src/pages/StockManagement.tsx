import { Navigate } from 'react-router-dom';


import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Package, ShoppingCart, Plus, UtensilsCrossed, Search, FileDown, Copy, ChevronDown } from 'lucide-react';
import { IngredientCard } from '@/components/stock/IngredientCard';
import { ExternalProductCard } from '@/components/stock/ExternalProductCard';
import { ProductCard } from '@/components/stock/ProductCard';
import { IngredientForm } from '@/components/stock/IngredientForm';
import { ExternalProductForm } from '@/components/stock/ExternalProductForm';
import { ProductForm } from '@/components/stock/ProductForm';
import { toast } from 'sonner';
import { ProductFormData } from '@/types';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { convertValue } from '@/utils/unitConversion';
import { Unit } from '@/utils/unitConversion';

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
  } = useAppContext();

  // Itens com estoque baixo ou zerado
  const lowOrNoStockItems = useMemo(() => {
    return [
      ...ingredients.filter(item => item && typeof item.current_stock === 'number' && item.current_stock <= (item.min_stock || 0)),
      ...externalProducts.filter(item => item && typeof item.current_stock === 'number' && item.current_stock <= (item.min_stock || 0)),
    ];
  }, [ingredients, externalProducts]);

  // Exportar apenas itens com estoque baixo/zerado (CSV)
  const exportLowStockCSV = () => {
    const allItems = [
      ...ingredients.filter(item => item && typeof item.current_stock === 'number' && item.current_stock <= (item.min_stock || 0)).map(item => ({
        tipo: 'Ingrediente',
        nome: item.name,
        estoque: item.current_stock,
        unidade: item.unit,
        custo: item.cost,
        estoque_minimo: item.min_stock,
        fornecedor: item.supplier || ''
      })),
      ...externalProducts.filter(item => item && typeof item.current_stock === 'number' && item.current_stock <= (item.min_stock || 0)).map(item => ({
        tipo: 'Produto Externo',
        nome: item.name,
        estoque: item.current_stock,
        unidade: 'unidade',
        custo: item.cost,
        estoque_minimo: item.min_stock,
        fornecedor: item.brand || ''
      }))
    ];
    const csvContent = [
      'Tipo,Nome,Estoque,Unidade,Custo,Estoque Mínimo,Fornecedor',
      ...allItems.map(item =>
        `${item.tipo},${item.nome},${item.estoque},${item.unidade},${item.custo},${item.estoque_minimo},${item.fornecedor}`
      )
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `estoque_baixo_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copiar apenas itens com estoque baixo/zerado, formatado conforme especificação
  const copyLowStockData = () => {
    // Separar ingredientes e produtos externos
    const lowStockIngredients = ingredients.filter(item => item && typeof item.current_stock === 'number' && item.current_stock > 0 && item.current_stock <= (item.min_stock || 0));
    const noStockIngredients = ingredients.filter(item => item && typeof item.current_stock === 'number' && item.current_stock === 0);
    const lowStockExternal = externalProducts.filter(item => item && typeof item.current_stock === 'number' && item.current_stock > 0 && item.current_stock <= (item.min_stock || 0));
    const noStockExternal = externalProducts.filter(item => item && typeof item.current_stock === 'number' && item.current_stock === 0);

    // Montar linhas formatadas
    const formatLine = (item, type) => {
      const unidade = type === 'external' ? 'unidades' : item.unit;
      const brand = type === 'external' && item.brand ? ` (${item.brand})` : '';
      const quantidade = `${item.current_stock} ${unidade}`;
      let status = '';
      if (item.current_stock === 0) status = '🔴';
      else status = '🟠';
      return `• ${item.name}${brand} — ${quantidade} ${status}`;
    };

    // Ordenar por nome
    const sortByName = (a, b) => a.name.localeCompare(b.name, 'pt-BR');

    // Linhas
    const lines = [
      ...noStockExternal.sort(sortByName).map(item => formatLine(item, 'external')),
      ...noStockIngredients.sort(sortByName).map(item => formatLine(item, 'ingredient')),
      ...lowStockExternal.sort(sortByName).map(item => formatLine(item, 'external')),
      ...lowStockIngredients.sort(sortByName).map(item => formatLine(item, 'ingredient')),
    ];

    // Contagem
    const total = noStockExternal.length + noStockIngredients.length + lowStockExternal.length + lowStockIngredients.length;
    const totalNoStock = noStockExternal.length + noStockIngredients.length;
    const totalLowStock = lowStockExternal.length + lowStockIngredients.length;

    // Data
    const today = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const dataStr = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;

    const text = `*Relatório*\n*Estoque baixo / Sem estoque*\nData: ${dataStr}\n\n*Total*: ${total} itens \n*Sem estoque:* ${totalNoStock} 🔴 \n*Estoque baixo:* ${totalLowStock} 🟠\n\n${lines.join('\n\n')}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Dados de estoque baixo copiados!');
    }).catch(() => {
      toast.error('Não foi possível copiar os dados.');
    });
  };

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
    category: 'comida',
    preparation_time: 0,
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
      available: true,
      category: 'comida',
      preparation_time: 0,
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
      // Calcular custo total dos ingredientes (incluindo produtos externos)
      const totalCost = newProduct.ingredients.reduce((total, ing) => {
        if (ing.type === 'external_product') {
          // Buscar produto externo
          const prod = externalProducts.find(p => p.id === ing.ingredient_id);
          if (!prod) return total;
          let factor = 1;
          if (ing.unit === '1 und') factor = 1;
          else if (ing.unit === '1/2 und') factor = 0.5;
          else if (ing.unit === '1/4 und') factor = 0.25;
          return total + (factor * prod.cost * ing.quantity);
        } else {
          // Buscar ingrediente
          const ingredient = ingredients.find(i => i.id === ing.ingredient_id);
          if (!ingredient) return total;
          // Converter unidade
          let quantity = ing.quantity;
          if (ingredient.unit !== ing.unit) {
            quantity = convertValue(
              ing.quantity,
              ing.unit as Unit,
              ingredient.unit as Unit
            );
          }
          return total + (quantity * ingredient.cost);
        }
      }, 0);

      // Preparar os dados do produto para o backend
      const productData = {
        name: newProduct.name,
        description: newProduct.description,
        price: newProduct.price,
        cost: totalCost,
        available: newProduct.available,
        owner_id: currentUser.id,
        category: newProduct.category,
        preparation_time: newProduct.preparation_time,
        ingredients: newProduct.ingredients
          .filter(ing => !ing.type || ing.type === 'ingredient') // Só ingredientes reais
          .map(ing => ({
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
    if (!searchTerm) return ingredients.filter(ingredient => ingredient && ingredient.id);
    const term = searchTerm.toLowerCase();
    return ingredients.filter(ingredient =>
      ingredient && ingredient.id &&
      (ingredient.name?.toLowerCase().includes(term) ||
        ingredient.description?.toLowerCase().includes(term) ||
        ingredient.supplier?.toLowerCase().includes(term))
    );
  }, [ingredients, searchTerm]);

  const filteredExternalProducts = useMemo(() => {
    if (!searchTerm) return externalProducts.filter(product => product && product.id);
    const term = searchTerm.toLowerCase();
    return externalProducts.filter(product =>
      product && product.id &&
      (product.name?.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term) ||
        product.brand?.toLowerCase().includes(term))
    );
  }, [externalProducts, searchTerm]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products.filter(product => product && product.id);
    const term = searchTerm.toLowerCase();
    return products.filter(product =>
      product && product.id &&
      (product.name?.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term))
    );
  }, [products, searchTerm]);

  const exportStockCSV = () => {
    const allItems = [
      ...ingredients.map(item => ({
        tipo: 'Ingrediente',
        nome: item.name,
        estoque: item.current_stock,
        unidade: item.unit,
        custo: item.cost,
        estoque_minimo: item.min_stock,
        fornecedor: item.supplier || ''
      })),
      ...externalProducts.map(item => ({
        tipo: 'Produto Externo',
        nome: item.name,
        estoque: item.current_stock,
        unidade: 'unidade',
        custo: item.cost,
        estoque_minimo: item.min_stock,
        fornecedor: item.brand || ''
      }))
    ];

    const csvContent = [
      'Tipo,Nome,Estoque,Unidade,Custo,Estoque Mínimo,Fornecedor',
      ...allItems.map(item =>
        `${item.tipo},${item.nome},${item.estoque},${item.unidade},${item.custo},${item.estoque_minimo},${item.fornecedor}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `estoque_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyStockData = () => {
    const allItems = [
      ...externalProducts.map(item =>
        `> ${item.name}${item.brand ? ` (${item.brand})` : ''} - Valor Pago: R$ ${item.cost.toFixed(2)} - ${item.current_stock} unidades`
      ),
      ...ingredients.map(item =>
        `> ${item.name} - Valor Pago: R$ ${item.cost.toFixed(2)} - ${item.current_stock} ${item.unit}`
      )
    ].sort().join('\n');

    const text = `*ESTOQUE ATUAL*\n\n${allItems}`;

    navigator.clipboard.writeText(text).then(() => {
      toast.success('Dados copiados para a área de transferência!');
    }).catch(() => {
      toast.error('Não foi possível copiar os dados.');
    });
  };

  // Permitir acesso para admin, gerente e funcionário
  if (!currentUser || !['admin', 'employee', 'gerente'].includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Gerenciamento de Estoque</h1>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FileDown className="h-4 w-4" />
                Exportar
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportStockCSV}>
                <FileDown className="h-4 w-4 mr-2" />
                Exportar CSV (Tudo)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyStockData}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Dados (Tudo)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportLowStockCSV}>
                <FileDown className="h-4 w-4 mr-2 text-yellow-600" />
                Exportar CSV (Baixo/Sem Estoque)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyLowStockData}>
                <Copy className="h-4 w-4 mr-2 text-yellow-600" />
                Copiar Dados (Baixo/Sem Estoque)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {activeTab === 'ingredients' && (
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
          )}

          {activeTab === 'external_products' && (
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
          )}

          {activeTab === 'products' && (
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
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <TabsList className="grid w-full sm:w-auto grid-cols-3">
            <TabsTrigger value="ingredients" className="flex items-center gap-2 text-xs sm:text-sm">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Ingredientes</span>
              <span className="sm:hidden">Ingred.</span>
            </TabsTrigger>
            <TabsTrigger value="external_products" className="flex items-center gap-2 text-xs sm:text-sm">
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

        <TabsContent value="external_products" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Produtos Externos</h2>
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
