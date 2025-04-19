'use client';

import { useEffect, useState } from 'react';
import { useSession } from '../context/sessionContext';
import { useRouter } from 'next/navigation';
import Head from '@/components/header';
import Sidebar from '@/components/sidebar';

export default function TransactionForm() {
  const [accounts, setAccounts] = useState([]);
  const { isLoggedIn, userInfo} = useSession();
  const router = useRouter();
  const [selectedAccount, setSelectedAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');

  // Fetch user accounts (or you could pass them in as props)
  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
    }
    const fetchAccounts = async () => {
      const res = await fetch('/api/accounts?licenseNumber=${userInfo.licenseNumber}');
      const data = await res.json();
      setAccounts(data.accounts || []);
      if (data.accounts.length > 0) {
        setSelectedAccount(data.accounts[0].id); // default to first
      }
    };

    fetchAccounts();
  }, [isLoggedIn, router, userInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: selectedAccount,
        transactionAmount: parseFloat(amount),
      }),
    });

    if (res.ok) {
      setStatus('Transaction submitted!');
      setAmount('');
    } else {
      setStatus('Error submitting transaction.');
    }
  };

  return (

        <form
          onSubmit={handleSubmit}
          className="max-w-md mx-auto space-y-4 p-6 rounded shadow"
          style={{
            backgroundColor: 'var(--maroon)',
            color: 'white',
          }}
        >
          <div>
            <label className="block mb-1 font-medium text-white">Transaction Amount ($)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded border border-white"
              style={{
                backgroundColor: 'white',
                color: 'var(--maroon)',
              }}
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-white">Select Account</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-3 py-2 rounded border border-white"
              style={{
                backgroundColor: 'white',
                color: 'var(--maroon)',
              }}
            >
              {accounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.id})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 rounded font-semibold"
            style={{
              backgroundColor: 'white',
              color: 'var(--maroon)',
              border: '2px solid white',
            }}
          >
            Submit Transaction
          </button>

          {status && <p className="mt-2 text-sm text-white">{status}</p>}
        </form>

  );
}