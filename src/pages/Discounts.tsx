import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash, ToggleLeft, ToggleRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/contexts/AppContext";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

interface Discount {
  id: string;
  productType: "external_product" | "food";
  productId: string;
  name: string;
  newPrice: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  productName?: string;
}

export default function DiscountsPage() {
  const { products, externalProducts } = useAppContext();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleDelete = (id: string) => {
    setDiscounts(discounts.filter((d) => d.id !== id));
  };
  const handleToggle = (id: string) => {
    setDiscounts(discounts.map((d) => d.id === id ? { ...d, active: !d.active } : d));
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 bg-gray-50">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Descontos</h1>
              <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
                <Plus className="mr-2" size={18} />Novo desconto
              </Button>
            </div>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Carregando...</div>
            ) : (
              <div className="grid gap-4">
                {discounts.map((discount) => (
                  <div key={discount.id} className="border rounded p-4 flex flex-col gap-2 bg-white shadow">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold">{discount.name}</div>
                        <div className="text-xs text-gray-500">
                          {discount.productType === "food" ? "Comida" : "Produto Externo"} - {discount.productName}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(discount); setModalOpen(true); }}><Edit size={18} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(discount.id)}><Trash size={18} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleToggle(discount.id)} title={discount.active ? "Desativar" : "Ativar"}>
                          {discount.active ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} className="text-gray-400" />}
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm">Novo valor: <span className="font-mono">R$ {discount.newPrice.toFixed(2)}</span></div>
                    <div className="text-xs text-gray-400">ID: {discount.id}</div>
                  </div>
                ))}
                {discounts.length === 0 && <div className="text-gray-400 text-sm text-center">Nenhum desconto cadastrado.</div>}
              </div>
            )}
            <DiscountModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              onSave={(d: Discount) => {
                if (editing) {
                  setDiscounts(discounts.map((disc) => disc.id === d.id ? d : disc));
                } else {
                  setDiscounts([...discounts, { ...d, id: Math.random().toString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]);
                }
                setModalOpen(false);
              }}
              editing={editing}
              products={products}
              externalProducts={externalProducts}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

interface DiscountModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (d: Discount) => void;
  editing: Discount | null;
  products: any[];
  externalProducts: any[];
}

function DiscountModal({ open, onClose, onSave, editing, products, externalProducts }: DiscountModalProps) {
  const [productType, setProductType] = useState<"food" | "external_product">(editing?.productType || "food");
  const [productId, setProductId] = useState(editing?.productId || "");
  const [name, setName] = useState(editing?.name || "");
  const [newPrice, setNewPrice] = useState(editing?.newPrice?.toString() || "");
  const [active, setActive] = useState(editing?.active ?? true);

  const item = productType === "food"
    ? products.find((p) => p.id === productId)
    : externalProducts.find((p) => p.id === productId);
  const cost = item ? Number(item.cost) : 0;
  const price = item ? Number(item.price) : 0;
  const lucroAtual = price - cost;
  const lucroDesconto = newPrice ? Number(newPrice) - cost : 0;

  useEffect(() => {
    if (editing) {
      setProductType(editing.productType);
      setProductId(editing.productId);
      setName(editing.name);
      setNewPrice(editing.newPrice.toString());
      setActive(editing.active);
    } else {
      setProductType("food");
      setProductId("");
      setName("");
      setNewPrice("");
      setActive(true);
    }
  }, [editing, open]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !name || !newPrice) return;
    onSave({
      id: editing?.id || Math.random().toString(),
      productType,
      productId,
      name,
      newPrice: Number(newPrice),
      active,
      productName: item?.name || "",
      createdAt: editing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Desconto" : "Novo Desconto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="flex gap-2">
            <Button type="button" variant={productType === "food" ? "default" : "outline"} onClick={() => setProductType("food")}>Comida</Button>
            <Button type="button" variant={productType === "external_product" ? "default" : "outline"} onClick={() => setProductType("external_product")}>Produto Externo</Button>
          </div>
          <select
            className="w-full border rounded p-2"
            value={productId}
            onChange={e => setProductId(e.target.value)}
            required
          >
            <option value="">Selecione {productType === "food" ? "uma comida" : "um produto"}</option>
            {(productType === "food" ? products : externalProducts).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Input placeholder="Nome do desconto" value={name} onChange={e => setName(e.target.value)} required className="w-full" />
          <Input placeholder="Novo valor" type="number" min={0} step={0.01} value={newPrice} onChange={e => setNewPrice(e.target.value)} required className="w-full" />
          {item && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Custo: <span className="font-mono">R$ {cost.toFixed(2)}</span></div>
              <div>Preço atual: <span className="font-mono">R$ {price.toFixed(2)}</span></div>
              <div>Lucro atual: <span className="font-mono">R$ {lucroAtual.toFixed(2)}</span></div>
              <div>Lucro com desconto: <span className="font-mono">R$ {lucroDesconto.toFixed(2)}</span></div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} id="active-switch" />
            <label htmlFor="active-switch" className="text-sm">Desconto ativo</label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">{editing ? "Salvar" : "Adicionar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
