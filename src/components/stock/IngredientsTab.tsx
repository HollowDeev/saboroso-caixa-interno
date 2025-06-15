
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { Ingredient, Unit } from '@/types';
import { IngredientForm } from './IngredientForm';
import { toast } from 'sonner';

interface IngredientsTabProps {
  ingredients: Ingredient[];
  currentUser: any;
  addIngredient: (ingredient: any) => Promise<void>;
  updateIngredient: (id: string, ingredient: any) => Promise<void>;
  deleteIngredient: (id: string) => Promise<void>;
}

export const IngredientsTab: React.FC<IngredientsTabProps> = ({
  ingredients,
  currentUser,
  addIngredient,
  updateIngredient,
  deleteIngredient
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

  const [newIngredient, setNewIngredient] = useState({
    name: '',
    unit: 'kg' as Unit,
    current_stock: 0,
    min_stock: 0,
    cost: 0,
    supplier: '',
    description: null as string | null,
  });

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
      setIsAddOpen(false);
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
      setIsEditOpen(false);
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

  const openEditIngredient = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setIsEditOpen(true);
  };

  const getStockStatus = (currentStock: number, minStock: number) => {
    if (currentStock === 0) return { status: 'out', color: 'destructive', text: 'Sem estoque' };
    if (currentStock <= minStock) return { status: 'low', color: 'warning', text: 'Estoque baixo' };
    return { status: 'good', color: 'default', text: 'Em estoque' };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Ingredientes</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
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
            <IngredientForm
              ingredient={newIngredient}
              onChange={(field, value) => setNewIngredient(prev => ({ ...prev, [field]: value }))}
              onSubmit={handleAddIngredient}
              onCancel={() => setIsAddOpen(false)}
              submitLabel="Adicionar Ingrediente"
            />
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

      {/* Edit Ingredient Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Ingrediente</DialogTitle>
          </DialogHeader>
          {selectedIngredient && (
            <IngredientForm
              ingredient={selectedIngredient}
              onChange={(field, value) => setSelectedIngredient(prev => prev ? ({ ...prev, [field]: value }) : null)}
              onSubmit={handleEditIngredient}
              onCancel={() => setIsEditOpen(false)}
              submitLabel="Salvar Alterações"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
