import Link from 'next/link';

const Sidebar = () => {
  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-gray-900 text-white p-6">
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
            <Link href="/services" className="block p-2 hover:bg-gray-700 rounded">
              Services
            </Link>
          </li>
          <li>
            <Link href="/contact" className="block p-2 hover:bg-gray-700 rounded">
              Contact
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
