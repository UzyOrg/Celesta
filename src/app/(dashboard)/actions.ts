'use server';

import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getServerClient() {
  const cookieStore = await cookies();
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options: any) {
        cookieStore.delete(name);
      },
    },
  });
}

export async function createEmptyGroup(groupName: string) {
  const supabase = await getServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { success: false, error: 'No autenticado' };
  }
  
  // Usar el nombre del grupo directamente como token (sin sufijo aleatorio)
  const classToken = groupName.toUpperCase().replace(/\s+/g, '-');
  
  const { data: newGroup, error: insertError } = await supabase
    .from('class_assignments')
    .insert({
      class_token: classToken,
      teacher_id: user.id,
      is_active: true,
    })
    .select()
    .single();
  
  if (insertError) {
    console.error('[createEmptyGroup] Error:', insertError);
    return { success: false, error: insertError.message };
  }
  
  revalidatePath('/dashboard/grupos');
  revalidatePath('/grupos');
  
  // Redirigir a la página del nuevo grupo
  redirect(`/grupos/${classToken}`);
}
