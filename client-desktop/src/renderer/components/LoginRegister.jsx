import React, { useState } from 'react';
import { useUserStore } from '../store/userStore';

export const LoginRegister = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useUserStore(state => state.setUser);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin ? { email, password } : { email, username, password };

      const res = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      if (isLogin) {
        setUser({ email, username: data.username || email.split('@')[0] }, data.token);
        if (onLoginSuccess) onLoginSuccess();
      } else {
        alert('Kayit basarili! Lutfen giris yapin.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#030914]/60 backdrop-blur-xl">
      <div className="bg-[#111] p-10 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] w-96 flex flex-col items-center">
        <h2 className="text-4xl font-extrabold font-logo text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
          SpoTube <span className="text-white text-xl">API</span>
        </h2>
        <p className="text-gray-400 text-sm mb-8">{isLogin ? 'Hesabınıza giriş yapın' : 'Yeni hesap oluşturun'}</p>

        {error && <div className="bg-red-500/20 text-red-400 w-full p-3 rounded-xl mb-4 text-sm text-center border border-red-500/30">{error}</div>}

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50"
            required
          />
          {!isLogin && (
            <input
              type="text"
              placeholder="Kullanıcı Adı"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50"
              required
            />
          )}
          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:scale-105 text-av-prussian font-bold py-3 mt-2 rounded-xl transition-transform shadow-[0_0_15px_rgba(141,169,196,0.3)] disabled:opacity-50"
          >
            {loading ? 'Yükleniyor...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
          </button>

          {isLogin && (
            <button
              type="button"
              onClick={() => {
                setEmail('demo@spotube.com');
                setPassword('demo123');
                setTimeout(() => {
                  document.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }, 100);
              }}
              className="w-full bg-white/5 hover:bg-white/10 text-white/70 py-2 rounded-xl transition-colors border border-white/5 text-sm"
            >
              Hızlı Demo Girişi
            </button>
          )}
        </form>

        <button
          className="mt-6 text-gray-500 hover:text-white text-sm transition-colors"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "Hesabın yok mu? Kayıt Ol" : "Zaten hesabın var mı? Giriş Yap"}
        </button>
      </div>
    </div>
  );
};
