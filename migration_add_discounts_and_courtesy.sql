-- Adicionar colunas de desconto em external_products
ALTER TABLE external_products
ADD COLUMN has_discount boolean NOT NULL DEFAULT false,
ADD COLUMN active_discount_id uuid;

-- Adicionar colunas de desconto em foods
ALTER TABLE foods
ADD COLUMN has_discount boolean NOT NULL DEFAULT false,
ADD COLUMN active_discount_id uuid;

-- Observação: Para itens de venda/comanda, considerando que estão em um JSONB na tabela sales,
-- a aplicação deverá garantir que cada item do array JSONB tenha a propriedade 'is_courtesy'.
-- Não é possível adicionar coluna diretamente ao JSONB via SQL, mas pode-se atualizar os registros existentes se necessário.

-- Criação da tabela de descontos
CREATE TABLE public.discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL, -- 'external_product' ou 'food'
  product_id uuid NOT NULL,
  name text NOT NULL,
  new_price numeric NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Políticas de acesso para discounts (ajuste conforme necessidade do seu projeto)
-- Permitir leitura para todos os usuários autenticados
create policy "Allow read access to discounts for authenticated users"
  on public.discounts
  for select
  using (auth.role() = 'authenticated');

-- Permitir inserção para usuários autenticados
create policy "Allow insert access to discounts for authenticated users"
  on public.discounts
  for insert
  with check (auth.role() = 'authenticated');

-- Permitir atualização para usuários autenticados
create policy "Allow update access to discounts for authenticated users"
  on public.discounts
  for update
  using (auth.role() = 'authenticated');

-- Permitir deleção para usuários autenticados
create policy "Allow delete access to discounts for authenticated users"
  on public.discounts
  for delete
  using (auth.role() = 'authenticated');

-- Habilitar RLS na tabela discounts
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
