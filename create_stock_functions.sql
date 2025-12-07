-- Script para criar/recriar funções de controle de estoque
-- Execute este script no SQL Editor do Supabase

-- Função para adicionar estoque (sem p_user_id, usa auth.uid())
CREATE OR REPLACE FUNCTION public.add_stock(
    p_item_type TEXT,
    p_item_id UUID,
    p_quantity DECIMAL,
    p_reason TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock DECIMAL;
    v_new_stock DECIMAL;
    v_movement_id UUID;
    v_user_id UUID;
BEGIN
    -- Obter o ID do usuário autenticado
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

    -- Verificar tipo de item
    IF p_item_type NOT IN ('ingredient', 'external_product') THEN
        RAISE EXCEPTION 'Tipo de item inválido';
    END IF;

    -- Verificar quantidade
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantidade deve ser maior que zero';
    END IF;

    -- Atualizar estoque baseado no tipo
    IF p_item_type = 'ingredient' THEN
        SELECT current_stock INTO v_current_stock
        FROM public.ingredients
        WHERE id = p_item_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Ingrediente não encontrado';
        END IF;

        v_new_stock := v_current_stock + p_quantity;

        UPDATE public.ingredients
        SET current_stock = v_new_stock,
            updated_at = NOW()
        WHERE id = p_item_id;
    ELSE
        SELECT current_stock INTO v_current_stock
        FROM public.external_products
        WHERE id = p_item_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produto não encontrado';
        END IF;

        v_new_stock := v_current_stock + p_quantity;

        UPDATE public.external_products
        SET current_stock = v_new_stock,
            updated_at = NOW()
        WHERE id = p_item_id;
    END IF;

    -- Registrar movimentação
    INSERT INTO public.stock_movements (
        item_type,
        item_id,
        movement_type,
        quantity,
        previous_stock,
        new_stock,
        reason,
        user_id
    ) VALUES (
        p_item_type,
        p_item_id,
        'add',
        p_quantity,
        v_current_stock,
        v_new_stock,
        p_reason,
        v_user_id
    ) RETURNING id INTO v_movement_id;

    RETURN v_movement_id;
END;
$$;

-- Função para remover estoque (sem p_user_id, usa auth.uid())
CREATE OR REPLACE FUNCTION public.remove_stock(
    p_item_type TEXT,
    p_item_id UUID,
    p_quantity DECIMAL,
    p_reason TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock DECIMAL;
    v_new_stock DECIMAL;
    v_movement_id UUID;
    v_user_id UUID;
BEGIN
    -- Obter o ID do usuário autenticado
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

    -- Verificar tipo de item
    IF p_item_type NOT IN ('ingredient', 'external_product') THEN
        RAISE EXCEPTION 'Tipo de item inválido';
    END IF;

    -- Verificar quantidade
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantidade deve ser maior que zero';
    END IF;

    -- Atualizar estoque baseado no tipo
    IF p_item_type = 'ingredient' THEN
        SELECT current_stock INTO v_current_stock
        FROM public.ingredients
        WHERE id = p_item_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Ingrediente não encontrado';
        END IF;

        v_new_stock := v_current_stock - p_quantity;

        IF v_new_stock < 0 THEN
            RAISE EXCEPTION 'Estoque insuficiente';
        END IF;

        UPDATE public.ingredients
        SET current_stock = v_new_stock,
            updated_at = NOW()
        WHERE id = p_item_id;
    ELSE
        SELECT current_stock INTO v_current_stock
        FROM public.external_products
        WHERE id = p_item_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produto não encontrado';
        END IF;

        v_new_stock := v_current_stock - p_quantity;

        IF v_new_stock < 0 THEN
            RAISE EXCEPTION 'Estoque insuficiente';
        END IF;

        UPDATE public.external_products
        SET current_stock = v_new_stock,
            updated_at = NOW()
        WHERE id = p_item_id;
    END IF;

    -- Registrar movimentação
    INSERT INTO public.stock_movements (
        item_type,
        item_id,
        movement_type,
        quantity,
        previous_stock,
        new_stock,
        reason,
        user_id
    ) VALUES (
        p_item_type,
        p_item_id,
        'remove',
        p_quantity,
        v_current_stock,
        v_new_stock,
        p_reason,
        v_user_id
    ) RETURNING id INTO v_movement_id;

    RETURN v_movement_id;
END;
$$;

-- Verificar se as funções foram criadas
SELECT proname, proargnames 
FROM pg_proc 
WHERE proname IN ('add_stock', 'remove_stock')
AND pronamespace = 'public'::regnamespace;
