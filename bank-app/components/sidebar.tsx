import Link from 'next/link';

const Sidebar = () => {
  return (
    <aside className="fixed top-35 left-2 h-65 w-64 bg-[var(--maroon)] text-white p-6 rounded-xl shadow-xl">
    <h2 className="text-xl font-bold mb-6">Navigation</h2>
    <nav>
      <ul className="space-y-4">
        <li>
          <Link href="/" className="block p-2 hover:bg-gray-700 rounded">
            Home 
          </Link>
        </li>
        <li>
          <Link href="/account" className="block p-2 hover:bg-gray-700 rounded">
            Account
          </Link>
        </li>
        <li>
          <Link href="/transaction" className="block p-2 hover:bg-gray-700 rounded">
            Services
          </Link>
        </li>
      </ul>
    </nav>
  </aside>
  );
};

export default Sidebar;
