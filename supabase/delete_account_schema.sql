CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deleta o usuário autenticado da tabela auth.users
  -- Isso irá disparar o ON DELETE CASCADE nas tabelas profiles, user_stats, etc (se configurado).
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
