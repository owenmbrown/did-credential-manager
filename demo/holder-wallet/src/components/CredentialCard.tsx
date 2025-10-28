import { formatDistanceToNow } from '../utils';
import { Badge, Calendar, User, CheckCircle, AlertTriangle } from 'lucide-react';
import type { Credential } from '../types';

interface CredentialCardProps {
  credential: Credential;
  onClick?: () => void;
  selected?: boolean;
}

export function CredentialCard({ credential, onClick, selected }: CredentialCardProps) {
  const { credential: vc } = credential;
  const types = (vc.type || []).filter((t) => t !== 'VerifiableCredential');
  const primaryType = types[0] || 'Credential';
  
  // Check if expired
  const isExpired = vc.expirationDate && new Date(vc.expirationDate) < new Date();
  
  // Get issuer name (simplified - in reality you'd resolve this)
  const issuerDid = typeof vc.issuer === 'string' ? vc.issuer : vc.issuer?.id || 'Unknown';
  const issuerName = issuerDid.split(':').pop()?.substring(0, 12) + '...' || 'Unknown Issuer';

  // Get primary subject data
  const subject = vc.credentialSubject || {};
  const subjectKeys = Object.keys(subject).filter(k => k !== 'id');
  const primaryData = subjectKeys.slice(0, 2);

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl p-4 border-2 transition-all cursor-pointer
        ${selected 
          ? 'border-primary-500 shadow-lg' 
          : 'border-gray-200 hover:border-primary-300 hover:shadow-md'
        }
        ${isExpired ? 'opacity-60' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Badge className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{primaryType}</h3>
            <p className="text-xs text-gray-500">
              {vc.issuanceDate ? `Issued ${formatDistanceToNow(vc.issuanceDate)}` : 'No issue date'}
            </p>
          </div>
        </div>
        {isExpired ? (
          <AlertTriangle className="w-5 h-5 text-amber-500" />
        ) : (
          <CheckCircle className="w-5 h-5 text-green-500" />
        )}
      </div>

      {/* Issuer */}
      <div className="flex items-center gap-2 mb-3 text-sm">
        <User className="w-4 h-4 text-gray-400" />
        <span className="text-gray-600">Issued by:</span>
        <span className="font-medium text-gray-900 truncate flex-1">{issuerName}</span>
      </div>

      {/* Primary Data */}
      {primaryData.length > 0 && (
        <div className="border-t border-gray-100 pt-3 space-y-1">
          {primaryData.map((key) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
              <span className="font-medium text-gray-900 truncate ml-2">
                {String(subject[key])}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Expiration */}
      {vc.expirationDate && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 text-xs">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className={isExpired ? 'text-red-600 font-medium' : 'text-gray-500'}>
            {isExpired ? 'Expired' : 'Expires'} {formatDistanceToNow(vc.expirationDate)}
          </span>
        </div>
      )}
    </div>
  );
}

