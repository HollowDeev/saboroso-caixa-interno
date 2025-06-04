import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Minus, Package, AlertTriangle, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Ingredient, Product } from '@/types';
import { useStock } from '@/hooks/useStock';
import { toast } from '@/components/ui/use-toast';
import { Unit, isMassUnit, isVolumeUnit, convertFromBaseUnit, getAvailableSubunits, convertToBaseUnit } from '@/utils/unitConversion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Interface para produtos externos (como bebidas)
interface ExternalProduct {
  id: string;
  name: string;
  brand: string;
  description?: string;
  cost: number;
  price: number;
  currentStock: number;
  minStock: number;
}

interface NewIngredientForm {
  name: string;
  unit: Unit;
  currentStock: number;
  minStock: number;
  minStockUnit: Unit;
  cost: number;
  supplier?: string;
}

interface NewProductForm {
  name: string;
  brand: string;
  description?: string;
  cost: number;
  price: number;
  currentStock: number;
  minStock: number;
}

// Função para formatar o valor do estoque para a melhor unidade
const formatStockValue = (value: number, baseUnit: Unit): { value: number; unit: Unit } => {
  if (baseUnit === 'unidade') return { value, unit: baseUnit };

  if (isMassUnit(baseUnit)) {
    if (value >= 1) return { value: Number(value.toFixed(3)), unit: 'kg' };
    if (value >= 0.001) return { value: Number(convertFromBaseUnit(value, 'kg', 'g').toFixed(1)), unit: 'g' };
    return { value: Number(convertFromBaseUnit(value, 'kg', 'mg').toFixed(0)), unit: 'mg' };
  }

  if (isVolumeUnit(baseUnit)) {
    if (value >= 1) return { value: Number(value.toFixed(3)), unit: 'L' };
    return { value: Number(convertFromBaseUnit(value, 'L', 'ml').toFixed(0)), unit: 'ml' };
  }

  return { value: Number(value.toFixed(3)), unit: baseUnit };
};

