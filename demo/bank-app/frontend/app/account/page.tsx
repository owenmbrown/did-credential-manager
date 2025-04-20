"use client";

import { useSession } from '../context/sessionContext';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useEffect } from 'react';
import { useState } from "react";
import Head from '@/components/header';
import Sidebar from '@/components/sidebar';

interface Transaction {
  transactionID: number;
  transactionAmount: number;
  transactionDate: string;
  startBalance: number;
  endBalance: number;
}

interface Account {
  accountID: number;
  userID: number;
  accountLabel: string;
  accountBalance: number;
  transactions: Transaction[];
}

const AccountPage = () => {
  const { isLoggedIn, userInfo} = useSession();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true); // Add a loading state
  const hasFetched = useRef(false);

    useEffect(() => {
      if (!isLoggedIn) {
        router.replace("/login");
      } else {
        if (!isLoggedIn || !userInfo || hasFetched.current) return;

          hasFetched.current = true;

          async function fetchAccounts() {
            try {
              const res = await fetch(`/api/account?licenseNumber=${userInfo?.licenseNumber}`, {
                method: 'GET',
              });
              const data = await res.json();
              setAccounts(data);
            } catch (error) {
              console.error('Failed to fetch accounts:', error);
            } finally {
              setLoading(false);
            }
          }
          fetchAccounts();
          console.log("Fetched accounts:", accounts);
        }
    }, [isLoggedIn, router, userInfo]);

    if (loading) {
      return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }
  

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-20">
      <Head />
      <h1 className="text-5xl font-bold mt-10">Welcome {userInfo?.name}</h1>
      <div className='flex flex-row items-center justify-center gap-20'>
        <div className="max-w mx-auto mt-10 p-6 bg-[var(--maroon)] shadow-lg rounded-lg">
          <h1 className="text-2xl font-bold text-center mb-4">Your Accounts</h1>

          {accounts.map((account, index) => (
            <div key={index} className="mb-6 p-4 border rounded-lg bg-gray-100">
              <h2 className="text-xl font-semibold text-black">{account.accountLabel} Account</h2>
              <p className="text-lg font-bold text-green-600">Balance: ${account.accountBalance.toFixed(2)}</p>

              <h3 className="mt-3 font-semibold text-black">Transaction History</h3>
              {account.transactions.length > 0 ? (
                <ul className="mt-2">
                  {account.transactions.map((txn, i) => (
                    <li key={i} className="text-sm text-black">
                      ${txn.transactionAmount.toFixed(2)}
                    </li>
                  ))}
                </ul>
              ) : (
              <p className="text-sm text-gray-500">No transactions yet.</p>
              )}
            </div>
          ))}
        </div>
        <div>
          <div className='bg-[var(--maroon)] text-white p-4 rounded-lg mt-6'>
            <h2 className="text-2xl font-bold mt-10">Transfer Funds</h2>
            <button onClick={() => router.push("/transaction")} className="bg-[var(--maroon)] text-white py-2 px-4 rounded-lg mt-2">transaction</button>
          </div>
          <div className='bg-[var(--maroon)] text-white p-4 rounded-lg mt-6'>
            <h2 className="text-2xl font-bold mt-10">Personal Info</h2>
            <p className="mt-2">Name: {userInfo?.name}</p>
            <p>Address: {userInfo?.address}</p>
          </div>
        </div>
      </div>
      <Sidebar />
    </div>
  );
};

export default AccountPage;
