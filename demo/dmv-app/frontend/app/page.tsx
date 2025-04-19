import Link from "next/link";
import Sidebar from "@/components/sidebar-new";
import Head from "@/components/header";

export default function HomePage() {
  return (
    <div>
      <Head />
      <Sidebar />
    </div>
  );
}