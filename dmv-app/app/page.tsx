import Link from "next/link";
import Sidebar from "../components/sidebar";

export default function HomePage() {
  return (
    <div>
      <header className="fixed top-0 left-0 bg-[var(--maroon)] w-full p-6 text-white text-center text-2xl font-bold">
        Texas A&M Galveston Campus Department of Motor Vehicles
      </header>
      <Sidebar />
    </div>
  );
}