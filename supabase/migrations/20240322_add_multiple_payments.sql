-- Remover a coluna payment_method da tabela orders pois agora será controlado pela tabela sales
ALTER TABLE public.orders DROP COLUMN IF EXISTS payment_method;

-- Adicionar coluna para rastrear o status de pagamento
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'completed'));

-- Criar trigger para atualizar o status de pagamento da comanda
CREATE OR REPLACE FUNCTION update_order_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    total_paid DECIMAL;
    order_total DECIMAL;
BEGIN
    -- Calcular o total pago
    SELECT COALESCE(SUM(total), 0) INTO total_paid
    FROM public.sales
    WHERE order_id = NEW.order_id;

    -- Obter o total da comanda
    SELECT total INTO order_total
    FROM public.orders
    WHERE id = NEW.order_id;

    -- Atualizar o status de pagamento
    IF total_paid >= order_total THEN
        UPDATE public.orders
        SET payment_status = 'completed'
        WHERE id = NEW.order_id;
    ELSIF total_paid > 0 THEN
        UPDATE public.orders
        SET payment_status = 'partial'
        WHERE id = NEW.order_id;
    ELSE
        UPDATE public.orders
        SET payment_status = 'pending'
        WHERE id = NEW.order_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_payment_status_trigger
AFTER INSERT OR UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION update_order_payment_status(); 