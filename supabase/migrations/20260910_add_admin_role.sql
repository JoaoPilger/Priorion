-- Migration: adiciona o papel 'admin' (super admin) ao sistema Priorion
-- Execute este script no Supabase SQL Editor (Dashboard > SQL Editor)
-- É seguro rodar múltiplas vezes (idempotente).

-- 1. Adiciona 'admin' ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';

-- 2. Atualiza is_admin() para incluir o super admin (ele herda poderes de administrador)
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role::text IN ('administrador', 'admin')
  );
$$;

-- 3. Cria is_super_admin() — verifica exclusivamente role = 'admin'
CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role::text = 'admin'
  );
$$;

-- 4. Garante permissão de execução para usuários autenticados
REVOKE ALL ON FUNCTION private.is_super_admin() FROM public;
GRANT EXECUTE ON FUNCTION private.is_super_admin() TO authenticated;

-- 5. Permite que autenticados atualizem o campo role (as RLS policies restringem quem pode)
GRANT UPDATE (role) ON TABLE public.profiles TO authenticated;

-- 6. Policy: somente super admins alteram o campo role de qualquer perfil
--    (e nunca podem promover alguém para 'admin' pela interface)
DROP POLICY IF EXISTS profiles_update_role ON public.profiles;
CREATE POLICY profiles_update_role ON public.profiles FOR UPDATE TO authenticated
USING ((SELECT private.is_super_admin()))
WITH CHECK (
  (SELECT private.is_super_admin())
  AND role::text IN ('colaborador', 'administrador')
);

-- Para promover um usuário a super admin, rode manualmente:
-- UPDATE public.profiles SET role = 'admin' WHERE id = '<uuid-do-usuario>';
