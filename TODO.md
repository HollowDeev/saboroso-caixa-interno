# TODO: Sistema de Conta de Despesas para Funcionários

## 1. Modelagem de Dados
- [ ] Criar tabela `expense_accounts` com os campos:
  - id (PK)
  - owner_id (FK para users)
  - employee_profile_id (FK para employee_profile)
  - opened_at (timestamp)
  - closed_at (timestamp, nullable)
  - status (enum: 'open', 'closed')
- [ ] Criar tabela `expense_account_items`:
  - id (PK)
  - expense_account_id (FK para expense_accounts)
  - product_id
  - product_type (enum: 'external', 'food')
  - quantity
  - unit_price
  - created_at (timestamp)
  - contested (boolean)
  - contest_message (text, nullable)
  - removed_by_admin (boolean)

## 2. Backend (API/Supabase)
- [ ] Criar services em `src/services/expenseAccountService.ts` para:
  - [ ] Buscar conta aberta do funcionário atual:
    - `select * from expense_accounts where employee_profile_id = ? and status = 'open'`
  - [ ] Abrir nova conta de despesa:
    - `insert into expense_accounts ...`
  - [ ] Adicionar item à conta aberta:
    - `insert into expense_account_items ...`
  - [ ] Contestar item:
    - `update expense_account_items set contested = true, contest_message = ? where id = ?`
  - [ ] Buscar contas abertas de todos funcionários (admin):
    - `select * from expense_accounts where status = 'open'`
  - [ ] Buscar itens da conta aberta de um funcionário (admin):
    - `select * from expense_account_items where expense_account_id = ?`
  - [ ] Remover item (admin):
    - `update expense_account_items set removed_by_admin = true where id = ?`
  - [ ] Adicionar item (admin):
    - `insert into expense_account_items ...`
  - [ ] Fechar conta (admin):
    - `update expense_accounts set status = 'closed', closed_at = now() where id = ?`
- [ ] Garantir que owner_id e employee_profile_id sejam sempre salvos
- [ ] Implementar regras de permissão no frontend/backend:
  - Funcionário só pode ver/adicionar/contestar na própria conta aberta
  - Admin só pode ver/editar/remover/fechar contas abertas

## 3. Frontend - Funcionário
- [ ] Criar hook `useExpenseAccount` para:
  - [ ] Buscar conta aberta e itens do funcionário (via service)
  - [ ] Adicionar item
  - [ ] Contestar item
  - [ ] Abrir nova conta
- [ ] Página "Conta de Despesa":
  - [ ] Exibir apenas itens da conta aberta
  - [ ] Se não houver conta aberta, botão para abrir
  - [ ] Formulário para adicionar item (produtos externos/comidas)
  - [ ] Botão para contestar item (com mensagem obrigatória)
  - [ ] Itens contestados destacados

## 4. Frontend - Admin
- [ ] Criar hook `useAdminExpenseAccounts` para:
  - [ ] Buscar todas contas abertas e itens de cada funcionário (via service)
  - [ ] Remover item
  - [ ] Adicionar item
  - [ ] Fechar conta
- [ ] Página de administração de contas de despesa:
  - [ ] Listar cards de funcionários com itens da conta aberta (nome, 5 itens mais recentes)
  - [ ] Ao clicar, exibir todos os itens da conta aberta, agrupados por dia
  - [ ] Destacar itens contestados (azul, mostrar mensagem)
  - [ ] Botão para remover item
  - [ ] Botão para adicionar item
  - [ ] Botão para fechar conta

## 5. Integração e Testes
- [ ] Testar fluxo completo funcionário (abrir conta, marcar item, contestar)
- [ ] Testar fluxo admin (visualizar, remover, adicionar, fechar)
- [ ] Testar permissões (funcionário não acessa dos outros, admin não vê contas fechadas)
- [ ] Garantir que todos os services usam o Supabase Client (`supabase.from(...).select/insert/update`)
- [ ] Garantir tipagem correta usando `Database['public']['Tables']['expense_accounts']['Row']` etc.
