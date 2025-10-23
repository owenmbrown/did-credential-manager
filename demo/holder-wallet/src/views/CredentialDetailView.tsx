import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, Share2, User, Calendar, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import holderApi from '../api';
import { formatDate } from '../utils';
import { useState } from 'react';

export function CredentialDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: credential, isLoading, error } = useQuery({
    queryKey: ['credentials', id],
    queryFn: () => holderApi.getCredential(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => holderApi.deleteCredential(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      navigate('/credentials');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !credential) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Credential not found</h2>
          <button
            onClick={() => navigate('/credentials')}
            className="text-primary-600 hover:text-primary-700"
          >
            Go back to credentials
          </button>
        </div>
      </div>
    );
  }

  const { credential: vc } = credential;
  const types = vc.type.filter((t) => t !== 'VerifiableCredential');
  const isExpired = vc.expirationDate && new Date(vc.expirationDate) < new Date();
  const issuerDid = typeof vc.issuer === 'string' ? vc.issuer : vc.issuer?.id || 'Unknown';
  const subject = vc.credentialSubject;
  const subjectKeys = Object.keys(subject).filter(k => k !== 'id');

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
        <h1 className="text-lg font-semibold text-gray-900 flex-1">Credential Details</h1>
        <button
          onClick={() => navigate('/present', { state: { selectedCredentials: [id] } })}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-primary-600"
          title="Share this credential"
        >
          <Share2 className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-600"
          title="Delete this credential"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Banner */}
        <div className={`rounded-lg p-4 flex items-center gap-3 ${
          isExpired 
            ? 'bg-red-50 border border-red-200' 
            : 'bg-green-50 border border-green-200'
        }`}>
          {isExpired ? (
            <>
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <div className="font-medium text-red-900">Expired Credential</div>
                <div className="text-sm text-red-700">
                  This credential expired on {formatDate(vc.expirationDate!)}
                </div>
              </div>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <div className="font-medium text-green-900">Valid Credential</div>
                <div className="text-sm text-green-700">
                  {vc.expirationDate 
                    ? `Valid until ${formatDate(vc.expirationDate)}`
                    : 'No expiration date'
                  }
                </div>
              </div>
            </>
          )}
        </div>

        {/* Type */}
        <section className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500 mb-2">Credential Type</h2>
          <div className="flex flex-wrap gap-2">
            {types.map((type) => (
              <span
                key={type}
                className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
              >
                {type}
              </span>
            ))}
          </div>
        </section>

        {/* Issuer */}
        <section className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-5 h-5 text-gray-400" />
            <h2 className="text-sm font-medium text-gray-500">Issued By</h2>
          </div>
          <code className="text-sm font-mono bg-gray-50 px-3 py-2 rounded border border-gray-200 block break-all">
            {issuerDid}
          </code>
        </section>

        {/* Dates */}
        <section className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <h2 className="text-sm font-medium text-gray-500">Dates</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Issued</span>
              <span className="font-medium text-gray-900">{formatDate(vc.issuanceDate)}</span>
            </div>
            {vc.expirationDate && (
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Expires</span>
                <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatDate(vc.expirationDate)}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Subject Data */}
        <section className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-gray-400" />
            <h2 className="text-sm font-medium text-gray-500">Credential Data</h2>
          </div>
          <div className="space-y-2">
            <div className="text-sm py-2 border-b border-gray-100">
              <div className="text-gray-500 mb-1">Subject ID</div>
              <code className="text-xs font-mono bg-gray-50 px-2 py-1 rounded block break-all">
                {subject.id}
              </code>
            </div>
            {subjectKeys.map((key) => (
              <div key={key} className="text-sm py-2 border-b border-gray-100 last:border-0">
                <div className="text-gray-500 mb-1 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div className="font-medium text-gray-900">
                  {typeof subject[key] === 'object' 
                    ? JSON.stringify(subject[key], null, 2)
                    : String(subject[key])
                  }
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Raw Data (Collapsible) */}
        <details className="bg-white rounded-lg shadow-sm">
          <summary className="p-4 cursor-pointer hover:bg-gray-50 text-sm font-medium text-gray-700">
            View Raw Credential Data
          </summary>
          <pre className="p-4 text-xs font-mono bg-gray-900 text-gray-100 overflow-x-auto rounded-b-lg">
            {JSON.stringify(vc, null, 2)}
          </pre>
        </details>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Credential?
              </h3>
              <p className="text-sm text-gray-500">
                This action cannot be undone. You'll need to request this credential again if you delete it.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

