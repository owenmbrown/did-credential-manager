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
  const [isSnapInstalled, setIsSnapInstalled] = useState(false);

  const checkSnapInstallation = async () => {
    try {
      if (!window.ethereum) {
        setErrorMessage('MetaMask is not installed. Please install MetaMask to continue.');
        return false;
      }
      
      const snaps = await window.ethereum.request({
        method: 'wallet_getSnaps',
      }).catch(err => {
        console.warn("Error checking snaps:", err);
        return {};
      });
      
      const snapInstalled = snaps && snaps[SNAP_ID];
      setIsSnapInstalled(!!snapInstalled);
      
      return !!snapInstalled;
    } catch (error) {
      console.error('Error checking snap installation:', error);
      return false;
    }
  };

  const connectToSnap = async () => {
    try {
      setIsConnecting(true);
      setStatusMessage('Connecting to Digital ID service...');
      setErrorMessage('');
      
      // First check if it's already installed
      const isInstalled = await checkSnapInstallation();
      
      if (!isInstalled) {
        await window.ethereum.request({
          method: 'wallet_requestSnaps',
          params: {
            [SNAP_ID]: {}
          }
        }).catch(err => {
          throw new Error(`Failed to connect to Digital ID service: ${err.message}`);
        });
        
        // Verify installation was successful
        const isNowInstalled = await checkSnapInstallation();
        
        if (!isNowInstalled) {
          throw new Error('Failed to install Digital ID service');
        }
      }
      
      setStatusMessage('Connected to Digital ID service');
      return true;
    } catch (error) {
      console.error('Snap connection error:', error);
      setErrorMessage(`Failed to connect to Digital ID service: ${error.message || 'Unknown error'}`);
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  // Modified useEffect to recover after errors
  useEffect(() => {
    const initializeSnap = async () => {
      if (window.ethereum) {
        await checkSnapInstallation();
        // Re-check every 5 seconds in case of lost connection
        const intervalId = setInterval(() => {
          checkSnapInstallation();
        }, 5000);
        
        return () => clearInterval(intervalId);
      }
    };
    
    initializeSnap();
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
      
      // Connect to snap if not already connected
      const connected = await connectToSnap();
      if (!connected) {
        return;
      }
      
      // Generate a challenge from the verifier
      try {
        const challengeResponse = await fetch('http://localhost:5001/verifier/generate-challenge');
        if (!challengeResponse.ok) {
          const errorText = await challengeResponse.text();
          throw new Error(`Failed to generate verification challenge: ${errorText}`);
        }
        
        const challengeData = await challengeResponse.json();
        challenge = challengeData.challenge;
        
        if (!challenge) {
          throw new Error('Failed to get challenge from verifier');
        }
        
        setStatusMessage('Challenge received. Preparing credential presentation...');
      } catch (challengeError) {
        console.error('Challenge generation error:', challengeError);
        throw new Error(`Failed to generate verification challenge: ${challengeError.message || 'Connection error'}`);
      }
      
      // Request a verifiable presentation using the challenge
      let vp_response;
      try {
        vp_response = await window.ethereum.request({
          method: 'wallet_invokeSnap',
          params: {
            snapId: SNAP_ID,
            request: {
              method: 'get-vp',
              params: {
                challenge,
                validTypes: ["credential-type"]
              },
            },
          },
        }) as VPResponse;
        
        if (!vp_response || !vp_response.success) {
          throw new Error('Failed to get verifiable presentation. You may need to get a Digital ID first.');
        }
      } catch (vpError) {
        console.error('VP generation error:', vpError);
        // Re-check snap connection status
        await checkSnapInstallation();
        throw new Error(`Failed to get verifiable presentation: ${vpError.message || 'Unknown error'}`);
      }
      
      setStatusMessage('Credential found. Verifying with bank services...');
      const vp = vp_response.vp;
      
      // Verify the presentation with the verifier service
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
          licenseNumber: credentialSubject.licenseNumber || '',
        });
        
        router.push('/account');
      } catch (verifyError) {
        console.error('Verification error:', verifyError);
        throw new Error(`Failed to verify credential presentation: ${verifyError.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setErrorMessage(error.message || 'Authentication failed. Please try again.');
      // Re-check snap connection after error
      setTimeout(() => {
        checkSnapInstallation();
      }, 1000);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Add a reconnect button when snap connection is lost
  const reconnectButton = !isSnapInstalled && (
    <button
      onClick={connectToSnap}
      disabled={isConnecting}
      className="bg-yellow-500 text-white py-2 px-4 rounded-lg mb-4 w-full hover:bg-yellow-600 disabled:bg-yellow-300"
    >
      {isConnecting ? 'Reconnecting...' : 'Reconnect to Digital ID Service'}
    </button>
  );

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
          className={`${isSnapInstalled ? 'bg-green-500' : 'bg-gray-200'} text-gray-800 py-2 px-4 rounded-lg mb-4 w-full hover:${isSnapInstalled ? 'bg-green-600' : 'bg-gray-300'} disabled:bg-gray-100`}
        >
          {isConnecting ? 'Connecting...' : isSnapInstalled ? '✓ Digital ID Service Connected' : 'Connect to Digital ID Service'}
        </button>
        {reconnectButton}
        <button
          onClick={handleDidLogin}
          disabled={isLoading || !isSnapInstalled}
          className="bg-blue-600 text-white py-3 px-6 rounded-lg w-full hover:bg-blue-700 disabled:bg-blue-300 mb-4"
        >
          {isLoading ? 'Authenticating...' : 'Login with Digital ID'}
        </button>
        <div className="text-center mt-4 text-sm text-gray-500">
          Don't have a Digital ID? Visit the Texas A&M DMV to get one.
        </div>
        {!isSnapInstalled && (
          <div className="text-center mt-2 text-sm text-red-500">
            Please connect to the Digital ID service to continue.
          </div>
        )}
      </div>
      <Head />
      <Sidebar />
    </div>
  );
};

export default LoginPage;