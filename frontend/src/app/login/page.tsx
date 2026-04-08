'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap, Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload  = isLogin ? { email: form.email, password: form.password } : form;
      const resp = await api.post(endpoint, payload);
      const { user, accessToken, refreshToken } = resp.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(isLogin ? 'Welcome back!' : 'Account created!');
      router.push('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 hero-gradient" />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }} />

      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md glass-dark rounded-2xl p-8 border border-[rgba(124,58,237,0.2)] shadow-[0_30px_80px_rgba(0,0,0,0.6)]">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.5)] mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'Orbitron, monospace', background: 'linear-gradient(90deg, #a855f7, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ANIMAVAULT
          </h1>
          <p className="text-[#8888aa] text-sm mt-1">{isLogin ? 'Welcome back, weeb 👾' : 'Join the vault'}</p>
        </div>

        {/* Toggle */}
        <div className="flex p-1 rounded-xl bg-[#0a0a0f] mb-6">
          {['Login', 'Register'].map((label, i) => (
            <button key={label} onClick={() => setIsLogin(i === 0)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${(i === 0) === isLogin ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'text-[#8888aa]'}`}>
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handle} className="space-y-4">
          {!isLogin && (
            <Field icon={User} type="text" placeholder="Username" value={form.username}
             onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
  setForm(f => ({ ...f, username: e.target.value }))
}
          <Field icon={Mail} type="email" placeholder="Email address" value={form.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
  setForm(f => ({ ...f, email: e.target.value }))
            } />
          <div className="relative">
            <Field icon={Lock} type={show ? 'text' : 'password'} placeholder="Password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <button type="button" onClick={() => setShow(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8888aa] hover:text-white">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', boxShadow: '0 0 25px rgba(124,58,237,0.35)' }}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? 'Sign In' : 'Create Account'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

function Field({ icon: Icon, ...props }: any) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8888aa]" />
      <input {...props}
        className="w-full bg-[#0a0a0f] border border-[rgba(124,58,237,0.2)] rounded-xl pl-10 pr-4 py-3 text-sm text-[#f1f1f8] placeholder-[#8888aa] outline-none focus:border-violet-500 focus:shadow-[0_0_15px_rgba(124,58,237,0.2)] transition-all"
      />
    </div>
  );
}
