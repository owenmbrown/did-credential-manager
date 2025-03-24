import Link from 'next/link';

const Sidebar = () => {
  return (
    <aside className="fixed top-35 left-2 rounded-xl h-65 w-64 bg-[var(--maroon)] text-white p-6">
    <h2 className="text-xl font-bold mb-6">Navigation</h2>
    <nav>
      <ul className="space-y-4">
        <li>
          <Link href="/" className="block p-2 hover:bg-gray-700 rounded">
            Home 
          </Link>
        </li>
        <li>
          <Link href="/about" className="block p-2 hover:bg-gray-700 rounded">
            About
          </Link>
        </li>
        <li>
          <Link href="/issue" className="block p-2 hover:bg-gray-700 rounded">
            Services
          </Link>
        </li>
      </ul>
    </nav>
  </aside>
  );
};

export default Sidebar;
