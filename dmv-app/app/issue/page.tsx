"use client"
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/sidebar-new';
import Head from "@/components/header";

const SNAP_ID = 'local:http://localhost:8080';

const CredentialPage = () => {
  const [did, setDid] = useState('');
  const [isSnapInstalled, setIsSnapInstalled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [credentialIssued, setCredentialIssued] = useState(false);

  // Revised useEffect to only use permitted methods
  useEffect(() => {
    const checkSnapInstallation = async () => {
      try {
        if (!window.ethereum) {
          setStatusMessage('MetaMask is not installed. Please install MetaMask to use this feature.');
          return;
        }
        
        // Check if snap is installed
        const snaps = await window.ethereum.request({
          method: 'wallet_getSnaps',
        });
        
        const snapInstalled = !!snaps[SNAP_ID];
        
        if (!snapInstalled) {
          setIsSnapInstalled(false);
          setStatusMessage('DMV Snap is not installed. Please click "Install Snap" to continue.');
          return;
        }
        
        // If snap is installed, check for existing DID using get-did method 
        // (this method is allowed for all origins)
        try {
          const didResult = await window.ethereum.request({
            method: 'wallet_invokeSnap',
            params: {
              snapId: SNAP_ID,
              request: {
                method: 'get-did',
              },
            },
          });
          
          if (didResult?.success && didResult?.did) {
            // Extract the address part without the "did:ethr:" prefix
            const didAddress = didResult.did.replace('did:ethr:', '');
            setDid(didAddress);
            setIsSnapInstalled(true);
            setStatusMessage('DID found. You can now request your Digital ID credential.');
          } else {
            // No DID exists yet
            setStatusMessage('Snap is installed, but you need a DID to continue. Please visit the companion app to create a DID first.');
            setIsSnapInstalled(false);
          }
        } catch (error) {
          console.error('Error checking DID:', error);
          setStatusMessage('Error checking DID status. Please try reloading the page.');
        }
      } catch (error) {
        console.error('Error checking snap installation:', error);
        setStatusMessage('Error connecting to MetaMask.');
      }
    };

    checkSnapInstallation();
  }, []);

  // Revised to only install the snap, not create DID
  const installSnap = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage('Requesting permission to install DMV Snap...');
      
      // Request to install the snap
      await window.ethereum.request({
        method: 'wallet_requestSnaps',
        params: {
          [SNAP_ID]: {},
        },
      });
      
      // We can only check if a DID already exists after installing the snap
      // We cannot create a DID from this app due to permissions
      const didResult = await window.ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: SNAP_ID,
          request: {
            method: 'get-did',
          },
        },
      });
      
      if (didResult?.success && didResult?.did) {
        // If a DID already exists, we're good to go
        const didAddress = didResult.did.replace('did:ethr:', '');
        setDid(didAddress);
        setIsSnapInstalled(true);
        setStatusMessage('DMV Snap installed successfully. DID found!');
      } else {
        // No DID exists yet
        setStatusMessage('DMV Snap installed, but no DID was found. Please use the companion app to create a DID first.');
        // Keep the button showing "Install Snap" but we'll update the text to be clearer
        setIsSnapInstalled(false);
      }
    } catch (error) {
      console.error('Error installing snap:', error);
      setStatusMessage('Error installing DMV Snap. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

 // Updated requestCredential function with potential fixes

 const requestCredential = async () => {
  try {
    setIsProcessing(true);
    setStatusMessage('Requesting your Digital ID credential...');
    
    // Check DID format and existence
    console.log("Current DID:", did);
    
    if (!did) {
      setStatusMessage('No DID found. Please ensure you have created a DID first.');
      return;
    }
    
    // Make sure DID is properly formatted when sending to issuer
    const fullDid = did.startsWith('did:ethr:') ? did : `did:ethr:${did}`;
    console.log("Using full DID:", fullDid);
    
    // For additional debugging, check if DID exists in snap
    try {
      const didResult = await window.ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: SNAP_ID,
          request: {
            method: 'get-did',
          },
        },
      });
      
      console.log("DID from snap:", didResult);
      if (!didResult.success) {
        setStatusMessage('Error: DID not found in wallet. Please create a DID first.');
        return;
      }
      
      // Only proceed if the DIDs match
      const snapDid = didResult.did.replace('did:ethr:', '').toLowerCase();
      const currentDid = did.replace('did:ethr:', '').toLowerCase();
      
      if (snapDid !== currentDid) {
        console.warn(`DID mismatch: Current DID (${currentDid}) doesn't match snap DID (${snapDid})`);
        setStatusMessage(`Warning: Using DID from wallet instead of current DID.`);
        setDid(snapDid);
      }
    } catch (error) {
      console.error("Error checking DID:", error);
      // Continue anyway, this is just a diagnostic step
    }
    
    // Request the credential with possibly modified DID
    const issuerResponse = await fetch('http://localhost:5000/issuer/issue-vc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subjectDid: `did:ethr:${did}`,
        claim: {
          type: "TexasDriverLicense",
          issuer: "Texas A&M DMV",
          issuanceDate: new Date().toISOString(),
          licenseNumber: "DL" + Math.floor(Math.random() * 1000000).toString(),
          name: "John Doe",
          dateOfBirth: "1990-01-01",
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          permissions: ["banking", "voting", "dmv"],
          address: "123 Aggie Lane, College Station, TX"
        }
      }),
    });
    
    if (!issuerResponse.ok) {
      throw new Error('Failed to issue credential');
    }
    
    const responseData = await issuerResponse.json();
    console.log("Received VC from issuer:", responseData);
    
    const { vc } = responseData;
    
    // Try to parse the JWT to check if it's valid
    try {
      const parts = vc.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const payload = JSON.parse(atob(parts[1]));
      console.log("Decoded VC payload:", payload);
      
      // Check if the subject DID matches our DID
      if (payload.subject && payload.subject !== `did:ethr:${did}`) {
        console.warn(`Subject DID in VC (${payload.subject}) doesn't match our DID (did:ethr:${did})`);
      }
    } catch (e) {
      console.error("Error parsing JWT:", e);
      // Continue anyway, this is just diagnostic
    }
    
    console.log("Preparing to store VC in snap");
    
    // Attempt to store the VC with full parameter set
    try {
      const storeResponse = await window.ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: SNAP_ID,
          request: {
            method: 'store-vc',
            params: {
              vc,
              type: "credential-type",
              defaultName: "credential name"
            },
          },
        },
      });
      
      console.log("Store VC response:", storeResponse);
      
      if (storeResponse && storeResponse.success) {
        setCredentialIssued(true);
        setStatusMessage('Your Digital ID credential has been issued and stored in your wallet!');
      } else {
        const errorMessage = storeResponse?.message || 'Unknown error storing credential';
        setStatusMessage(`Error: ${errorMessage}`);
        console.error('Store VC error:', errorMessage);
      }
    } catch (storeError) {
      console.error("Error during store-vc:", storeError);
      setStatusMessage(`Error storing credential: ${storeError.message}`);
    }
  } catch (error) {
    console.error('Error requesting credential:', error);
    console.error('Error details:', error.stack);
    setStatusMessage('Error obtaining credential. Please try again.');
  } finally {
    setIsProcessing(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-black">Get Your Digital ID</h1>
        
        <div className="mb-6">
          <p className="mb-4 text-black">To get your Digital ID (DID) credential, you'll need to connect your MetaMask wallet and install our secure snap extension.</p>
          
          {statusMessage && (
            <div className="bg-blue-50 p-4 rounded-md mb-4">
              <p className="text-blue-800">{statusMessage}</p>
            </div>
          )}
          
          {did && (
            <div className="mb-4">
              <p className="font-semibold text-black">Your DID:</p>
              <p className="break-all bg-gray-100 p-2 rounded text-black">{`did:ethr:${did}`}</p>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          {!isSnapInstalled ? (
            <button
              onClick={installSnap}
              disabled={isProcessing}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isProcessing ? 'Installing...' : (did ? 'Check DID Status' : 'Install DMV Snap')}
            </button>
          ) : (
            <button
              onClick={requestCredential}
              disabled={isProcessing}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-green-300"
            >
              {isProcessing ? 'Processing...' : 'Request Digital ID Credential'}
            </button>
          )}
        </div>
      </div>
      <Sidebar />
    </div>
  );
};

export default CredentialPage;