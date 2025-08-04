"use client";

import { Discount, createDiscount, getDiscounts, updateDiscount, deleteDiscount } from '@/services/discountService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash, ToggleLeft, ToggleRight } from 'lucide-react';
import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

function DiscountCard({ discount, onEdit, onDelete, onToggle }) {
    return (
        <div className="border rounded p-4 flex flex-col gap-2 bg-white shadow">
            <div className="flex justify-between items-center">
                <div>
                    <div className="font-bold">{discount.name}</div>
                    <div className="text-xs text-gray-500">{discount.productType === 'food' ? 'Comida' : 'Produto Externo'}</div>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={onEdit}><Edit size={18} /></Button>
                    <Button variant="ghost" size="icon" onClick={onDelete}><Trash size={18} /></Button>
                    <Button variant="ghost" size="icon" onClick={onToggle} title={discount.active ? 'Desativar' : 'Ativar'}>
                        {discount.active ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} className="text-gray-400" />}
                    </Button>
                </div>
            </div>
            <div className="text-sm">Novo valor: <span className="font-mono">R$ {discount.newPrice.toFixed(2)}</span></div>
            <div className="text-xs text-gray-400">ID: {discount.id}</div>
        </div>
    );
}

function ProductSelector({ products, externalProducts, selected, setSelected, search, setSearch }) {
    const all = React.useMemo(() => [
        ...products.map(p => ({ ...p, type: 'food' })),
        ...externalProducts.map(p => ({ ...p, type: 'external_product' }))
    ], [products, externalProducts]);
    const filtered = React.useMemo(() => all.filter(p => p.name.toLowerCase().includes(search.toLowerCase())), [all, search]);
    return (
        <div>
            <Input placeholder="Buscar produto ou comida..." value={search} onChange={e => setSearch(e.target.value)} className="mb-2" />
            <div className="max-h-48 overflow-y-auto grid grid-cols-1 gap-2">
                {filtered.map(p => (
                    <button
                        key={p.id}
                        className={`border rounded p-2 text-left ${selected?.id === p.id ? 'border-blue-600 bg-blue-50' : ''}`}
                        onClick={() => setSelected(p)}
                        type="button"
                    >
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.type === 'food' ? 'Comida' : 'Produto Externo'}</div>
                    </button>
                ))}
                {filtered.length === 0 && <div className="text-xs text-gray-400">Nenhum resultado</div>}
            </div>
        </div>
    );
}

function DiscountModal({ open, onClose, onCreated, products, externalProducts }) {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [name, setName] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [loading, setLoading] = useState(false);
    const cost = selected ? Number(selected.cost) : 0;
    const price = selected ? Number(selected.price) : 0;
    const lucro = selected && newPrice ? Number(newPrice) - cost : 0;

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!selected || !name || !newPrice) return;
        setLoading(true);
        try {
            await createDiscount({
                productType: selected.type,
                productId: selected.id,
                name,
                newPrice: Number(newPrice),
                active: true
            });
            onCreated();
            onClose();
        } catch (err) {
            alert('Erro ao criar desconto');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Criar Desconto</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-3">
                    <ProductSelector products={products} externalProducts={externalProducts} selected={selected} setSelected={setSelected} search={search} setSearch={setSearch} />
                    {selected && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>Custo: <span className="font-mono">R$ {cost.toFixed(2)}</span></div>
                            <div>Preço atual: <span className="font-mono">R$ {price.toFixed(2)}</span></div>
                            <div>Lucro atual: <span className="font-mono">R$ {(price - cost).toFixed(2)}</span></div>
                            <div>Novo lucro: <span className="font-mono">R$ {lucro.toFixed(2)}</span></div>
                        </div>
                    )}
                    <Input placeholder="Nome do desconto" value={name} onChange={e => setName(e.target.value)} required className="w-full" />
                    <Input placeholder="Novo valor" type="number" min={0} step={0.01} value={newPrice} onChange={e => setNewPrice(e.target.value)} required className="w-full" />
                    <Button type="submit" className="w-full" disabled={loading || !selected || !name || !newPrice}>{loading ? 'Salvando...' : 'Criar desconto'}</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function DiscountsAdminPage() {
  const { products, externalProducts, currentUser } = useAppContext();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const data = await getDiscounts();
      setDiscounts(data);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { fetchDiscounts(); }, []);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="p-8 text-center bg-white rounded shadow">Acesso restrito ao ADMIN.</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 bg-gray-50">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Descontos</h1>
              <Button onClick={() => setModalOpen(true)}><Plus className="mr-2" size={18} />Novo desconto</Button>
            </div>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Carregando...</div>
            ) : (
              <div className="grid gap-4">
                {discounts.map(discount => (
                  <DiscountCard
                    key={discount.id}
                    discount={discount}
                    onEdit={() => { }}
                    onDelete={async () => { await deleteDiscount(discount.id); fetchDiscounts(); }}
                    onToggle={async () => { await updateDiscount(discount.id, { active: !discount.active }); fetchDiscounts(); }}
                  />
                ))}
                {discounts.length === 0 && <div className="text-gray-400 text-sm text-center">Nenhum desconto cadastrado.</div>}
              </div>
            )}
            <DiscountModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={fetchDiscounts} products={products} externalProducts={externalProducts} />
          </div>
        </main>
      </div>
    </div>
  );
}
