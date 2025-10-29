import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Send, CheckCircle, AlertCircle } from 'lucide-react';
import holderApi from '../api';
import { CredentialCard } from '../components/CredentialCard';
import type { ParsedOOBInvitation } from '../types';

export function PresentationBuilderView() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { 
    request?: ParsedOOBInvitation; 
    selectedCredentials?: string[];
  };

  const [selectedIds, setSelectedIds] = useState<string[]>(state?.selectedCredentials || []);
  const [challenge, setChallenge] = useState('');
  const [verifierDid, setVerifierDid] = useState('');
  const [domain, setDomain] = useState('');

  const { data: credentials, isLoading } = useQuery({
    queryKey: ['credentials'],
    queryFn: () => holderApi.getCredentials(),
  });

  const createAndSendMutation = useMutation({
    mutationFn: async () => {
      // First create the presentation
      const presentation = await holderApi.createPresentation({
        credentials: selectedIds,
        challenge: challenge || undefined,
        domain: domain || undefined,
        verifierDid: verifierDid || undefined,
      });

      // Then send it if verifier DID is provided
      if (verifierDid) {
        await holderApi.sendPresentation({
          verifierDid,
          presentation,
        });
      }

      return presentation;
    },
  });

  // Pre-fill from OOB invitation if present
  useEffect(() => {
    if (state?.request) {
      const { from, presentationRequest } = state.request;
      setVerifierDid(from);
      if (presentationRequest?.challenge) {
        setChallenge(presentationRequest.challenge);
      }
      // Could also auto-select credentials based on requested types
    }
  }, [state]);

  const toggleCredential = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    
    try {
      await createAndSendMutation.mutateAsync();
      // Success - navigate back with success message
      setTimeout(() => {
        navigate('/credentials');
      }, 2000);
    } catch (error) {
      console.error('Error creating presentation:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900">Create Presentation</h1>
          <p className="text-xs text-gray-500">
            Select credentials to share with a verifier
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6 pb-32">
        {/* Verifier Info Banner */}
        {state?.request && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-blue-900 mb-1">
                  Presentation Request Received
                </div>
                <div className="text-sm text-blue-700">
                  From: <code className="text-xs">{state.request.from}</code>
                </div>
                {state.request.goal && (
                  <div className="text-sm text-blue-700 mt-1">
                    Purpose: {state.request.goal}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Verifier Details */}
        <section className="bg-white rounded-lg p-4 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900">Verifier Details</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verifier DID {verifierDid && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={verifierDid}
              onChange={(e) => setVerifierDid(e.target.value)}
              placeholder="did:peer:..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-mono"
              readOnly={!!state?.request}
            />
            <p className="text-xs text-gray-500 mt-1">
              Required to send the presentation
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Challenge (Optional)
            </label>
            <input
              type="text"
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              placeholder="Challenge from verifier"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-mono"
              readOnly={!!state?.request?.presentationRequest?.challenge}
            />
            <p className="text-xs text-gray-500 mt-1">
              Prevents replay attacks
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Domain (Optional)
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Domain for which this presentation is valid
            </p>
          </div>
        </section>

        {/* Credential Selection */}
        <section className="space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">
              Select Credentials ({selectedIds.length} selected)
            </h2>
            <p className="text-sm text-gray-500">
              Choose which credentials to include in the presentation
            </p>
          </div>

          {(!credentials || credentials.length === 0) && (
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <p className="text-gray-500">No credentials available</p>
              <button
                type="button"
                onClick={() => navigate('/scan')}
                className="mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Scan to add credentials
              </button>
            </div>
          )}

          {credentials && credentials.length > 0 && (
            <div className="space-y-3">
              {credentials.map((cred) => (
                <div
                  key={cred.id}
                  onClick={() => toggleCredential(cred.id)}
                  className="cursor-pointer"
                >
                  <CredentialCard
                    credential={cred}
                    selected={selectedIds.includes(cred.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Status Messages */}
        {createAndSendMutation.isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-green-900">Presentation sent successfully!</div>
              <div className="text-green-700 mt-1">
                {verifierDid 
                  ? 'The verifier has received your presentation.' 
                  : 'Presentation created. You can now send it manually.'
                }
              </div>
            </div>
          </div>
        )}

        {createAndSendMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-red-900">Error creating presentation</div>
              <div className="text-red-700 mt-1">
                {createAndSendMutation.error instanceof Error
                  ? createAndSendMutation.error.message
                  : 'Unknown error occurred'}
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Fixed Bottom Button Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={
            selectedIds.length === 0 ||
            createAndSendMutation.isPending ||
            createAndSendMutation.isSuccess
          }
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-base shadow-md active:scale-95"
        >
          {createAndSendMutation.isPending ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {verifierDid ? 'Creating & Sending...' : 'Creating...'}
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              {verifierDid ? 'Create & Send Presentation' : 'Create Presentation'}
            </>
          )}
        </button>

        {selectedIds.length === 0 && (
          <p className="text-sm text-center text-gray-500 mt-2">
            Please select at least one credential
          </p>
        )}
      </div>
    </div>
  );
}

