import { Outlet, Link, useLocation } from 'react-router-dom';

export default function ViewerLayout() {
  const location = useLocation();
  
  const navLinks = [
    { name: 'HOME', path: '/' },
    { name: 'STATS', path: '/stats' },
    { name: 'TEAMS', path: '/teams' },
  ];

  return (
    <div className="min-h-dvh bg-[#f8f9fa] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-[#e2e8f0] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-[#0f172a] tracking-tight">CRICSCORE</h1>
            <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Live Box Cricket Tournament</p>
          </div>
          
          <Link
            to="/scorer"
            className="text-[10px] font-bold px-3 py-1.5 bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0f172a] rounded-lg transition-colors"
          >
            SCORER
          </Link>
        </div>

        {/* Navigation */}
        <nav className="max-w-4xl mx-auto px-4 flex gap-6 overflow-x-auto">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`py-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                location.pathname === link.path 
                  ? 'border-[#0f172a] text-[#0f172a]' 
                  : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
