import Link from 'next/link';
import Sidebar from '@/components/sidebar';

const LandingPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-white p-8 bg-opacity-60 backdrop-blur-lg rounded-lg w-full max-w-4xl">
        <h1 className="text-5xl font-bold mb-4">
          Welcome to the Texas A&M DMV Service
        </h1>
        <p className="text-xl mb-6">
          Simplifying your digital identity process. Get your Digital ID (DID) in just a few easy steps. Secure, fast, and hassle-free.
        </p>

        <div className="space-x-4">
          
        </div>
      </div>
      <Sidebar />
    </div>
  );
};

export default LandingPage;
