-- Função para criar um novo funcionário
CREATE OR REPLACE FUNCTION create_employee(
  p_owner_id UUID,
  p_access_key TEXT,
  p_password TEXT,
  p_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_salt TEXT;
  v_employee_id UUID;
BEGIN
  -- Gerar salt para a senha
  SELECT gen_salt('bf') INTO v_salt;
  
  -- Inserir novo funcionário
  INSERT INTO employees (
    owner_id,
    access_key,
    password_hash,
    name,
    is_active
  )
  VALUES (
    p_owner_id,
    p_access_key,
    crypt(p_password, v_salt),
    p_name,
    true
  )
  RETURNING id INTO v_employee_id;
  
  RETURN v_employee_id;
END;
$$;

-- Função para verificar credenciais do funcionário
CREATE OR REPLACE FUNCTION verify_employee_credentials(
  p_access_key TEXT,
  p_password TEXT
)
RETURNS TABLE (
  employee_id UUID,
  employee_name TEXT,
  owner_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as employee_id,
    e.name as employee_name,
    e.owner_id
  FROM employees e
  WHERE e.access_key = p_access_key
    AND e.password_hash = crypt(p_password, e.password_hash)
    AND e.is_active = true;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION create_employee TO authenticated;
GRANT EXECUTE ON FUNCTION verify_employee_credentials TO anon, authenticated; 