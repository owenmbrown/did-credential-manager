"use client";

import { useSession } from '../context/sessionContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useState } from "react";
import Head from '@/components/header';
import Sidebar from '@/components/sidebar';

const TransactionPage = () => {
  const { isLoggedIn } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true); // Add a loading state

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
    } else {
      setLoading(false); // Authentication check is done
    }
  }, [isLoggedIn, router]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <Head />
      <div className="p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-4">Transaction Page</h1>
        <p className="text-lg">Transaction details and form go here...</p>
      </div>
      <Sidebar />
    </div>
  );
};

export default TransactionPage;
