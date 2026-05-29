import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BrandHeader } from './Brand';
import {
  areSoundsEnabled,
  onSoundToggle,
  playSound,
  setSoundsEnabled,
} from '@/lib/sounds';

const navItems = [
  { to: '/admin', label: 'Painel', icon: '🏠', end: true },
  { to: '/admin/equipes', label: 'Equipes', icon: '🛡️' },
  { to: '/admin/integrantes', label: 'Integrantes', icon: '👥' },
  { to: '/admin/semanas', label: 'Semanas', icon: '📅' },
  { to: '/admin/atividades', label: 'Atividades', icon: '🎯' },
  { to: '/admin/pontuacoes', label: 'Pontuações', icon: '🏆' },
  { to: '/admin/lancamento-rapido', label: 'Lançamento rápido', icon: '⚡' },
  { to: '/admin/galeria', label: 'Galeria', icon: '🖼️' },
  { to: '/admin/configuracoes', label: 'Configurações', icon: '⚙️' },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-navy text-white shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link to="/admin" className="flex items-center">
            <BrandHeader variant="compact" />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <SoundToggle />
            <span className="hidden md:inline opacity-80">{user?.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
            >
              Sair
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              className="md:hidden rounded-full bg-white/10 px-3 py-1.5 text-xs"
              aria-label="Abrir menu"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl w-full px-4 py-6 flex gap-6 flex-1">
        <aside
          className={`${
            mobileNavOpen ? 'block' : 'hidden'
          } md:block w-full md:w-60 shrink-0`}
        >
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand-navy text-white shadow-card'
                      : 'text-slate-700 hover:bg-white hover:shadow-card'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SoundToggle() {
  const [on, setOn] = useState(areSoundsEnabled());
  useEffect(() => onSoundToggle(() => setOn(areSoundsEnabled())), []);
  function toggle() {
    const next = !on;
    setSoundsEnabled(next);
    if (next) playSound('tick');
  }
  return (
    <button
      type="button"
      onClick={toggle}
      title={on ? 'Sons ligados — clique para desligar' : 'Sons desligados — clique para ligar'}
      className="rounded-full bg-white/10 px-2.5 py-1.5 text-base hover:bg-white/20"
      aria-pressed={on}
    >
      {on ? '🔔' : '🔕'}
    </button>
  );
}
