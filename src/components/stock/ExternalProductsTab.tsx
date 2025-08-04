
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { ExternalProduct } from '@/types';
import { ExternalProductForm } from './ExternalProductForm';
import { toast } from 'sonner';

interface ExternalProductsTabProps {
  externalProducts: ExternalProduct[];
  currentUser: any;
  addExternalProduct: (product: any) => Promise<void>;
  updateExternalProduct: (id: string, product: any) => Promise<void>;
  deleteExternalProduct: (id: string) => Promise<void>;
}

export const ExternalProductsTab: React.FC<ExternalProductsTabProps> = ({
  externalProducts,
  currentUser,
  addExternalProduct,
  updateExternalProduct,
  deleteExternalProduct
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ExternalProduct | null>(null);

  const [newProduct, setNewProduct] = useState({
    name: '',
    brand: null as string | null,
    description: null as string | null,
    cost: 0,
    price: 0,
    current_stock: 0,
    min_stock: 0,
  });

  const resetNewProduct = () => {
    setNewProduct({
      name: '',
      brand: null,
      description: null,
      cost: 0,
      price: 0,
      current_stock: 0,
      min_stock: 0,
    });
  };

  const handleAddProduct = async () => {
    if (!currentUser?.id) {
      toast.error('Usuário não encontrado');
      return;
    }

    try {
      await addExternalProduct({
        ...newProduct,
        owner_id: currentUser.id,
      });
      setIsAddOpen(false);
      resetNewProduct();
      toast.success('Produto externo adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar produto externo:', error);
      toast.error('Erro ao adicionar produto externo');
    }
  };

  const handleEditProduct = async () => {
    if (!selectedProduct) return;

    try {
      await updateExternalProduct(selectedProduct.id, {
        name: selectedProduct.name,
        brand: selectedProduct.brand,
        description: selectedProduct.description,
        cost: selectedProduct.cost,
        price: selectedProduct.price,
        current_stock: selectedProduct.current_stock,
        min_stock: selectedProduct.min_stock,
      });
      setIsEditOpen(false);
      setSelectedProduct(null);
      toast.success('Produto externo atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar produto externo:', error);
      toast.error('Erro ao atualizar produto externo');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteExternalProduct(id);
      toast.success('Produto externo excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir produto externo:', error);
      toast.error('Erro ao excluir produto externo');
    }
  };

  const openEditProduct = (product: ExternalProduct) => {
    setSelectedProduct(product);
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
        <h2 className="text-2xl font-semibold">Produtos Externos</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
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
            <ExternalProductForm
              product={newProduct}
              onChange={(field, value) => setNewProduct(prev => ({ ...prev, [field]: value }))}
              onSubmit={handleAddProduct}
              onCancel={() => setIsAddOpen(false)}
              submitLabel="Adicionar Produto"
            />
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

      {/* Edit Product Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Produto Externo</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <ExternalProductForm
              product={selectedProduct}
              onChange={(field, value) => setSelectedProduct(prev => prev ? ({ ...prev, [field]: value }) : null)}
              onSubmit={handleEditProduct}
              onCancel={() => setIsEditOpen(false)}
              submitLabel="Salvar Alterações"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
