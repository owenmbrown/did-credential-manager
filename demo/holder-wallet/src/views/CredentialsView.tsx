import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Wallet, AlertCircle, QrCode } from 'lucide-react';
import holderApi from '../api';
import { CredentialCard } from '../components/CredentialCard';
import { config } from '../config';

export function CredentialsView() {
  const navigate = useNavigate();

  const { data: did, isLoading: didLoading } = useQuery({
    queryKey: ['did'],
    queryFn: () => holderApi.getDid(),
  });

  const {
    data: credentials,
    isLoading: credsLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['credentials'],
    queryFn: () => holderApi.getCredentials(),
  });

  const isLoading = didLoading || credsLoading;

  return (
    <div className="min-h-full bg-gradient-to-b from-primary-50 to-gray-50">
      {/* Header */}
      <div className="bg-primary-600 text-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">{config.appName}</h1>
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-primary-700 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {did && (
          <div className="text-primary-100 text-sm font-mono">
            <div className="text-xs opacity-75 mb-1">Your DID</div>
            <div className="truncate">{did}</div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            My Credentials ({credentials?.length || 0})
          </h2>
          <button
            onClick={() => navigate('/scan')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-red-900">Error loading credentials</div>
              <div className="text-sm text-red-700 mt-1">
                {error instanceof Error ? error.message : 'Unknown error occurred'}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 bg-white rounded-lg animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && credentials?.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Wallet className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No credentials yet
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Scan a QR code or request credentials from an issuer to get started
            </p>
            <button
              onClick={() => navigate('/scan')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <QrCode className="w-5 h-5" />
              Scan QR Code
            </button>
          </div>
        )}

        {/* Credentials List */}
        {!isLoading && !error && credentials && credentials.length > 0 && (
          <div className="space-y-4">
            {credentials.map((cred) => (
              <CredentialCard
                key={cred.id}
                credential={cred}
                onClick={() => navigate(`/credentials/${cred.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

