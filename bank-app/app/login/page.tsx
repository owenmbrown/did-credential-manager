"use client";

import { useSession } from '../context/sessionContext';
import { useRouter } from 'next/navigation';
import Head from '@/components/header';
import Sidebar from '@/components/sidebar';

const LoginPage = () => {
  const { login } = useSession();
  const router = useRouter();

  const handleLogin = () => {
    // Simulating DID login verification
    login();
    router.push('/account'); // Redirect to account page after login
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <Head />
      <div className="p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-4">Login to Texas A&M Bank</h1>
        <button
          onClick={handleLogin}
          className="bg-blue-600 text-white py-3 px-6 rounded-lg w-full hover:bg-blue-700"
        >
          Login with DID
        </button>
      </div>
      <Sidebar />
    </div>
  );
};

export default LoginPage;
