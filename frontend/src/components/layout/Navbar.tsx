'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, User, Download, Settings, LogOut, Menu, X, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <motion.nav
      initial={false}
      animate={{ backdropFilter: scrolled ? 'blur(20px)' : 'blur(0px)' }}
      className={`sticky top-0 z-50 h-16 flex items-center px-4 lg:px-6 gap-4 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0a0a0f]/90 border-b border-[rgba(124,58,237,0.15)] shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
          : 'bg-transparent'
      }`}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.5)]">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="hidden sm:block font-bold text-lg tracking-wider" style={{ fontFamily: 'Orbitron, monospace', background: 'linear-gradient(90deg, #a855f7, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ANIMAVAULT
        </span>
      </Link>

      {/* Nav Links (desktop) */}
      <div className="hidden md:flex items-center gap-1 flex-1 ml-4">
        {[
          { href: '/', label: 'Home' },
          { href: '/search', label: 'Browse' },
          { href: '/download', label: 'Downloads' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              pathname === href
                ? 'text-violet-400 bg-violet-500/10 shadow-[0_0_10px_rgba(124,58,237,0.2)]'
                : 'text-[#8888aa] hover:text-[#f1f1f8] hover:bg-white/5'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Search */}
      <div className="flex-1 md:flex-none md:w-64 relative">
        <AnimatePresence>
          {searchOpen ? (
            <motion.form
              key="search-open"
              initial={{ width: 40, opacity: 0 }}
              animate={{ width: '100%', opacity: 1 }}
              exit={{ width: 40, opacity: 0 }}
              onSubmit={handleSearch}
              className="flex items-center gap-2"
            >
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search anime..."
                className="w-full bg-[#1c1c2e] border border-[rgba(124,58,237,0.3)] rounded-lg px-3 py-1.5 text-sm text-[#f1f1f8] placeholder-[#8888aa] outline-none focus:border-violet-500 focus:shadow-[0_0_15px_rgba(124,58,237,0.2)] transition-all"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="text-[#8888aa] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </motion.form>
          ) : (
            <motion.button
              key="search-closed"
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg text-[#8888aa] hover:text-[#f1f1f8] hover:bg-white/5 transition-all"
            >
              <Search className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 shrink-0">
        {user && (
          <Link href="/dashboard?tab=downloads" className="relative p-2 rounded-lg text-[#8888aa] hover:text-[#f1f1f8] hover:bg-white/5 transition-all">
            <Download className="w-5 h-5" />
          </Link>
        )}

        {user && (
          <Link href="/dashboard?tab=notifications" className="relative p-2 rounded-lg text-[#8888aa] hover:text-[#f1f1f8] hover:bg-white/5 transition-all">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold rounded-full bg-violet-600 text-white flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        )}

        {user ? (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                {user.username[0].toUpperCase()}
              </div>
            </button>
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-full mt-2 w-48 glass-dark rounded-xl border border-[rgba(124,58,237,0.2)] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                >
                  <div className="px-3 py-2 border-b border-[rgba(255,255,255,0.05)]">
                    <p className="text-sm font-medium text-[#f1f1f8]">{user.username}</p>
                    <p className="text-xs text-[#8888aa]">{user.email}</p>
                  </div>
                  {[
                    { href: '/dashboard', icon: User, label: 'Dashboard' },
                    { href: '/dashboard?tab=downloads', icon: Download, label: 'Downloads' },
                    { href: '/settings', icon: Settings, label: 'Settings' },
                    ...(user.role === 'admin' ? [{ href: '/admin', icon: Zap, label: 'Admin Panel' }] : []),
                  ].map(({ href, icon: Icon, label }) => (
                    <Link key={href} href={href} onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[#8888aa] hover:text-[#f1f1f8] hover:bg-white/5 transition-all">
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  ))}
                  <button onClick={() => { logout(); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-all">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <Link href="/login"
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_20px_rgba(124,58,237,0.5)]">
            Sign In
          </Link>
        )}
      </div>
    </motion.nav>
  );
}
