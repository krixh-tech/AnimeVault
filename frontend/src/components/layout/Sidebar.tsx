'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Search, Download, Bookmark, Clock, Settings, Shield, BarChart2, Play } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const NAV_ITEMS = [
  { href: '/',         icon: Home,     label: 'Home'       },
  { href: '/search',   icon: Search,   label: 'Browse'     },
  { href: '/download', icon: Download, label: 'Downloads'  },
];

const USER_ITEMS = [
  { href: '/dashboard?tab=watchlist', icon: Bookmark, label: 'Watchlist'     },
  { href: '/dashboard?tab=history',   icon: Clock,    label: 'History'       },
  { href: '/settings',                icon: Settings, label: 'Settings'      },
];

const ADMIN_ITEMS = [
  { href: '/admin',           icon: Shield,   label: 'Admin Panel' },
  { href: '/admin?tab=stats', icon: BarChart2, label: 'Analytics'  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href.split('?')[0]);

  return (
    <aside className="hidden lg:flex flex-col w-16 xl:w-56 shrink-0 sticky top-0 h-screen bg-[#0a0a0f] border-r border-[rgba(124,58,237,0.1)] overflow-y-auto">
      {/* Top spacer for navbar height */}
      <div className="h-16" />

      <nav className="flex-1 px-2 py-4 space-y-1">
        <SectionLabel label="MENU" />
        {NAV_ITEMS.map(item => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}

        {user && (
          <>
            <div className="pt-4">
              <SectionLabel label="LIBRARY" />
            </div>
            {USER_ITEMS.map(item => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </>
        )}

        {user?.role === 'admin' && (
          <>
            <div className="pt-4">
              <SectionLabel label="ADMIN" />
            </div>
            {ADMIN_ITEMS.map(item => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </>
        )}
      </nav>

      {/* Bottom neon accent */}
      <div className="p-3">
        <div className="h-px bg-gradient-to-r from-transparent via-violet-600/40 to-transparent" />
      </div>
    </aside>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="hidden xl:block px-3 text-[10px] font-semibold text-[#8888aa]/60 tracking-[0.15em] mb-1">
      {label}
    </p>
  );
}

function NavItem({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ x: 2 }}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
          active
            ? 'bg-violet-500/15 text-violet-400 shadow-[0_0_10px_rgba(124,58,237,0.15)]'
            : 'text-[#8888aa] hover:text-[#f1f1f8] hover:bg-white/5'
        }`}
      >
        {active && (
          <motion.div
            layoutId="active-pill"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4/5 bg-violet-500 rounded-full"
          />
        )}
        <Icon className="w-5 h-5 shrink-0" />
        <span className="hidden xl:block text-sm font-medium truncate">{label}</span>
      </motion.div>
    </Link>
  );
}
