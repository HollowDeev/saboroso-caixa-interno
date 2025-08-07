import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash, ToggleLeft, ToggleRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
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
  const { products, externalProducts, currentCashRegister } = useAppContext();

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);
  // Carregar descontos do banco
  useEffect(() => {
    const fetchDiscounts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setDiscounts(data.map((d: any) => ({
          ...d,
          productType: d.product_type,
          productId: d.product_id,
          name: d.name,
          newPrice: Number(d.new_price),
          active: d.active,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        })));
      }
      setLoading(false);
    };
    fetchDiscounts();
  }, []);

  useEffect(() => {
    setLoading(false);
  }, []);

  // Deletar desconto
  const handleDelete = async (id: string) => {
    await supabase.from('discounts').delete().eq('id', id);
    setDiscounts(discounts.filter((d) => d.id !== id));
  };
  // Ativar/desativar desconto
  const handleToggle = async (id: string) => {
    setToggleLoadingId(id);
    const discount = discounts.find((d) => d.id === id);
    if (!discount) return;
    const newActive = !discount.active;
    await supabase.from('discounts').update({ active: newActive, updated_at: new Date().toISOString() }).eq('id', id);
    setDiscounts(discounts.map((d) => d.id === id ? { ...d, active: newActive } : d));
    // Atualizar produto/comida se ativando/desativando
    if (discount.productType === 'food') {
      await supabase.from('foods').update({ has_discount: newActive, active_discount_id: newActive ? id : null }).eq('id', discount.productId);
    } else {
      await supabase.from('external_products').update({ has_discount: newActive, active_discount_id: newActive ? id : null }).eq('id', discount.productId);
    }
    setToggleLoadingId(null);
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
                          {discount.productType === "food" ? "Comida" : "Produto Externo"} - {
                            (() => {
                              if (discount.productName && discount.productName !== "") return discount.productName;
                              if (discount.productType === "food") {
                                const food = products.find((f: any) => f.id === discount.productId);
                                return food ? food.name : "";
                              } else {
                                const prod = externalProducts.find((p: any) => p.id === discount.productId);
                                return prod ? prod.name : "";
                              }
                            })()
                          }
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(discount); setModalOpen(true); }}><Edit size={18} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(discount.id)}><Trash size={18} /></Button>
                        <div className="relative">
                          <Button
                            variant={discount.active ? "outline" : "default"}
                            size="sm"
                            disabled={toggleLoadingId === discount.id}
                            onClick={() => handleToggle(discount.id)}
                            className={discount.active ? "border-green-600 text-green-700" : "border-gray-400 text-gray-600"}
                          >
                            {toggleLoadingId === discount.id ? (
                              <span className="animate-spin mr-2">◌</span>
                            ) : null}
                            {discount.active ? "Desativar" : "Ativar"}
                          </Button>
                        </div>
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
              onSave={async (d: Discount) => {
                let discountId = d.id;
                if (editing) {
                  // Update
                  await supabase.from('discounts').update({
                    product_type: d.productType,
                    product_id: d.productId,
                    name: d.name,
                    new_price: d.newPrice,
                    active: d.active,
                    updated_at: new Date().toISOString(),
                  }).eq('id', d.id);
                  setDiscounts(discounts.map((disc) => disc.id === d.id ? d : disc));
                } else {
                  // Insert
                  const { data, error } = await supabase.from('discounts').insert({
                    product_type: d.productType,
                    product_id: d.productId,
                    name: d.name,
                    new_price: d.newPrice,
                    active: d.active,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }).select().single();
                  if (data) {
                    discountId = data.id;
                    setDiscounts([...discounts, {
                      ...d,
                      id: data.id,
                      createdAt: data.created_at,
                      updatedAt: data.updated_at,
                    }]);
                  }
                }
                // Atualizar produto/comida para marcar desconto ativo
                if (d.productType === 'food') {
                  await supabase.from('foods').update({ has_discount: true, active_discount_id: discountId }).eq('id', d.productId);
                } else {
                  await supabase.from('external_products').update({ has_discount: true, active_discount_id: discountId }).eq('id', d.productId);
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
  const [search, setSearch] = useState("");

  // Unifica produtos e externos para exibir juntos
  const allItems = [
    ...products.map((p: any) => ({ ...p, type: "food" })),
    ...externalProducts.map((p: any) => ({ ...p, type: "external_product" })),
  ];
  const filteredItems = allItems.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );
  const selectedItem = allItems.find((p) => p.id === productId && p.type === productType);
  const cost = selectedItem ? Number(selectedItem.cost) : 0;
  const price = selectedItem ? Number(selectedItem.price) : 0;
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
      productName: selectedItem?.name || "",
      createdAt: editing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  // Seleção de item: só pode um
  const handleSelectItem = (item: any) => {
    setProductId(item.id);
    setProductType(item.type);
  };
  const handleRemoveSelected = () => {
    setProductId("");
    setProductType("food");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Desconto" : "Novo Desconto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <Input
              placeholder="Pesquisar produto ou comida..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="mb-2"
            />
            <div className="h-48 overflow-y-auto grid grid-cols-1 gap-2 border rounded-lg p-2 bg-white">
              {filteredItems.length === 0 && (
                <div className="text-gray-400 text-center py-8">Nenhum item encontrado.</div>
              )}
              {filteredItems.map(item => (
                <div
                  key={item.id + item.type}
                  className={`flex items-center justify-between p-2 border rounded cursor-pointer transition-all ${productId === item.id && productType === item.type ? 'bg-orange-50 border-orange-400' : 'opacity-60 hover:opacity-100 bg-white'}`}
                  onClick={() => handleSelectItem(item)}
                  style={{ opacity: productId === item.id && productType === item.type ? 1 : 0.6 }}
                >
                  <div>
                    <span className="font-medium text-sm">{item.name}</span>
                    <span className="ml-2 text-xs text-gray-500">{item.type === 'food' ? 'Comida' : 'Produto Externo'}</span>
                  </div>
                  <span className="text-sm font-mono">R$ {Number(item.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          {selectedItem && (
            <div className="flex items-center justify-between bg-orange-100 border border-orange-300 rounded p-2 mt-2">
              <div>
                <span className="font-semibold text-orange-700">{selectedItem.name}</span>
                <span className="ml-2 text-xs text-gray-500">{selectedItem.type === 'food' ? 'Comida' : 'Produto Externo'}</span>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={handleRemoveSelected} title="Remover seleção">
                <span className="text-red-500">&times;</span>
              </Button>
            </div>
          )}
          <Input placeholder="Nome do desconto" value={name} onChange={e => setName(e.target.value)} required className="w-full" />
          <Input placeholder="Novo valor" type="number" min={0} step={0.01} value={newPrice} onChange={e => setNewPrice(e.target.value)} required className="w-full" />
          {selectedItem && (
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
            <Button type="submit" disabled={!productId}>{editing ? "Salvar" : "Adicionar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
