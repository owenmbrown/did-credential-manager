import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Check, User, Info, Shield } from 'lucide-react';
import holderApi from '../api';
import { config } from '../config';
import { truncateDid, copyToClipboard } from '../utils';

export function SettingsView() {
  const [copiedDid, setCopiedDid] = useState(false);

  const { data: did } = useQuery({
    queryKey: ['did'],
    queryFn: () => holderApi.getDid(),
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => holderApi.health(),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const handleCopyDid = async () => {
    if (did && await copyToClipboard(did)) {
      setCopiedDid(true);
      setTimeout(() => setCopiedDid(false), 2000);
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Identity Section */}
        <section className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-100 rounded-lg">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Your Identity</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500">Decentralized Identifier (DID)</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 text-sm font-mono bg-gray-50 px-3 py-2 rounded border border-gray-200">
                  {did ? truncateDid(did, 24, 12) : 'Loading...'}
                </code>
                <button
                  onClick={handleCopyDid}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Copy full DID"
                >
                  {copiedDid ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {health && (
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div>
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="text-sm font-medium text-green-600 capitalize">
                    {health.status}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Credentials</div>
                  <div className="text-sm font-medium text-gray-900">
                    {health.credentialCount}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* App Info Section */}
        <section className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">App Information</h2>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">App Name</span>
              <span className="font-medium text-gray-900">{config.appName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Version</span>
              <span className="font-medium text-gray-900">{config.appVersion}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Backend</span>
              <span className="font-medium text-gray-900 font-mono text-xs">
                {config.apiUrl}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">DID Method</span>
              <span className="font-medium text-gray-900">did:peer:4</span>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Privacy & Security</h2>
          </div>

          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Your credentials are stored locally on your device</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>All communications are encrypted using DIDComm v2.1</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>No centralized servers store your data</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>You control what information to share</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-4">
          <p>DID Education Toolkit</p>
          <p className="mt-1">Fully Decentralized • Privacy-First • Open Source</p>
        </div>
      </div>
    </div>
  );
}

