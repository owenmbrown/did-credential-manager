"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "@/app/context/sessionContext"; // Import session context
import { useRouter } from "next/navigation";
import { FaUserCircle } from "react-icons/fa"; // Import an account icon

const Head = () => {
  const { isLoggedIn } = useSession(); // Get login state
  const router = useRouter();
  
  return (
    <header className="fixed top-0 left-0 flex items-center justify-between bg-[var(--maroon)] w-full p-6 text-white text-center text-2xl font-bold">
      <Image src="/TAM-Logo-white.png" alt="Company Logo" width={60} height={60} className="mr-10"  />
      Texas A&M Bank - Galveston Branch
      <button
        onClick={() => router.push(isLoggedIn ? "/account" : "/login")}
        className="bg-white text-[var(--maroon)] px-4 py-2 rounded-lg text-lg font-semibold flex items-center gap-2 hover:bg-gray-200 transition"
      >
        {isLoggedIn ? (
          <>
            <FaUserCircle size={24} /> Account
          </>
        ) : (
          "Log In"
        )}
      </button>
    </header>
  );
};

export default Head;
