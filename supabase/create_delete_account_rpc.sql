-- Função RPC para deletar a conta do usuário
-- Essa função precisa ser executada com permissões elevadas (SECURITY DEFINER) 
-- para conseguir deletar o registro na tabela auth.users.

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Garante que a função rode com privilégios de quem a criou (superusuário/admin)
SET search_path = public
AS $$
BEGIN
  -- Deleta o usuário atual da tabela de autenticação
  -- As tabelas relacionadas (como profiles, etc) serão apagadas 
  -- automaticamente se o ON DELETE CASCADE estiver configurado nelas.
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
