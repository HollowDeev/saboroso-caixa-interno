
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface NoCashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
  onOpenCashRegister?: () => void;
}

export const NoCashRegisterModal = ({ isOpen, onClose, isOwner, onOpenCashRegister }: NoCashRegisterModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Caixa Fechado</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-gray-600">
            {isOwner 
              ? "Não há nenhum caixa aberto. Para registrar vendas ou criar comandas, você precisa abrir um caixa primeiro."
              : "Não há nenhum caixa aberto. Solicite ao dono do estabelecimento para abrir um caixa antes de registrar vendas ou criar comandas."
            }
          </p>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Entendi
            </Button>
            {isOwner && onOpenCashRegister && (
              <Button onClick={onOpenCashRegister} className="flex-1">
                Abrir Caixa
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
