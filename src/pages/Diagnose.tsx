import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';

export const Diagnose = () => {
    const { currentUser } = useAppContext();
    const [foods, setFoods] = useState<any[]>([]);
    const [rawFoods, setRawFoods] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runDiagnosis = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('Diagnosis: Starting fetch...');

            // 1. Fetch raw foods without any filter
            console.log('Diagnosis: Fetching ALL foods (limit 50)...');
            const { data: allFoods, error: allFoodsError } = await supabase
                .from('foods')
                .select('*')
                .limit(50);

            if (allFoodsError) throw allFoodsError;
            setRawFoods(allFoods || []);
            console.log('Diagnosis: Raw foods fetched:', allFoods);

            // 2. Fetch foods with current user's owner_id
            if (currentUser) {
                console.log('Diagnosis: Fetching foods for owner_id:', currentUser.owner_id || currentUser.id);
                const ownerId = currentUser.role === 'employee'
                    ? (currentUser as any).owner_id
                    : currentUser.id;

                const { data: userFoods, error: userFoodsError } = await supabase
                    .from('foods')
                    .select('*')
                    .eq('owner_id', ownerId);

                if (userFoodsError) throw userFoodsError;
                setFoods(userFoods || []);
                console.log('Diagnosis: User foods fetched:', userFoods);
            }

        } catch (err: any) {
            console.error('Diagnosis Error:', err);
            setError(err.message || JSON.stringify(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Diagnóstico de Comidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Button onClick={runDiagnosis} disabled={loading}>
                            {loading ? 'Rodando...' : 'Rodar Diagnóstico'}
                        </Button>
                        {currentUser && (
                            <div>
                                <p><strong>User ID:</strong> {currentUser.id}</p>
                                <p><strong>Owner ID (context):</strong> {currentUser.owner_id}</p>
                                <p><strong>Role:</strong> {currentUser.role}</p>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-4 bg-red-100 text-red-800 rounded">
                            Erro: {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-bold mb-2">Foods do Usuário Atual ({foods.length})</h3>
                            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-xs">
                                {JSON.stringify(foods, null, 2)}
                            </pre>
                        </div>

                        <div>
                            <h3 className="font-bold mb-2">Todas as Foods (Raw - Max 50) ({rawFoods.length})</h3>
                            <p className="text-xs text-gray-500 mb-2">Mostra as primeiras 50 linhas da tabela 'foods' sem filtro de dono.</p>
                            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-xs">
                                {JSON.stringify(rawFoods, null, 2)}
                            </pre>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