export const StockManagement = () => {
  const { currentUser, products, addProduct } = useApp();
  const {
    ingredients,
    externalProducts,
    addIngredient,
    addExternalProduct,
    updateStock,
    updateIngredient,
    loading: stockLoading,
    addStockEntry,
    consumeStock,
    stockEntries,
    deleteIngredient
  } = useStock(currentUser?.id || '');

  const [activeTab, setActiveTab] = useState('ingredients');
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [isNewIngredientDialogOpen, setIsNewIngredientDialogOpen] = useState(false);
  const [isEditIngredientDialogOpen, setIsEditIngredientDialogOpen] = useState(false);
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);
  const [isNewFoodDialogOpen, setIsNewFoodDialogOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [unitCost, setUnitCost] = useState(0);
  const [supplier, setSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [newIngredientForm, setNewIngredientForm] = useState<NewIngredientForm>({
    name: '',
    unit: 'unidade',
    currentStock: 0,
    minStock: 0,
    minStockUnit: 'unidade',
    cost: 0
  });

  const [newProductForm, setNewProductForm] = useState<NewProductForm>({
    name: '',
    brand: '',
    description: '',
    cost: 0,
    price: 0,
    currentStock: 0,
    minStock: 0
  });

  const [editIngredientForm, setEditIngredientForm] = useState<{
    name: string;
    unit: string;
    cost: number;
    min_stock: number;
    supplier: string | null;
    description: string | null;
  }>({
    name: '',
    unit: '',
    cost: 0,
    min_stock: 0,
    supplier: null,
    description: null
  });

  const calculateProductionCost = (productIngredients: { ingredientId: string; quantity: number }[]) => {
    return productIngredients.reduce((total, ing) => {
      const ingredient = ingredients.find(i => i.id === ing.ingredientId);
      if (!ingredient) return total;

      // Converte a quantidade do ingrediente para a mesma unidade do custo
      let cost = 0;
      if (ingredient.unit === 'kg' || ingredient.unit === 'L') {
        // Se o ingrediente é medido em kg ou L, converte gramas/ml para kg/L
        cost = (ing.quantity / 1000) * ingredient.cost;
      } else if (ingredient.unit === 'g' || ingredient.unit === 'ml') {
        // Se o ingrediente é medido em g ou ml, converte para kg/L
        cost = (ing.quantity / 1000) * ingredient.cost;
      } else {
        // Para unidades, usa o custo direto
        cost = ing.quantity * ingredient.cost;
      }

      return total + cost;
    }, 0);
  };

  const [newFoodForm, setNewFoodForm] = useState({
    name: '',
    category: '',
    description: '',
    price: 0,
    cost: 0,
    available: true,
    ingredients: [] as { ingredientId: string; quantity: number; unit: Unit }[]
  });

  // Atualiza o custo quando os ingredientes são alterados
  useEffect(() => {
    const productionCost = calculateProductionCost(newFoodForm.ingredients);
    setNewFoodForm(prev => ({
      ...prev,
      cost: Number(productionCost.toFixed(2))
    }));
  }, [newFoodForm.ingredients, ingredients]);

  // Funções de status de estoque
  const getStockStatus = (current: number, min: number) => {
    if (current <= min) {
      return { status: 'danger', color: 'red', label: 'Crítico' };
    }

    const percentageAboveMin = ((current - min) / min) * 100;

    if (percentageAboveMin <= 25) {
      return { status: 'warning', color: 'yellow', label: 'Baixo' };
    }

    return { status: 'safe', color: 'green', label: 'Normal' };
  };

  const getStockStatusBadge = (current: number, min: number) => {
    const { status, label } = getStockStatus(current, min);

    const variants = {
      danger: 'destructive',
      warning: 'outline',
      safe: 'default'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {label}
      </Badge>
    );
  };

  const getStockIcon = (current: number, min: number) => {
    const { status } = getStockStatus(current, min);

    if (status === 'danger') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    } else if (status === 'warning') {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    } else {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  // Funções de ajuste de estoque
  const openStockDialog = (ingredient: Ingredient, type: 'add' | 'remove') => {
    setSelectedIngredient(ingredient);
    setAdjustmentType(type);
    setAdjustmentQuantity(0);
    setIsStockDialogOpen(true);
  };

  const handleStockAdjustment = async () => {
    if (!selectedIngredient || adjustmentQuantity <= 0) return;

    if (adjustmentType === 'add') {
      if (unitCost <= 0) {
        toast({
          title: 'Erro',
          description: 'O custo unitário deve ser maior que zero.',
          variant: 'destructive',
        });
        return;
      }

      await addStockEntry(
        selectedIngredient.id,
        adjustmentQuantity,
        unitCost,
        supplier || undefined,
        invoiceNumber || undefined,
        notes || undefined
      );
    } else {
      await consumeStock(
        selectedIngredient.id,
        adjustmentQuantity,
        'Consumo manual de estoque'
      );
    }

    setIsStockDialogOpen(false);
    setSelectedIngredient(null);
    setAdjustmentQuantity(0);
    setUnitCost(0);
    setSupplier('');
    setInvoiceNumber('');
    setNotes('');
  };

  // Funções de cadastro
  const handleNewIngredient = async (e: React.FormEvent) => {
    e.preventDefault();

    const minStockInBaseUnit = convertToBaseUnit(
      newIngredientForm.minStock,
      newIngredientForm.minStockUnit,
      newIngredientForm.unit
    );

    await addIngredient({
      name: newIngredientForm.name,
      unit: newIngredientForm.unit,
      current_stock: newIngredientForm.currentStock,
      min_stock: minStockInBaseUnit,
      cost: newIngredientForm.cost,
      supplier: newIngredientForm.supplier || null,
      description: null
    });

    setNewIngredientForm({
      name: '',
      unit: 'unidade',
      currentStock: 0,
      minStock: 0,
      minStockUnit: 'unidade',
      cost: 0
    });
    setIsNewIngredientDialogOpen(false);
  };

  const handleNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    await addExternalProduct({
      name: newProductForm.name,
      brand: newProductForm.brand || null,
      description: newProductForm.description || null,
      current_stock: newProductForm.currentStock,
      min_stock: newProductForm.minStock,
      cost: newProductForm.cost,
      price: newProductForm.price
    });

    setNewProductForm({
      name: '',
      brand: '',
      description: '',
      cost: 0,
      price: 0,
      currentStock: 0,
      minStock: 0
    });
    setIsNewProductDialogOpen(false);
  };

  const handleNewFood = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await addProduct({
        ...newFoodForm,
        created_at: new Date(),
        updated_at: new Date()
      });

      setNewFoodForm({
        name: '',
        category: '',
        description: '',
        price: 0,
        cost: 0,
        available: true,
        ingredients: []
      });
      setIsNewFoodDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar comida:', error);
      // Aqui você pode adicionar uma notificação de erro para o usuário
    }
  };

  const addIngredientToFood = () => {
    setNewFoodForm(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { ingredientId: '', quantity: 0, unit: 'unidade' }]
    }));
  };

  const updateFoodIngredient = (index: number, field: string, value: string | number) => {
    setNewFoodForm(prev => {
      const newIngredients = [...prev.ingredients];
      newIngredients[index] = { ...newIngredients[index], [field]: value };
      return { ...prev, ingredients: newIngredients };
    });
  };

  const removeFoodIngredient = (index: number) => {
    setNewFoodForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  // Função para atualizar a unidade do estoque mínimo
  const handleMinStockUnitChange = (unit: Unit) => {
    const baseValue = convertToBaseUnit(
      newIngredientForm.minStock,
      newIngredientForm.minStockUnit,
      newIngredientForm.unit
    );
    const newValue = convertFromBaseUnit(baseValue, newIngredientForm.unit, unit);

    setNewIngredientForm(prev => ({
      ...prev,
      minStock: Number(newValue.toFixed(3)),
      minStockUnit: unit
    }));
  };

  // Função para atualizar a unidade de um ingrediente na comida
  const updateFoodIngredientUnit = (index: number, unit: Unit) => {
    const ingredient = ingredients.find(i => i.id === newFoodForm.ingredients[index].ingredientId);
    if (!ingredient) return;

    // Se o ingrediente é do tipo 'unidade', mantém o valor como está
    if (ingredient.unit === 'unidade') {
      setNewFoodForm(prev => {
        const newIngredients = [...prev.ingredients];
        newIngredients[index] = {
          ...newIngredients[index],
          unit: 'unidade'
        };
        return { ...prev, ingredients: newIngredients };
      });
      return;
    }

    try {
      const baseValue = convertToBaseUnit(
        newFoodForm.ingredients[index].quantity,
        newFoodForm.ingredients[index].unit,
        ingredient.unit
      );
      const newValue = convertFromBaseUnit(baseValue, ingredient.unit, unit);

      setNewFoodForm(prev => {
        const newIngredients = [...prev.ingredients];
        newIngredients[index] = {
          ...newIngredients[index],
          quantity: Number(newValue.toFixed(3)),
          unit
        };
        return { ...prev, ingredients: newIngredients };
      });
    } catch (error) {
      console.error('Erro ao converter unidades:', error);
      toast({
        title: 'Erro ao converter unidades',
        description: 'Não é possível converter entre essas unidades.',
        variant: 'destructive',
      });
    }
  };

  // Contadores para o dashboard
  const criticalIngredients = ingredients.filter(ing =>
    getStockStatus(ing.current_stock, ing.min_stock).status === 'danger'
  );
  const warningIngredients = ingredients.filter(ing =>
    getStockStatus(ing.current_stock, ing.min_stock).status === 'warning'
  );
  const safeIngredients = ingredients.filter(ing =>
    getStockStatus(ing.current_stock, ing.min_stock).status === 'safe'
  );

  const openEditIngredientDialog = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setEditIngredientForm({
      name: ingredient.name,
      unit: ingredient.unit,
      cost: ingredient.cost,
      min_stock: ingredient.min_stock,
      supplier: ingredient.supplier,
      description: ingredient.description
    });
    setIsEditIngredientDialogOpen(true);
  };

  const handleEditIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient) return;

    try {
      await updateIngredient(selectedIngredient.id, {
        name: editIngredientForm.name,
        unit: editIngredientForm.unit,
        min_stock: editIngredientForm.min_stock,
        cost: editIngredientForm.cost,
        supplier: editIngredientForm.supplier,
        description: editIngredientForm.description
      });

      setIsEditIngredientDialogOpen(false);
      setSelectedIngredient(null);
    } catch (error) {
      console.error('Erro ao atualizar ingrediente:', error);
    }
  };

  const [isEditFoodDialogOpen, setIsEditFoodDialogOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Product | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'food' | 'ingredient', id: string, name: string } | null>(null);

  // Função para abrir diálogo de edição de comida
  const openEditFoodDialog = (food: Product) => {
    setSelectedFood(food);
    setNewFoodForm({
      name: food.name,
      category: food.category,
      description: food.description,
      price: food.price,
      cost: food.cost,
      available: food.available,
      ingredients: food.ingredients.map(ing => ({
        ingredientId: ing.ingredientId,
        quantity: ing.quantity,
        unit: ing.unit || ingredients.find(i => i.id === ing.ingredientId)?.unit || 'unidade'
      }))
    });
    setIsEditFoodDialogOpen(true);
  };

  // Função para atualizar uma comida
  const handleEditFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFood) return;

    try {
      await addProduct({
        ...newFoodForm,
        id: selectedFood.id,
        created_at: selectedFood.created_at,
        updated_at: new Date()
      });

      setIsEditFoodDialogOpen(false);
      setSelectedFood(null);
      setNewFoodForm({
        name: '',
        category: '',
        description: '',
        price: 0,
        cost: 0,
        available: true,
        ingredients: []
      });

      toast({
        title: 'Comida atualizada',
        description: 'A comida foi atualizada com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao atualizar comida:', error);
      toast({
        title: 'Erro ao atualizar comida',
        description: 'Não foi possível atualizar a comida.',
        variant: 'destructive',
      });
    }
  };

  // Função para confirmar exclusão
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'food') {
        // Excluir comida
        await addProduct({
          id: itemToDelete.id,
          name: '',
          category: '',
          description: '',
          price: 0,
          cost: 0,
          available: false,
          ingredients: [],
          _delete: true // Flag especial para exclusão
        });
      } else {
        // Excluir ingrediente
        await deleteIngredient(itemToDelete.id);
      }

      setIsDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      toast({
        title: 'Erro ao excluir',
        description: `Não foi possível excluir ${itemToDelete.type === 'food' ? 'a comida' : 'o ingrediente'}.`,
        variant: 'destructive',
      });
    }
  };

  // Se não houver usuário autenticado, mostra mensagem de erro
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-600">Você precisa estar autenticado para acessar esta página.</p>
      </div>
    );
  }

  // Se estiver carregando os dados do estoque, mostra loading
  if (stockLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando dados do estoque...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Estoque</h1>
          <p className="text-gray-600">Controle completo do estoque</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-[400px]">
          <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="food">Comidas</TabsTrigger>
          <TabsTrigger value="control">Controle</TabsTrigger>
        </TabsList>

        {/* Seção de Ingredientes */}
        <TabsContent value="ingredients">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Controle de Ingredientes</CardTitle>
                <Button onClick={() => setIsNewIngredientDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Ingrediente
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ingredients.map((ingredient) => (
                  <Card key={ingredient.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{ingredient.name}</CardTitle>
                        {getStockStatusBadge(ingredient.current_stock, ingredient.min_stock)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          {getStockIcon(ingredient.current_stock, ingredient.min_stock)}
                          <span className={`font-medium ${getStockStatus(ingredient.current_stock, ingredient.min_stock).status === 'danger' ? 'text-red-600' :
                            getStockStatus(ingredient.current_stock, ingredient.min_stock).status === 'warning' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                            {(() => {
                              const formattedCurrent = formatStockValue(ingredient.current_stock, ingredient.unit);
                              return `${formattedCurrent.value} ${formattedCurrent.unit}`;
                            })()}
                          </span>
                          <span className="text-gray-500">/ {(() => {
                            const formattedMin = formatStockValue(ingredient.min_stock, ingredient.unit);
                            return `${formattedMin.value} ${formattedMin.unit}`;
                          })()} min</span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Custo Médio:</span>
                            <span>R$ {ingredient.cost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Fornecedor:</span>
                            <span>{ingredient.supplier || '-'}</span>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openStockDialog(ingredient, 'add')}
                            className="flex-1 text-green-600 hover:text-green-700"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Entrada
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openStockDialog(ingredient, 'remove')}
                            className="flex-1 text-red-600 hover:text-red-700"
                          >
                            <Minus className="h-4 w-4 mr-2" />
                            Consumir
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditIngredientDialog(ingredient)}
                          className="w-full"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>

                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-500 mb-2">Últimas Entradas:</p>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {stockEntries
                              .filter(entry => entry.ingredient_id === ingredient.id)
                              .map(entry => (
                                <div key={entry.id} className="text-sm p-2 bg-gray-50 rounded-md">
                                  <div className="flex justify-between">
                                    <span>{entry.quantity} {ingredient.unit}</span>
                                    <span>R$ {entry.unit_cost.toFixed(2)}/{ingredient.unit}</span>
                                  </div>
                                  <div className="flex justify-between text-gray-500">
                                    <span>Restante: {entry.remaining_quantity} {ingredient.unit}</span>
                                    <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-red-600"
                            onClick={() => {
                              setItemToDelete({
                                type: 'ingredient',
                                id: ingredient.id,
                                name: ingredient.name
                              });
                              setIsDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seção de Produtos Externos */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Produtos Externos</CardTitle>
                <Button onClick={() => setIsNewProductDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Produto
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {externalProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <p className="text-sm text-gray-500">{product.brand}</p>
                        </div>
                        {getStockStatusBadge(product.current_stock, product.min_stock)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          {getStockIcon(product.current_stock, product.min_stock)}
                          <span className={`font-medium ${getStockStatus(product.current_stock, product.min_stock).status === 'danger' ? 'text-red-600' :
                            getStockStatus(product.current_stock, product.min_stock).status === 'warning' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                            {(() => {
                              const formattedCurrent = formatStockValue(product.current_stock, product.unit);
                              return `${formattedCurrent.value} ${formattedCurrent.unit}`;
                            })()}
                          </span>
                          <span className="text-gray-500">/ {(() => {
                            const formattedMin = formatStockValue(product.min_stock, product.unit);
                            return `${formattedMin.value} ${formattedMin.unit}`;
                          })()} min</span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Custo:</span>
                            <span>R$ {product.cost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Preço de Venda:</span>
                            <span>R$ {product.price.toFixed(2)}</span>
                          </div>
                          {product.description && (
                            <p className="text-sm text-gray-600">{product.description}</p>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // TODO: Implementar ajuste de estoque para produtos externos
                            }}
                            className="flex-1 text-green-600 hover:text-green-700"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // TODO: Implementar ajuste de estoque para produtos externos
                            }}
                            className="flex-1 text-red-600 hover:text-red-700"
                          >
                            <Minus className="h-4 w-4 mr-2" />
                            Remover
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seção de Comidas */}
        <TabsContent value="food">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Comidas</CardTitle>
                <Button onClick={() => setIsNewFoodDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Comida
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products?.map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <p className="text-sm text-gray-500">{product.category}</p>
                        </div>
                        <Badge variant={product.available ? 'default' : 'destructive'}>
                          {product.available ? 'Disponível' : 'Indisponível'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Custo:</span>
                            <span>R$ {product.cost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Preço:</span>
                            <span className="font-medium">R$ {product.price.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-500">Ingredientes:</p>
                          <div className="flex flex-wrap gap-1">
                            {product.ingredients.map((ing, idx) => (
                              <Badge key={idx} variant="secondary">
                                {ingredients.find(i => i.id === ing.ingredientId)?.name}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => openEditFoodDialog(product)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-red-600"
                            onClick={() => {
                              setItemToDelete({
                                type: 'food',
                                id: product.id,
                                name: product.name
                              });
                              setIsDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seção de Controle */}
        <TabsContent value="control">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-800 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Estoque Crítico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-900">
                  {ingredients.filter(ing => ing.current_stock <= ing.min_stock).length +
                    externalProducts.filter(p => p.current_stock <= p.min_stock).length}
                </div>
                <p className="text-sm text-red-700">Itens em nível crítico</p>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-yellow-800 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Estoque Baixo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-900">
                  {ingredients.filter(ing => {
                    const percentageAboveMin = ((ing.current_stock - ing.min_stock) / ing.min_stock) * 100;
                    return ing.current_stock > ing.min_stock && percentageAboveMin <= 25;
                  }).length +
                    externalProducts.filter(p => {
                      const percentageAboveMin = ((p.current_stock - p.min_stock) / p.min_stock) * 100;
                      return p.current_stock > p.min_stock && percentageAboveMin <= 25;
                    }).length}
                </div>
                <p className="text-sm text-yellow-700">Itens com estoque baixo</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-green-800 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Estoque Normal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">
                  {ingredients.filter(ing => {
                    const percentageAboveMin = ((ing.current_stock - ing.min_stock) / ing.min_stock) * 100;
                    return ing.current_stock > ing.min_stock && percentageAboveMin > 25;
                  }).length +
                    externalProducts.filter(p => {
                      const percentageAboveMin = ((p.current_stock - p.min_stock) / p.min_stock) * 100;
                      return p.current_stock > p.min_stock && percentageAboveMin > 25;
                    }).length}
                </div>
                <p className="text-sm text-green-700">Itens com estoque adequado</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Itens com Estoque Crítico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {criticalIngredients.map((item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow border-red-200 bg-red-50">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                          <p className="text-sm text-red-600">Ingrediente</p>
                        </div>
                        <Badge variant="destructive">Crítico</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="font-medium text-red-600">
                            {(() => {
                              const formattedCurrent = formatStockValue(item.current_stock, item.unit);
                              return `${formattedCurrent.value} ${formattedCurrent.unit}`;
                            })()}
                          </span>
                          <span className="text-red-500">/ {(() => {
                            const formattedMin = formatStockValue(item.min_stock, item.unit);
                            return `${formattedMin.value} ${formattedMin.unit}`;
                          })()} min</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {externalProducts
                  .filter(p => getStockStatus(p.current_stock, p.min_stock).status === 'danger')
                  .map((product) => (
                    <Card key={product.id} className="hover:shadow-lg transition-shadow border-red-200 bg-red-50">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{product.name}</CardTitle>
                            <p className="text-sm text-red-600">Produto Externo</p>
                          </div>
                          <Badge variant="destructive">Crítico</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="font-medium text-red-600">
                              {(() => {
                                const formattedCurrent = formatStockValue(product.current_stock, product.unit);
                                return `${formattedCurrent.value} ${formattedCurrent.unit}`;
                              })()}
                            </span>
                            <span className="text-red-500">/ {(() => {
                              const formattedMin = formatStockValue(product.min_stock, product.unit);
                              return `${formattedMin.value} ${formattedMin.unit}`;
                            })()} min</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Ajuste de Estoque */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === 'add' ? 'Nova Entrada de Estoque' : 'Consumir Estoque'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Item</Label>
              <p className="text-lg font-medium">{selectedIngredient?.name}</p>
            </div>
            <div>
              <Label htmlFor="quantity">Quantidade ({selectedIngredient?.unit})</Label>
              <Input
                id="quantity"
                type="number"
                value={adjustmentQuantity}
                onChange={(e) => setAdjustmentQuantity(Number(e.target.value))}
                min="0"
                step="0.1"
              />
            </div>
            {adjustmentType === 'add' && (
              <>
                <div>
                  <Label htmlFor="unitCost">Custo Unitário (R$)</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="supplier">Fornecedor (opcional)</Label>
                  <Input
                    id="supplier"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="invoiceNumber">Número da Nota Fiscal (opcional)</Label>
                  <Input
                    id="invoiceNumber"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsStockDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleStockAdjustment}>
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Novo Ingrediente */}
      <Dialog open={isNewIngredientDialogOpen} onOpenChange={setIsNewIngredientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Ingrediente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNewIngredient} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={newIngredientForm.name}
                onChange={(e) => setNewIngredientForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="unit">Unidade Base</Label>
              <Select
                value={newIngredientForm.unit}
                onValueChange={(value: Unit) => {
                  setNewIngredientForm(prev => ({
                    ...prev,
                    unit: value,
                    minStockUnit: value
                  }));
                }}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currentStock">Estoque Inicial</Label>
                <Input
                  id="currentStock"
                  type="number"
                  value={newIngredientForm.currentStock}
                  onChange={(e) => setNewIngredientForm(prev => ({ ...prev, currentStock: Number(e.target.value) }))}
                  min="0"
                  step="0.1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="minStock">Estoque Mínimo</Label>
                <div className="flex gap-2">
                  <Input
                    id="minStock"
                    type="number"
                    value={newIngredientForm.minStock}
                    onChange={(e) => setNewIngredientForm(prev => ({
                      ...prev,
                      minStock: Number(e.target.value)
                    }))}
                    min="0"
                    step="0.001"
                    required
                  />
                  <Select
                    value={newIngredientForm.minStockUnit}
                    onValueChange={(value: Unit) => handleMinStockUnitChange(value)}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableSubunits(newIngredientForm.unit).map(unit => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="cost">Custo Unitário (R$)</Label>
              <Input
                id="cost"
                type="number"
                value={newIngredientForm.cost}
                onChange={(e) => setNewIngredientForm(prev => ({ ...prev, cost: Number(e.target.value) }))}
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <Label htmlFor="supplier">Fornecedor (opcional)</Label>
              <Input
                id="supplier"
                value={newIngredientForm.supplier}
                onChange={(e) => setNewIngredientForm(prev => ({ ...prev, supplier: e.target.value }))}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsNewIngredientDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Criar Ingrediente
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Novo Produto */}
      <Dialog open={isNewProductDialogOpen} onOpenChange={setIsNewProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Produto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNewProduct} className="space-y-4">
            <div>
              <Label htmlFor="productName">Nome</Label>
              <Input
                id="productName"
                value={newProductForm.name}
                onChange={(e) => setNewProductForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={newProductForm.brand}
                onChange={(e) => setNewProductForm(prev => ({ ...prev, brand: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={newProductForm.description}
                onChange={(e) => setNewProductForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="productCurrentStock">Estoque Inicial</Label>
                <Input
                  id="productCurrentStock"
                  type="number"
                  value={newProductForm.currentStock}
                  onChange={(e) => setNewProductForm(prev => ({ ...prev, currentStock: Number(e.target.value) }))}
                  min="0"
                  step="1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="productMinStock">Estoque Mínimo</Label>
                <Input
                  id="productMinStock"
                  type="number"
                  value={newProductForm.minStock}
                  onChange={(e) => setNewProductForm(prev => ({ ...prev, minStock: Number(e.target.value) }))}
                  min="0"
                  step="1"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="productCost">Custo Unitário (R$)</Label>
                <Input
                  id="productCost"
                  type="number"
                  value={newProductForm.cost}
                  onChange={(e) => setNewProductForm(prev => ({ ...prev, cost: Number(e.target.value) }))}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">Preço de Venda (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  value={newProductForm.price}
                  onChange={(e) => setNewProductForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsNewProductDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Criar Produto
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Nova Comida */}
      <Dialog open={isNewFoodDialogOpen} onOpenChange={setIsNewFoodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Comida</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNewFood} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={newFoodForm.name}
                onChange={(e) => setNewFoodForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                value={newFoodForm.category}
                onChange={(e) => setNewFoodForm(prev => ({ ...prev, category: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={newFoodForm.description}
                onChange={(e) => setNewFoodForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Ingredientes</Label>
                <Button type="button" variant="outline" size="sm" onClick={addIngredientToFood}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Ingrediente
                </Button>
              </div>
              <div className="space-y-2">
                {newFoodForm.ingredients.map((ing, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label>Ingrediente</Label>
                      <Select
                        value={ing.ingredientId}
                        onValueChange={(value) => {
                          const ingredient = ingredients.find(i => i.id === value);
                          if (ingredient) {
                            setNewFoodForm(prev => {
                              const newIngredients = [...prev.ingredients];
                              newIngredients[index] = {
                                ingredientId: value,
                                quantity: 0,
                                unit: ingredient.unit
                              };
                              return { ...prev, ingredients: newIngredients };
                            });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o ingrediente" />
                        </SelectTrigger>
                        <SelectContent>
                          {ingredients.map((ingredient) => (
                            <SelectItem key={ingredient.id} value={ingredient.id}>
                              {ingredient.name} ({ingredient.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32">
                      <Label>Quantidade</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.001"
                          value={ing.quantity}
                          onChange={(e) => updateFoodIngredient(index, 'quantity', Number(e.target.value))}
                          required
                        />
                        {ing.ingredientId && ingredients.find(i => i.id === ing.ingredientId)?.unit !== 'unidade' && (
                          <Select
                            value={ing.unit}
                            onValueChange={(value: Unit) => updateFoodIngredientUnit(index, value)}
                          >
                            <SelectTrigger className="w-[80px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableSubunits(
                                ingredients.find(i => i.id === ing.ingredientId)?.unit || 'unidade'
                              ).map(unit => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {ing.ingredientId && ingredients.find(i => i.id === ing.ingredientId)?.unit === 'unidade' && (
                          <span className="text-sm text-gray-500 ml-2">unidade(s)</span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="flex-none"
                      onClick={() => removeFoodIngredient(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cost">Custo de Produção (R$)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={newFoodForm.cost}
                  readOnly
                  className="bg-gray-100"
                />
                <p className="text-sm text-gray-500 mt-1">Calculado automaticamente</p>
              </div>
              <div>
                <Label htmlFor="price">Preço de Venda (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={newFoodForm.price}
                  onChange={(e) => setNewFoodForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsNewFoodDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Criar Comida
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Ingrediente */}
      <Dialog open={isEditIngredientDialogOpen} onOpenChange={setIsEditIngredientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Ingrediente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditIngredient} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editIngredientForm.name}
                onChange={(e) => setEditIngredientForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-unit">Unidade</Label>
              <Select
                value={editIngredientForm.unit}
                onValueChange={(value) => setEditIngredientForm(prev => ({ ...prev, unit: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Quilograma (kg)</SelectItem>
                  <SelectItem value="g">Grama (g)</SelectItem>
                  <SelectItem value="L">Litro (L)</SelectItem>
                  <SelectItem value="ml">Mililitro (ml)</SelectItem>
                  <SelectItem value="unidade">Unidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-cost">Custo Unitário (R$)</Label>
              <Input
                id="edit-cost"
                type="number"
                value={editIngredientForm.cost}
                onChange={(e) => setEditIngredientForm(prev => ({ ...prev, cost: Number(e.target.value) }))}
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-min-stock">Estoque Mínimo</Label>
              <Input
                id="edit-min-stock"
                type="number"
                value={editIngredientForm.min_stock}
                onChange={(e) => setEditIngredientForm(prev => ({ ...prev, min_stock: Number(e.target.value) }))}
                min="0"
                step="0.1"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-supplier">Fornecedor (opcional)</Label>
              <Input
                id="edit-supplier"
                value={editIngredientForm.supplier || ''}
                onChange={(e) => setEditIngredientForm(prev => ({ ...prev, supplier: e.target.value || null }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descrição (opcional)</Label>
              <Textarea
                id="edit-description"
                value={editIngredientForm.description || ''}
                onChange={(e) => setEditIngredientForm(prev => ({ ...prev, description: e.target.value || null }))}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditIngredientDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Comida */}
      <Dialog open={isEditFoodDialogOpen} onOpenChange={setIsEditFoodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Comida</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditFood} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={newFoodForm.name}
                onChange={(e) => setNewFoodForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                value={newFoodForm.category}
                onChange={(e) => setNewFoodForm(prev => ({ ...prev, category: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={newFoodForm.description}
                onChange={(e) => setNewFoodForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Ingredientes</Label>
                <Button type="button" variant="outline" size="sm" onClick={addIngredientToFood}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Ingrediente
                </Button>
              </div>
              <div className="space-y-2">
                {newFoodForm.ingredients.map((ing, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label>Ingrediente</Label>
                      <Select
                        value={ing.ingredientId}
                        onValueChange={(value) => {
                          const ingredient = ingredients.find(i => i.id === value);
                          if (ingredient) {
                            setNewFoodForm(prev => {
                              const newIngredients = [...prev.ingredients];
                              newIngredients[index] = {
                                ingredientId: value,
                                quantity: 0,
                                unit: ingredient.unit
                              };
                              return { ...prev, ingredients: newIngredients };
                            });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o ingrediente" />
                        </SelectTrigger>
                        <SelectContent>
                          {ingredients.map((ingredient) => (
                            <SelectItem key={ingredient.id} value={ingredient.id}>
                              {ingredient.name} ({ingredient.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32">
                      <Label>Quantidade</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.001"
                          value={ing.quantity}
                          onChange={(e) => updateFoodIngredient(index, 'quantity', Number(e.target.value))}
                          required
                        />
                        {ing.ingredientId && ingredients.find(i => i.id === ing.ingredientId)?.unit !== 'unidade' && (
                          <Select
                            value={ing.unit}
                            onValueChange={(value: Unit) => updateFoodIngredientUnit(index, value)}
                          >
                            <SelectTrigger className="w-[80px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableSubunits(
                                ingredients.find(i => i.id === ing.ingredientId)?.unit || 'unidade'
                              ).map(unit => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {ing.ingredientId && ingredients.find(i => i.id === ing.ingredientId)?.unit === 'unidade' && (
                          <span className="text-sm text-gray-500 ml-2">unidade(s)</span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="flex-none"
                      onClick={() => removeFoodIngredient(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cost">Custo de Produção (R$)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={newFoodForm.cost}
                  readOnly
                  className="bg-gray-100"
                />
                <p className="text-sm text-gray-500 mt-1">Calculado automaticamente</p>
              </div>
              <div>
                <Label htmlFor="price">Preço de Venda (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={newFoodForm.price}
                  onChange={(e) => setNewFoodForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditFoodDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'food'
                ? `Tem certeza que deseja excluir a comida "${itemToDelete.name}"? Esta ação não pode ser desfeita.`
                : `Tem certeza que deseja excluir o ingrediente "${itemToDelete?.name}" e todos os seus dados de estoque? Esta ação não pode ser desfeita.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteConfirm}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
