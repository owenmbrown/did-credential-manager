import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Wallet, AlertCircle, QrCode, Link as LinkIcon, X } from 'lucide-react';
import { useState } from 'react';
import holderApi from '../api';
import { CredentialCard } from '../components/CredentialCard';
import { config } from '../config';

export function CredentialsView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState('');

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

  const acceptInvitation = useMutation({
    mutationFn: (url: string) => holderApi.acceptInvitation(url),
    onSuccess: (data) => {
      // Refetch credentials if it was a credential offer
      if (data.credentialOffer) {
        queryClient.invalidateQueries({ queryKey: ['credentials'] });
        setShowPasteDialog(false);
        setInvitationUrl('');
      }
      
      // Navigate to presentation builder if it's a presentation request
      if (data.presentationRequest) {
        setShowPasteDialog(false);
        setInvitationUrl('');
        navigate('/present', { state: { request: data } });
      }
    },
  });

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invitationUrl.trim()) {
      acceptInvitation.mutate(invitationUrl.trim());
    }
  };

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
          <div className="flex gap-2">
            <button
              onClick={() => setShowPasteDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              title="Paste invitation link"
            >
              <LinkIcon className="w-4 h-4" />
              Paste Link
            </button>
            <button
              onClick={() => navigate('/scan')}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              Scan
            </button>
          </div>
        </div>

        {/* Paste Dialog */}
        {showPasteDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Paste Invitation Link
                </h3>
                <button
                  onClick={() => {
                    setShowPasteDialog(false);
                    setInvitationUrl('');
                    acceptInvitation.reset();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePasteSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invitation URL
                  </label>
                  <textarea
                    value={invitationUrl}
                    onChange={(e) => setInvitationUrl(e.target.value)}
                    placeholder="Paste invitation URL or short link here&#10;Example: http://localhost:5002/invitations/abc123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    rows={4}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Paste the invitation link you received (works with QR code URLs or short links)
                  </p>
                </div>

                {acceptInvitation.isError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div className="text-sm text-red-700">
                      {acceptInvitation.error instanceof Error
                        ? acceptInvitation.error.message
                        : 'Failed to accept invitation'}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasteDialog(false);
                      setInvitationUrl('');
                      acceptInvitation.reset();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!invitationUrl.trim() || acceptInvitation.isPending}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {acceptInvitation.isPending ? 'Processing...' : 'Accept'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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

