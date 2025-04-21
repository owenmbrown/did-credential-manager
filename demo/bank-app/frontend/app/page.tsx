import Link from 'next/link';
import Sidebar from '@/components/sidebar';
import Head from "@/components/header";

const LandingPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white">
      <Head />
      <div className='backdrop-blur-md flex flex-col items-center justify-center p-8 rounded-lg shadow-lg'>
        <h1 className="text-5xl font-bold mb-6">Welcome to Texas A&M Bank</h1>
        <p className="text-xl mb-6">A secure and trusted place for your banking needs.</p>
      </div>
      <Sidebar />
    </div>

  );
};

export default LandingPage;
