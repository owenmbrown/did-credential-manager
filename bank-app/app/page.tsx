import Link from 'next/link';

const LandingPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-500 text-white">
      <h1 className="text-5xl font-bold mb-6">Welcome to Texas A&M Bank</h1>
      <p className="text-xl mb-6">A secure and trusted place for your banking needs with Digital IDs.</p>
      <Link href="/login">
          <button className="bg-teal-600 hover:bg-teal-700 py-3 px-6 rounded-lg">
            Login
          </button>
      </Link>
    </div>
  );
};

export default LandingPage;
