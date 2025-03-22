import { useSession } from '../context/sessionContext';
import { useRouter } from 'next/router';

const TransactionPage = () => {
  const { isLoggedIn } = useSession();
  const router = useRouter();

  if (!isLoggedIn) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-4">Transaction Page</h1>
        <p className="text-lg">Transaction details and form go here...</p>
      </div>
    </div>
  );
};

export default TransactionPage;
