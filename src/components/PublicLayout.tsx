import { Link, NavLink, Outlet } from 'react-router-dom';
import { BrandHeader, ChurchLogo } from './Brand';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-brand-navy via-brand-navy-light to-brand-navy text-white shadow-lg">
        <div className="mx-auto max-w-6xl px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Link to="/" className="flex items-center">
            <BrandHeader />
          </Link>
          <nav className="flex items-center gap-1 md:gap-2 text-sm font-medium">
            <PublicNavLink to="/" end>
              Ranking
            </PublicNavLink>
            <PublicNavLink to="/equipes">Equipes</PublicNavLink>
            <PublicNavLink to="/semanas">Semanas</PublicNavLink>
            <PublicNavLink to="/novidades">Novidades</PublicNavLink>
            <PublicNavLink to="/campea">Campeã</PublicNavLink>
            <Link
              to="/admin/login"
              className="ml-2 rounded-full bg-white/10 px-3 py-1.5 text-xs uppercase tracking-wider hover:bg-white/20"
            >
              Admin
            </Link>
          </nav>
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
