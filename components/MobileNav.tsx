'use client';

import { useEffect, useMemo, useState } from 'react';
import { Home, MessageSquare, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { createSupabaseBrowserClient } from '../src/lib/supabase/client';

type NavKey = 'home' | 'messages' | 'me';

type NavItem = {
  key: NavKey;
  hrefAuthed: string;
  hrefGuest: string;
  label: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  {
    key: 'home',
    hrefAuthed: '/',
    hrefGuest: '/',
    label: '首页',
    icon: <Home className="h-5 w-5" />,
  },
  {
    key: 'messages',
    hrefAuthed: '/inbox',
    hrefGuest: '/login?next=/inbox',
    label: '消息',
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    key: 'me',
    hrefAuthed: '/profile',
    hrefGuest: '/login?next=/profile',
    label: '我的',
    icon: <User className="h-5 w-5" />,
  },
];

function navItemClasses(active: boolean) {
  return `flex flex-col items-center gap-1 pt-2 pb-1 text-xs transition ${
    active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
  }`;
}

export function MobileNav() {
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        setAuthed(!!data.session);
      } catch {
        if (!alive) return;
        setAuthed(false);
      }
    }

    void load();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setAuthed(!!session);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/80 shadow-sm backdrop-blur-md md:hidden">
      <div className="grid grid-cols-3">
        {navItems.map((item) => {
          const href = authed ? item.hrefAuthed : item.hrefGuest;
          const isActive = pathname === item.hrefAuthed;

          return (
            <Link key={item.key} href={href} className={navItemClasses(isActive)}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
