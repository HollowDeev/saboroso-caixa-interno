# TODO: Algoritmo de Descontos e Cortesia para Produtos, Comidas, Comandas e Vendas Diretas

## 1. Listagem das Colunas Atuais

### Tabela: external_products
- id (uuid)
- name (varchar)
- brand (varchar)
- description (text)
- current_stock (int4)
- min_stock (int4)
- cost (numeric)
- price (numeric)
- owner_id (uuid)
- created_at (timestamptz)
- updated_at (timestamptz)

### Tabela: foods
- id (uuid)
- name (text)
- description (text)
- category (text)
- price (numeric)
- cost (numeric)
- preparation_time (int4)
- available (bool)
- owner_id (uuid)
- created_at (timestamptz)
- updated_at (timestamptz)
- deleted_at (timestamptz)

### Tabela: orders (Comanda)
- id (uuid)
- customer_name (text)
- table_number (int4)
- subtotal (numeric)
- tax (numeric)
- total (numeric)
- status (text)
- user_id (uuid)
- cash_register_id (uuid)
- created_at (timestamptz)
- updated_at (timestamptz)

### Tabela: sales (Venda Direta)
- id (uuid)
- order_id (uuid)
- total (numeric)
- user_id (uuid)
- cash_register_id (uuid)
- created_at (timestamptz)
- is_direct_sale (bool)
- items (jsonb)
- customer_name (text)
- subtotal (numeric)
- tax (numeric)
- updated_at (timestamptz)
- payments (jsonb)

---

## 2. Alterações nas Tabelas Existentes

- Adicionar coluna `has_discount` (bool, default: false) em `external_products` e `foods`.
- Adicionar coluna `active_discount_id` (uuid, nullable) em `external_products` e `foods` para referenciar o desconto ativo.
- Adicionar coluna `is_courtesy` (bool, default: false) nos itens de venda/comanda (dentro do JSONB de `items` em `sales`).

---

## 3. Criação de Nova Tabela: discounts

```sql
CREATE TABLE discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL, -- 'external_product' ou 'food'
  product_id uuid NOT NULL,
  name text NOT NULL,
  new_price numeric NOT NULL,
  active bool NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

- `product_type`: para saber se é produto externo ou comida.
- `product_id`: referência ao produto/comida.
- `name`: nome do desconto.
- `new_price`: novo valor do produto com desconto.
- `active`: se o desconto está ativo.

---

## 4. Interfaces TypeScript

- Criar interface `Discount`:
  ```ts
  interface Discount {
    id: string;
    productType: 'external_product' | 'food';
    productId: string;
    name: string;
    newPrice: number;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  }
  ```

- Atualizar interfaces de produto/comida para incluir `has_discount` e `active_discount_id`.
- Atualizar interface de item de venda para incluir `is_courtesy`.

---

## 5. Backend/Database

- CRUD para descontos (criar, ativar/desativar, listar, editar).
- Endpoint para buscar desconto ativo de um produto/comida.
- Endpoint para marcar item como cortesia.

---

## 6. Frontend

- Tela/modal para criar desconto:
  - Selecionar produto/comida.
  - Exibir custo atual, preço atual, campo para novo preço.
  - Calcular e exibir lucro atual e lucro com desconto.
  - Campo para nome do desconto.
  - Botão para ativar/desativar desconto.

- Indicar na listagem de produtos/comidas se há desconto ativo.

- Ao adicionar item à comanda/venda direta:
  - Buscar se há desconto ativo e aplicar novo valor.
  - Opção para marcar item como cortesia (checkbox).
  - Se cortesia, não somar valor ao total da comanda/venda e não registrar no caixa.

---

## 7. Modificações em Algoritmos Existentes

- Atualizar lógica de cálculo de valor de venda para considerar desconto ativo.
- Atualizar lógica de fechamento de caixa para ignorar itens marcados como cortesia.
- Atualizar relatórios para considerar descontos e cortesias.

---

## 8. Testes

- Testar criação, ativação e desativação de descontos.
- Testar aplicação automática do desconto em vendas/comandas.
- Testar marcação de item como cortesia e impacto nos totais.
- Testar exibição correta de informações de desconto e cortesia no frontend.

---

## 9. Documentação

- Documentar uso do sistema de descontos e cortesia para usuários finais.
