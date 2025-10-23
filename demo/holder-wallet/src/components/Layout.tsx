import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Wallet, QrCode, Settings } from 'lucide-react';

export function Layout() {
  const location = useLocation();

  const navItems = [
    { to: '/credentials', icon: Wallet, label: 'Credentials' },
    { to: '/scan', icon: QrCode, label: 'Scan' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  // Don't show bottom nav on certain pages
  const hideBottomNav = location.pathname.includes('/present') || 
                        (location.pathname.includes('/credentials/') && location.pathname.split('/').length > 3);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
          <div className="flex justify-around items-center h-16">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                    isActive
                      ? 'text-primary-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`
                }
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

