import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BrandHeader, ChurchLogo } from './Brand';
import AnnouncementModal from './AnnouncementModal';

const navItems = [
  { to: '/', label: 'Ranking', end: true },
  { to: '/equipes', label: 'Equipes' },
  { to: '/semanas', label: 'Semanas' },
  { to: '/novidades', label: 'Novidades' },
  { to: '/campea', label: 'Campeã' },
  { to: '/escape', label: '🔐 Escape' },
];

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Fecha o menu mobile ao trocar de rota
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementModal />
      <header className="bg-gradient-to-r from-brand-navy via-brand-navy-light to-brand-navy text-white shadow-lg">
        <div className="mx-auto max-w-6xl px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center min-w-0">
              <BrandHeader />
            </Link>

            {/* Nav desktop */}
            <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
              {navItems.map((item) => (
                <PublicNavLink key={item.to} to={item.to} end={item.end}>
                  {item.label}
                </PublicNavLink>
              ))}
              <Link
                to="/admin/login"
                className="ml-2 rounded-full bg-white/10 px-3 py-1.5 text-xs uppercase tracking-wider hover:bg-white/20"
              >
                Admin
              </Link>
            </nav>

            {/* Botão hamburger mobile */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
              className="md:hidden rounded-full bg-white/10 px-3 py-2 text-lg hover:bg-white/20"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>

          {/* Menu mobile expansível */}
          {menuOpen && (
            <nav className="md:hidden mt-3 flex flex-col gap-1 border-t border-white/10 pt-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm transition ${
                      isActive
                        ? 'bg-brand-yellow text-brand-navy font-semibold'
                        : 'text-white/90 hover:bg-white/10'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <Link
                to="/admin/login"
                className="mt-1 rounded-lg bg-white/10 px-3 py-2 text-xs uppercase tracking-wider hover:bg-white/20"
              >
                Admin
              </Link>
            </nav>
          )}
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Gincana EBD 2026 · "Conheçamos e prossigamos em conhecer ao Senhor."
          </p>
          <ChurchLogo size={32} />
        </div>
      </footer>
    </div>
  );
}

function PublicNavLink({
  to,
  end,
  children,
}: {
  to: string;
  end?: boolean;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `rounded-full px-3 py-1.5 transition ${
          isActive ? 'bg-brand-yellow text-brand-navy' : 'text-white/90 hover:bg-white/10'
        }`
      }
    >
      {children}
    </NavLink>
  );
}
