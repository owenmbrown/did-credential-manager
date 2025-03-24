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

  useEffect(() => {
    const checkSnapInstallation = async () => {
      try {
        if (!window.ethereum) {
          setStatusMessage('MetaMask is not installed. Please install MetaMask to use this feature.');
          return;
        }
        
        const result = await window.ethereum.request({
          method: 'wallet_getSnaps',
        });
        
        setIsSnapInstalled(!!result[SNAP_ID]);
        if (!result[SNAP_ID]) {
          setStatusMessage('DMV Snap is not installed. Please click "Install Snap" to continue.');
        }
        
        if (result[SNAP_ID]) {
          const didResult = await window.ethereum.request({
            method: 'wallet_invokeSnap',
            params: {
              snapId: SNAP_ID,
              request: {
                method: 'get-did',
              },
            },
          });
          
          if (didResult?.did) {
            setDid(didResult.did);
          }
        }
      } catch (error) {
        console.error('Error checking snap installation:', error);
        setStatusMessage('Error connecting to MetaMask.');
      }
    };

    checkSnapInstallation();
  }, []);

  const installSnap = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage('Requesting permission to install DMV Snap...');
      
      await window.ethereum.request({
        method: 'wallet_requestSnaps',
        params: {
          [SNAP_ID]: {},
        },
      });
      
      const result = await window.ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: SNAP_ID,
          request: {
            method: 'create-did',
          },
        },
      });
      
      if (result?.did) {
        setDid(result.did);
        setIsSnapInstalled(true);
        setStatusMessage('DMV Snap installed successfully and DID created!');
      }
    } catch (error) {
      console.error('Error installing snap:', error);
      setStatusMessage('Error installing DMV Snap. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const requestCredential = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage('Requesting your Digital ID credential...');
      
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
      
      const { vc } = await issuerResponse.json();
      
      await window.ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: SNAP_ID,
          request: {
            method: 'store-vc',
            params: {
              vc,
            },
          },
        },
      });
      
      setCredentialIssued(true);
      setStatusMessage('Your Digital ID credential has been issued and stored in your wallet!');
    } catch (error) {
      console.error('Error requesting credential:', error);
      setStatusMessage('Error obtaining credential. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
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
              {isProcessing ? 'Installing...' : 'Install DMV Snap'}
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