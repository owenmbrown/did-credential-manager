import React from 'react';
import Link from 'next/link';
import Sidebar from '@/components/sidebar';
import Head from '@/components/header';

const About = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Head />
      <div className="bg-[var(--maroon)] p-8 rounded-lg shadow-lg w-full max-w-4xl">
        <h1 className="text-3xl text-white-700 font-bold text-center mb-4">About the Texas A&M DMV Service</h1>
        <p className="text-lg text-white-700 mb-4">
          Welcome to the Texas A&M DMV, your trusted partner for issuing Digital IDs (DIDs). Our service is designed to provide
          quick and secure access to government-like services without the long lines and waiting times. Whether you need
          to verify your identity or register a new service, we've got you covered.
        </p>

        <p className="text-lg text-white-700 mb-4">
          We believe in creating a seamless digital experience for everyone. With our easy-to-use interface, you can apply
          for and receive a DID, securely store it, and access various services with just a few clicks.
        </p>

        <p className="text-lg text-white-700 mb-4">
          Our team is dedicated to enhancing the digital identity landscape. We work with cutting-edge technology to ensure
          your data is always secure and under your control.
        </p>
      </div>
      <Sidebar />
    </div>
  );
};

export default About;
