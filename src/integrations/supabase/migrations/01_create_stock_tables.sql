-- Criar tabela de ingredientes
CREATE TABLE IF NOT EXISTS public.ingredients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL,
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    min_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    supplier VARCHAR(255),
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar tabela de produtos externos
CREATE TABLE IF NOT EXISTS public.external_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    description TEXT,
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    min_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar tabela de movimentações de estoque
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('ingredient', 'external_product')),
    item_id UUID NOT NULL,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('add', 'remove')),
    quantity DECIMAL(10,2) NOT NULL,
    previous_stock DECIMAL(10,2) NOT NULL,
    new_stock DECIMAL(10,2) NOT NULL,
    reason TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_ingredients_owner ON public.ingredients(owner_id);
CREATE INDEX IF NOT EXISTS idx_external_products_owner ON public.external_products(owner_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON public.stock_movements(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_user ON public.stock_movements(user_id);

-- Função para adicionar estoque
CREATE OR REPLACE FUNCTION public.add_stock(
    p_item_type TEXT,
    p_item_id UUID,
    p_quantity DECIMAL,
    p_reason TEXT,
    p_user_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock DECIMAL;
    v_new_stock DECIMAL;
    v_movement_id UUID;
BEGIN
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
        WHERE id = p_item_id AND owner_id = p_user_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Ingrediente não encontrado';
        END IF;

        v_new_stock := v_current_stock + p_quantity;

        UPDATE public.ingredients
        SET current_stock = v_new_stock,
            updated_at = NOW()
        WHERE id = p_item_id AND owner_id = p_user_id;
    ELSE
        SELECT current_stock INTO v_current_stock
        FROM public.external_products
        WHERE id = p_item_id AND owner_id = p_user_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produto não encontrado';
        END IF;

        v_new_stock := v_current_stock + p_quantity;

        UPDATE public.external_products
        SET current_stock = v_new_stock,
            updated_at = NOW()
        WHERE id = p_item_id AND owner_id = p_user_id;
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
        p_user_id
    ) RETURNING id INTO v_movement_id;

    RETURN v_movement_id;
END;
$$;

-- Função para remover estoque
CREATE OR REPLACE FUNCTION public.remove_stock(
    p_item_type TEXT,
    p_item_id UUID,
    p_quantity DECIMAL,
    p_reason TEXT,
    p_user_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock DECIMAL;
    v_new_stock DECIMAL;
    v_movement_id UUID;
BEGIN
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
        WHERE id = p_item_id AND owner_id = p_user_id;

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
        WHERE id = p_item_id AND owner_id = p_user_id;
    ELSE
        SELECT current_stock INTO v_current_stock
        FROM public.external_products
        WHERE id = p_item_id AND owner_id = p_user_id;

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
        WHERE id = p_item_id AND owner_id = p_user_id;
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
        p_user_id
    ) RETURNING id INTO v_movement_id;

    RETURN v_movement_id;
END;
$$;

-- Criar políticas de segurança RLS
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Política para ingredientes
CREATE POLICY "Usuários podem ver seus próprios ingredientes"
    ON public.ingredients
    FOR ALL
    USING (owner_id = auth.uid());

-- Política para produtos externos
CREATE POLICY "Usuários podem ver seus próprios produtos externos"
    ON public.external_products
    FOR ALL
    USING (owner_id = auth.uid());

-- Política para movimentações
CREATE POLICY "Usuários podem ver suas próprias movimentações"
    ON public.stock_movements
    FOR ALL
    USING (user_id = auth.uid()); 