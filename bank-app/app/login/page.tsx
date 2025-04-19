"use client"
import { useState, useEffect } from 'react';
import { useSession } from '../context/sessionContext';
import { useRouter } from 'next/navigation';
import Head from '@/components/header';
import Sidebar from '@/components/sidebar';

const SNAP_ID = 'local:http://localhost:8080';

type VPResponse = {
  success: boolean,
  vp: string
}

const LoginPage = () => {
  const { login } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false); 
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const connectToSnap = async () => {
    try {
      setIsConnecting(true);
      setStatusMessage('Connecting to Digital ID service...');
      await window.ethereum.request({
        method: 'wallet_requestSnaps',
        params: {
          [SNAP_ID]: {}
        }
      });
      setStatusMessage('Connected to Digital ID service');
      return true;
    } catch (error) {
      setErrorMessage(`Failed to connect to Digital ID service: ${error.message}`);
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      connectToSnap();
    }
  }, []);

  const handleDidLogin = async () => {
    let challenge;
    try {
      setIsLoading(true);
      setErrorMessage('');
      setStatusMessage('Verifying your Digital ID...');
      
      if (!window.ethereum) {
        setErrorMessage('MetaMask is not installed. Please install MetaMask to continue.');
        return;
      }
      
      const connected = await connectToSnap();
      if (!connected) {
        return;
      }
      
      try {
        const snaps = await window.ethereum.request({
          method: 'wallet_getSnaps',
        });
        
        const snapInstalled = Object.values(snaps).some((snap: any) => {
          return snap.id === SNAP_ID;
        });
        
        if (!snapInstalled) {
          setErrorMessage('DMV Snap not found. Please get your Digital ID from the DMV first.');
          return;
        }
      } catch (snapError) {
        throw new Error('Failed to check installed snaps.');
      }
      

      try {
        const challengeResponse = await fetch('http://localhost:5001/verifier/generate-challenge');
        if (!challengeResponse.ok) {
          const errorText = await challengeResponse.text();
          throw new Error(`Failed to generate verification challenge: ${errorText}`);
        }
        
        const challengeData = await challengeResponse.json();
        challenge = challengeData.challenge;
        
        console.log("Received challenge:", challenge);
        setStatusMessage('Challenge received. Preparing credential presentation...');
      } catch (challengeError) {
        console.error("Challenge error:", challengeError);
        throw new Error('Failed to generate verification challenge.');
      }
      
      if (!challenge) {
        throw new Error('Failed to get challenge from verifier');
      }
      
      try {
        console.log("Requesting VP with challenge:", challenge);
        
        const vpResponse = await window.ethereum.request({
          method: 'wallet_invokeSnap',
          params: {
            snapId: SNAP_ID,
            request: {
              method: 'get-vp',
              params: {
                challenge: challenge,
                validTypes: ["credential-type"]
              }
            }
          }
        }) as VPResponse;
        
        console.log("VP Response:", vpResponse);
        
        if (!vpResponse || !vpResponse.success) {
          throw new Error(vpResponse?.message || 
            'Failed to get verifiable presentation. You may need to get a Digital ID first.');
        }
        
        const vp = vpResponse.vp;
        setStatusMessage('Credential found. Verifying with bank services...');
        
        try {
          
          const verifyResponse = await fetch('http://localhost:5001/verifier/verify-vp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ vp }),
          });
          
          const responseText = await verifyResponse.text();
          let verifyResult;
          
          try {
            verifyResult = JSON.parse(responseText);
          } catch (e) {
            throw new Error(`Invalid verification response: ${responseText}`);
          }
          
          if (!verifyResponse.ok || !verifyResult.verified) {
            throw new Error(verifyResult.error || 'Credential verification failed');
          }
          
          const credentialSubject = verifyResult.payload?.vc.credentialSubject;
          console.log(credentialSubject);
          
          if (!credentialSubject.permissions || !credentialSubject.permissions.includes('banking')) {
            throw new Error('Your Digital ID does not have banking permissions');
          }
          
          login({
            name: credentialSubject.name || 'Bank Customer',
            address: credentialSubject.address || '123 Main St',
            licenseNumber: credentialSubject.licenseNumber || '',
          });
          await fetch('/api/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              licenseNumber: credentialSubject.licenseNumber, // or another unique identifier
              firstName: credentialSubject.name.split(' ')[0],
              lastName: credentialSubject.name.split(' ')[1] || '',
              address: credentialSubject.address || '123 Main St',
            }),
          });
          router.push('/account');
        } catch (verifyError) {
          throw new Error('Failed to verify credential presentation.');
        }
      } catch (vpError) {
        throw new Error(vpError.message || 'Failed to get verifiable presentation.');
      }
    } catch (error) {
      setErrorMessage(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-4 text-center text-black">Login to Texas A&M Bank</h1>
        <p className="mb-6 text-center text-black">
          Sign in securely using your Digital ID issued by the Texas A&M DMV.
        </p>
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {errorMessage}
          </div>
        )}
        {statusMessage && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
            {statusMessage}
          </div>
        )}
        <button
          onClick={connectToSnap}
          disabled={isConnecting}
          className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg mb-4 w-full hover:bg-gray-300 disabled:bg-gray-100"
        >
          {isConnecting ? 'Connecting...' : 'Connect to Digital ID Service'}
        </button>
        <button
          onClick={handleDidLogin}
          disabled={isLoading}
          className="bg-blue-600 text-white py-3 px-6 rounded-lg w-full hover:bg-blue-700 disabled:bg-blue-300 mb-4"
        >
          {isLoading ? 'Authenticating...' : 'Login with Digital ID'}
        </button>
        <div className="text-center mt-4"></div>
      </div>
      <Head />
      <Sidebar />
    </div>
  );
};

export default LoginPage;