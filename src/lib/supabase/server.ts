import { cookies as cookiesFn } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';

export async function createSupabaseServerClient() {
  const cookieStore = await cookiesFn();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
