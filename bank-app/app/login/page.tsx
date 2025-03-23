"use client"
import { useState } from 'react';
import { useSession } from '../context/sessionContext';
import { useRouter } from 'next/navigation';

const SNAP_ID = 'local:http://localhost:8080';

const LoginPage = () => {
  const { login } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false); 
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const handleDidLogin = async () => {
    let challenge; // Declare challenge variable outside try/catch blocks
    
    try {
      setIsLoading(true);
      setErrorMessage('');
      setStatusMessage('Verifying your Digital ID...');

      // Check if MetaMask is installed
      if (!window.ethereum) {
        setErrorMessage('MetaMask is not installed. Please install MetaMask to continue.');
        return;
      }

      try {
        // Check if our snap is installed
        const snaps = await window.ethereum.request({
          method: 'wallet_getSnaps',
        });

        console.log('Available snaps:', snaps); // Debugging log to inspect the snaps object

        const snapInstalled = Object.values(snaps).some((snap: any) => {
          console.log('Checking snap:', snap); // Debugging log for each snap
          return snap.id === SNAP_ID;
        });

        if (!snapInstalled) {
          setErrorMessage('DMV Snap not found. Please get your Digital ID from the DMV first.');
          return;
        }
      } catch (snapError) {
        console.error('Error checking snaps:', snapError);
        throw new Error('Failed to check installed snaps.');
      }

      try {
        // Step 1: Request a challenge from the verifier service
        const challengeResponse = await fetch('http://localhost:5001/verifier/generate-challenge');
        
        if (!challengeResponse.ok) {
          const errorText = await challengeResponse.text(); // Log the response body for debugging
          console.error('Challenge request failed:', challengeResponse.status, errorText);
          throw new Error('Failed to generate verification challenge');
        }

        const challengeData = await challengeResponse.json();
        challenge = challengeData.challenge; // Assign to the variable declared outside
        setStatusMessage('Challenge received. Preparing credential presentation...');
      } catch (challengeError) {
        console.error('Error generating challenge:', challengeError);
        throw new Error('Failed to generate verification challenge.');
      }

      // Make sure challenge is defined before proceeding
      if (!challenge) {
        throw new Error('Failed to get challenge from verifier');
      }

      try {
        // Step 2: Get a verifiable presentation from the snap
        const vp = await window.ethereum.request({
          method: 'wallet_invokeSnap',
          params: {
            snapId: SNAP_ID,
            request: {
              method: 'get-vp',
              params: {
                challenge,
              },
            },
          },
        });

        if (!vp) {
          throw new Error('Failed to get verifiable presentation. You may need to get a Digital ID first.');
        }

        setStatusMessage('Credential found. Verifying with bank services...');
        
        try {
          // Step 3: Verify the presentation with the verifier service
          const verifyResponse = await fetch('http://localhost:5001/verifier/verify-vp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ vp }),
          });

          const verifyResult = await verifyResponse.json();

          if (!verifyResponse.ok || !verifyResult.verified) {
            console.error('Verification failed:', verifyResult);
            throw new Error(verifyResult.error || 'Credential verification failed');
          }

          // Step 4: Extract user information from the verified credential
          const credentialSubject = verifyResult.payload?.credentialSubject;

          // Check if this credential has banking permissions
          if (!credentialSubject.permissions || !credentialSubject.permissions.includes('banking')) {
            throw new Error('Your Digital ID does not have banking permissions');
          }

          // Step 5: Log the user in with the extracted information
          login({
            name: credentialSubject.name || 'Bank Customer',
            licenseNumber: credentialSubject.licenseNumber || '',
          });

          // Step 6: Redirect to account page
          router.push('/bank-app/account');
        } catch (verifyError) {
          console.error('Error verifying presentation:', verifyError);
          throw new Error('Failed to verify credential presentation.');
        }
      } catch (vpError) {
        console.error('Error getting verifiable presentation:', vpError);
        throw new Error('Failed to get verifiable presentation.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
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
          onClick={handleDidLogin}
          disabled={isLoading}
          className="bg-blue-600 text-white py-3 px-6 rounded-lg w-full hover:bg-blue-700 disabled:bg-blue-300 mb-4"
        >
          {isLoading ? 'Authenticating...' : 'Login with Digital ID'}
        </button>
        
        <div className="text-center mt-4">
        </div>
      </div>
    </div>
  );
};

export default LoginPage;