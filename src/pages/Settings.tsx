import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/contexts/AppContext';
import { ServiceTax } from '@/types';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export const Settings = () => {
    const { serviceTaxes, addServiceTax, updateServiceTax, deleteServiceTax } = useApp();
    const [isAddTaxOpen, setIsAddTaxOpen] = useState(false);
    const [editingTax, setEditingTax] = useState<ServiceTax | null>(null);
    const [newTax, setNewTax] = useState({
        name: '',
        description: '',
        percentage: 0,
        isActive: true
    });

    const handleAddTax = () => {
        addServiceTax(newTax);
        setNewTax({
            name: '',
            description: '',
            percentage: 0,
            isActive: true
        });
        setIsAddTaxOpen(false);
    };

    const handleUpdateTax = () => {
        if (editingTax) {
            updateServiceTax(editingTax.id, newTax);
            setEditingTax(null);
            setNewTax({
                name: '',
                description: '',
                percentage: 0,
                isActive: true
            });
        }
    };

    const handleDeleteTax = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta taxa?')) {
            deleteServiceTax(id);
        }
    };

    const openEditTax = (tax: ServiceTax) => {
        setEditingTax(tax);
        setNewTax({
            name: tax.name,
            description: tax.description,
            percentage: tax.percentage,
            isActive: tax.isActive
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
                <p className="text-gray-600">Gerencie as configurações do sistema</p>
            </div>

            <Tabs defaultValue="account">
                <TabsList>
                    <TabsTrigger value="account">Conta</TabsTrigger>
                    <TabsTrigger value="taxes">Taxas de Serviço</TabsTrigger>
                </TabsList>

                <TabsContent value="account" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configurações da Conta</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="email">E-mail</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value="admin@restaurant.com"
                                    disabled
                                />
                            </div>
                            <div>
                                <Label htmlFor="name">Nome</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value="Admin User"
                                    disabled
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">Alterar Senha</h3>
                                    <p className="text-sm text-gray-600">Atualize sua senha de acesso</p>
                                </div>
                                <Button variant="outline">
                                    Alterar Senha
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="taxes" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Taxas de Serviço</CardTitle>
                            <Button onClick={() => setIsAddTaxOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nova Taxa
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {serviceTaxes.length === 0 ? (
                                    <p className="text-center text-gray-600">
                                        Nenhuma taxa cadastrada. Clique em "Nova Taxa" para começar.
                                    </p>
                                ) : (
                                    serviceTaxes.map((tax) => (
                                        <div key={tax.id} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="space-y-1">
                                                <h3 className="font-medium">{tax.name}</h3>
                                                <p className="text-sm text-gray-600">{tax.description}</p>
                                                <p className="text-sm font-medium">{tax.percentage}%</p>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        checked={tax.isActive}
                                                        onCheckedChange={(checked) => updateServiceTax(tax.id, { isActive: checked })}
                                                    />
                                                    <span className="text-sm text-gray-600">
                                                        {tax.isActive ? 'Ativa' : 'Inativa'}
                                                    </span>
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => openEditTax(tax)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteTax(tax.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isAddTaxOpen || !!editingTax} onOpenChange={() => {
                if (isAddTaxOpen) setIsAddTaxOpen(false);
                if (editingTax) setEditingTax(null);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingTax ? 'Editar Taxa' : 'Nova Taxa'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="taxName">Nome da Taxa</Label>
                            <Input
                                id="taxName"
                                value={newTax.name}
                                onChange={(e) => setNewTax({ ...newTax, name: e.target.value })}
                                placeholder="Ex: Taxa de Serviço"
                            />
                        </div>
                        <div>
                            <Label htmlFor="taxDescription">Descrição</Label>
                            <Textarea
                                id="taxDescription"
                                value={newTax.description}
                                onChange={(e) => setNewTax({ ...newTax, description: e.target.value })}
                                placeholder="Descreva o propósito desta taxa"
                            />
                        </div>
                        <div>
                            <Label htmlFor="taxPercentage">Porcentagem (%)</Label>
                            <Input
                                id="taxPercentage"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={newTax.percentage}
                                onChange={(e) => setNewTax({ ...newTax, percentage: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="taxActive"
                                checked={newTax.isActive}
                                onCheckedChange={(checked) => setNewTax({ ...newTax, isActive: checked })}
                            />
                            <Label htmlFor="taxActive">Taxa Ativa</Label>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => {
                                setIsAddTaxOpen(false);
                                setEditingTax(null);
                                setNewTax({
                                    name: '',
                                    description: '',
                                    percentage: 0,
                                    isActive: true
                                });
                            }}>
                                Cancelar
                            </Button>
                            <Button onClick={editingTax ? handleUpdateTax : handleAddTax}>
                                {editingTax ? 'Salvar' : 'Adicionar'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}; 