
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/contexts/AppContext';
import { Product } from '@/types';
import { convertToBaseUnit } from '@/utils/unitConversion';

export const ProfitCalculator = () => {
    const { products, ingredients, serviceTaxes } = useApp();
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [customPrice, setCustomPrice] = useState<number>(0);
    const [selectedTaxes, setSelectedTaxes] = useState<string[]>(
        serviceTaxes.filter(tax => tax.is_active).map(tax => tax.id)
    );

    // Calcula o custo total do produto baseado nos ingredientes
    const calculateProductCost = (product: Product) => {
        return product.ingredients.reduce((total, ing) => {
            const ingredient = ingredients.find(i => i.id === ing.ingredient_id);
            if (!ingredient) return total;

            // Se o ingrediente é do tipo 'unidade', usa o custo direto
            if (ingredient.unit === 'unidade') {
                return total + (ingredient.cost * ing.quantity);
            }

            try {
                // Se a unidade é 'g', converte para 'kg' antes de calcular
                let quantityInKg = ing.quantity;
                if (ing.unit === 'g') {
                    quantityInKg = ing.quantity / 1000;
                }

                return total + (quantityInKg * ingredient.cost);
            } catch (error) {
                console.error('Erro ao converter unidades:', error);
                return total;
            }
        }, 0);
    };

    const selectedProduct = useMemo(() => {
        return products.find(p => p.id === selectedProductId);
    }, [selectedProductId, products]);

    const calculations = useMemo(() => {
        if (!selectedProduct) return null;

        const productCost = calculateProductCost(selectedProduct);
        const price = customPrice || selectedProduct.price;
        const subtotal = price;

        // Calcula o valor de cada taxa
        const taxDetails = serviceTaxes
            .filter(tax => selectedTaxes.includes(tax.id))
            .map(tax => ({
                id: tax.id,
                name: tax.name,
                percentage: tax.percentage,
                value: subtotal * (tax.percentage / 100)
            }));

        const totalTaxes = taxDetails.reduce((sum, tax) => sum + tax.value, 0);
        const finalPrice = subtotal + totalTaxes;
        const profit = finalPrice - productCost - totalTaxes;
        const profitMargin = (profit / finalPrice) * 100;

        return {
            productCost,
            price,
            taxDetails,
            totalTaxes,
            finalPrice,
            profit,
            profitMargin
        };
    }, [selectedProduct, customPrice, selectedTaxes, serviceTaxes, ingredients]);

    const toggleTax = (taxId: string) => {
        setSelectedTaxes(prev =>
            prev.includes(taxId)
                ? prev.filter(id => id !== taxId)
                : [...prev, taxId]
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Calculadora de Lucros</h1>
                <p className="text-gray-600">Analise o impacto das taxas no lucro dos produtos</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Configurações</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="product">Produto</Label>
                            <Select
                                value={selectedProductId}
                                onValueChange={setSelectedProductId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um produto" />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map((product) => (
                                        <SelectItem key={product.id} value={product.id}>
                                            {product.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedProduct && (
                            <div>
                                <Label htmlFor="price">Preço de Venda (R$)</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={customPrice || selectedProduct.price}
                                    onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                                    placeholder="Digite o preço de venda"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Preço atual: R$ {selectedProduct.price.toFixed(2)}
                                </p>
                            </div>
                        )}

                        <div>
                            <Label>Taxas Aplicadas</Label>
                            <div className="space-y-2 mt-2">
                                {serviceTaxes.map((tax) => (
                                    <div key={tax.id} className="flex items-center justify-between p-2 border rounded">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{tax.name}</p>
                                            <p className="text-xs text-gray-600">{tax.percentage}%</p>
                                        </div>
                                        <Switch
                                            checked={selectedTaxes.includes(tax.id)}
                                            onCheckedChange={() => toggleTax(tax.id)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {calculations && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Análise de Lucro</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Custo do Produto:</span>
                                    <span className="font-medium">R$ {calculations.productCost.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Preço Base:</span>
                                    <span className="font-medium">R$ {calculations.price.toFixed(2)}</span>
                                </div>
                                {calculations.taxDetails.map((tax) => (
                                    <div key={tax.id} className="flex justify-between text-sm">
                                        <span>{tax.name} ({tax.percentage}%):</span>
                                        <span className="font-medium">R$ {tax.value.toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-sm">
                                    <span>Total em Taxas:</span>
                                    <span className="font-medium">R$ {calculations.totalTaxes.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Preço Final:</span>
                                    <span className="font-medium">R$ {calculations.finalPrice.toFixed(2)}</span>
                                </div>
                                <div className="pt-4 border-t">
                                    <div className="flex justify-between font-medium">
                                        <span>Lucro:</span>
                                        <span className={calculations.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                            R$ {calculations.profit.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between font-medium">
                                        <span>Margem de Lucro:</span>
                                        <span className={calculations.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                                            {calculations.profitMargin.toFixed(2)}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-medium mb-2">Análise</h4>
                                <div className="space-y-2 text-sm text-gray-600">
                                    {calculations.profit < 0 ? (
                                        <p className="text-red-600">
                                            ⚠️ Este produto está gerando prejuízo! Considere aumentar o preço ou reduzir os custos.
                                        </p>
                                    ) : calculations.profitMargin < 15 ? (
                                        <p className="text-yellow-600">
                                            ⚠️ A margem de lucro está baixa. Recomenda-se avaliar o preço ou os custos.
                                        </p>
                                    ) : (
                                        <p className="text-green-600">
                                            ✓ O produto está gerando lucro satisfatório.
                                        </p>
                                    )}
                                    <p>
                                        Para cada R$ {calculations.finalPrice.toFixed(2)} em vendas:
                                    </p>
                                    <ul className="list-disc list-inside">
                                        <li>R$ {calculations.productCost.toFixed(2)} são custos ({((calculations.productCost / calculations.finalPrice) * 100).toFixed(1)}%)</li>
                                        <li>R$ {calculations.totalTaxes.toFixed(2)} são taxas ({((calculations.totalTaxes / calculations.finalPrice) * 100).toFixed(1)}%)</li>
                                        <li>R$ {calculations.profit.toFixed(2)} é lucro ({calculations.profitMargin.toFixed(1)}%)</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};
