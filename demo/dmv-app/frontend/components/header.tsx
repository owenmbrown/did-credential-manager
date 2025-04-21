import Image from 'next/image';

const Head = () => {
  return (
    <header className="fixed top-0 left-0 flex items-center bg-[var(--maroon)] w-full p-6 text-white text-center text-2xl font-bold">
      <Image src="/Texas_AM_University_System_seal_Wht.png" alt="Company Logo" width={60} height={60} className="mr-10"  />
      Texas A&M Galveston Campus Department of Motor Vehicles
    </header>
  );
};

export default Head;
