import PriorionApp, { type Viewer } from '@/components/priorion-app';
import LoginScreen from '@/components/login-screen';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <LoginScreen />;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, department, role')
    .eq('id', user.id)
    .maybeSingle();

  let finalProfile = profile;

  if (!finalProfile) {
    try {
      const { createSupabaseAdminClient } = await import('@/lib/supabase/admin');
      const admin = createSupabaseAdminClient();
      const displayName =
        (user.user_metadata?.display_name as string) ||
        user.email?.split('@')[0] ||
        'Usuário';
      const department = (user.user_metadata?.department as string) || 'Tecnologia';

      const { data: created, error: insertError } = await admin
        .from('profiles')
        .insert({
          id: user.id,
          display_name: displayName,
          department,
          role: 'colaborador',
        })
        .select('display_name, department, role')
        .single();

      if (!insertError && created) {
        finalProfile = created;
      }
    } catch {
      // Ignora erro de fallback e deixa a validação abaixo cuidar
    }
  }

  if (!finalProfile || !['colaborador', 'administrador', 'admin'].includes(finalProfile.role)) {
    throw new Error('Perfil autenticado não encontrado no Supabase.');
  }

  const viewer: Viewer = {
    displayName: finalProfile.display_name,
    department: finalProfile.department,
    role: finalProfile.role as Viewer['role'],
  };

  return <PriorionApp viewer={viewer} />;
}
