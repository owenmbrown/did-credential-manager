import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import holderApi from '../api';
import { isValidUrl, parseOOBUrl } from '../utils';

export function ScanView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [showManual, setShowManual] = useState(false);

  const acceptInvitation = useMutation({
    mutationFn: (invitationUrl: string) => holderApi.acceptInvitation(invitationUrl),
    onSuccess: (data) => {
      // Refetch credentials if it was a credential offer
      if (data.credentialOffer) {
        queryClient.invalidateQueries({ queryKey: ['credentials'] });
      }
      
      // Navigate to presentation builder if it's a presentation request
      if (data.presentationRequest) {
        navigate('/present', { state: { request: data } });
      }
    },
  });

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScan(decodedText);
        },
        undefined
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Error starting scanner:', err);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const handleScan = async (decodedText: string) => {
    if (acceptInvitation.isPending) return;

    // Stop scanner
    await stopScanner();

    // Check if it's a valid OOB invitation URL
    if (isValidUrl(decodedText) && parseOOBUrl(decodedText)) {
      acceptInvitation.mutate(decodedText);
    } else {
      // Invalid QR code, restart scanner
      setTimeout(() => startScanner(), 2000);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualUrl && isValidUrl(manualUrl)) {
      acceptInvitation.mutate(manualUrl);
    }
  };

  return (
    <div className="min-h-full bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div>
          <h1 className="text-xl font-bold">Scan QR Code</h1>
          <p className="text-sm text-gray-400">Scan to receive credentials or requests</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Scanner */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          {/* QR Scanner */}
          <div className="relative">
            <div
              id="qr-reader"
              className="w-full aspect-square bg-black rounded-lg overflow-hidden"
            />
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-4 border-2 border-primary-500 rounded-lg">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-500 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-500 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-500 rounded-br-lg" />
                </div>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {acceptInvitation.isPending && (
            <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm">Processing invitation...</div>
            </div>
          )}

          {acceptInvitation.isSuccess && (
            <div className="bg-green-900/50 border border-green-700 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium">Invitation accepted!</div>
                <div className="text-green-300 mt-1">
                  {acceptInvitation.data.credentialOffer && 'Credential offer received'}
                  {acceptInvitation.data.presentationRequest && 'Presentation request received'}
                </div>
              </div>
            </div>
          )}

          {acceptInvitation.isError && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium">Error processing invitation</div>
                <div className="text-red-300 mt-1">
                  {acceptInvitation.error instanceof Error
                    ? acceptInvitation.error.message
                    : 'Unknown error'}
                </div>
              </div>
            </div>
          )}

          {/* Manual Entry */}
          <div className="text-center">
            <button
              onClick={() => setShowManual(!showManual)}
              className="text-sm text-gray-400 hover:text-white flex items-center gap-2 mx-auto"
            >
              <LinkIcon className="w-4 h-4" />
              Or enter URL manually
            </button>
          </div>

          {showManual && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <input
                type="url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://issuer.example.com?oob=..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="submit"
                disabled={!manualUrl || acceptInvitation.isPending}
                className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Process Invitation
              </button>
            </form>
          )}

          {/* Instructions */}
          {isScanning && !acceptInvitation.isPending && (
            <div className="text-center space-y-2">
              <Camera className="w-12 h-12 text-gray-600 mx-auto" />
              <p className="text-sm text-gray-400">
                Position the QR code within the frame
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

