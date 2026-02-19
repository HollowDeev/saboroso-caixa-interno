import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { OrderItem } from '@/types';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: OrderItem[];
  onPrint: (selectedItems: OrderItem[]) => void;
}

export const PrintModal = ({ isOpen, onClose, items, onPrint }: PrintModalProps) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      console.log('PrintModal opened with items:', items);
      // Inicialmente todos marcados
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  }, [isOpen, items]);

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handlePrint = () => {
    const selected = items.filter(item => selectedItems.has(item.id));
    onPrint(selected);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Selecionar Itens para Imprimir</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center space-x-2">
              <Checkbox
                id={item.id}
                checked={selectedItems.has(item.id)}
                onCheckedChange={() => toggleItem(item.id)}
              />
              <label htmlFor={item.id} className="text-sm">
                {item.product_name} x{item.quantity} - R$ {item.totalPrice.toFixed(2)}
              </label>
            </div>
          ))}
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handlePrint}>
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};