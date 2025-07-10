import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

interface AddExpenseItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SelectedItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: 'food' | 'external';
}

const AddExpenseItemModal: React.FC<AddExpenseItemModalProps> = ({ isOpen, onClose }) => {
  const { products, externalProducts } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const addItem = (item: SelectedItem) => {
    const exists = selectedItems.find(i => i.id === item.id && i.type === item.type);
    if (exists) {
      setSelectedItems(prev => prev.map(i =>
        i.id === item.id && i.type === item.type
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setSelectedItems(prev => [...prev, { ...item, quantity: 1 }]);
    }
  };

  const removeItem = (id: string, type: 'food' | 'external') => {
    setSelectedItems(prev => prev.filter(i => !(i.id === id && i.type === type)));
  };

  const updateQuantity = (id: string, type: 'food' | 'external', quantity: number) => {
    if (quantity <= 0) {
      removeItem(id, type);
      return;
    }
    setSelectedItems(prev => prev.map(i =>
      i.id === id && i.type === type ? { ...i, quantity } : i
    ));
  };

  // Filtros
  const filteredFoods = products
    .filter(p => p.available && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  const filteredExternals = externalProducts
    .filter(p => p.current_stock > 0 && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Placeholder para submit
  const handleAddItems = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui será feita a integração para adicionar todos os itens na conta de despesas
    setSelectedItems([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-xl">Adicionar Itens à Conta de Despesas</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddItems} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label htmlFor="itemSearch" className="block text-sm font-medium mb-1">Pesquisar Produtos ou Comidas</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="itemSearch"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Digite o nome do item..."
                  className="pl-10"
                />
              </div>
            </div>
            <div className="h-96 overflow-y-auto border rounded-lg p-3 bg-white">
              {filteredFoods.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2 sticky top-0 bg-white py-1">Comidas ({filteredFoods.length})</h4>
                  {filteredFoods.map(product => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-white">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-sm text-gray-600">R$ {product.price.toFixed(2)}</p>
                        {product.description && (
                          <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => addItem({ id: product.id, name: product.name, price: product.price, quantity: 1, type: 'food' })}
                        className="bg-green-500 hover:bg-green-600 ml-2"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {filteredExternals.length > 0 && (
                <div className={filteredFoods.length > 0 ? 'mt-4' : ''}>
                  <h4 className="text-sm font-medium text-gray-500 mb-2 sticky top-0 bg-white py-1">Produtos Externos ({filteredExternals.length})</h4>
                  {filteredExternals.map(product => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-white">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-sm text-gray-600">R$ {product.price.toFixed(2)}</p>
                        {product.description && (
                          <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => addItem({ id: product.id, name: product.name, price: product.price, quantity: 1, type: 'external' })}
                        className="bg-green-500 hover:bg-green-600 ml-2"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {filteredFoods.length === 0 && filteredExternals.length === 0 && (
                <div className="text-gray-500 text-center py-8">Nenhum item encontrado.</div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold mb-3">Itens Selecionados</h3>
            <div className="h-96 overflow-y-auto border rounded-lg p-3 bg-white">
              {selectedItems.length === 0 ? (
                <div className="text-gray-500 text-center py-8">Nenhum item selecionado.</div>
              ) : (
                selectedItems.map(item => (
                  <div key={item.id + item.type} className="flex items-center justify-between border-b py-2">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.type === 'food' ? 'Comida' : 'Produto Externo'}</p>
                      <p className="text-sm text-gray-600">R$ {item.price.toFixed(2)} x </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => updateQuantity(item.id, item.type, Number(e.target.value))}
                        className="w-16"
                      />
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(item.id, item.type)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={selectedItems.length === 0}>
              Adicionar {selectedItems.length > 1 ? 'Itens' : 'Item'} à Conta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddExpenseItemModal; 