/**
 * API service for communicating with the Holder backend
 */

import axios from 'axios';
import { config } from './config';
import type {
  Credential,
  VerifiablePresentation,
  ParsedOOBInvitation,
} from './types';

const api = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const holderApi = {
  /**
   * Get the holder's DID
   */
  async getDid(): Promise<string> {
    const response = await api.get('/did');
    return response.data.did;
  },

  /**
   * Health check
   */
  async health(): Promise<{ status: string; credentialCount: number }> {
    const response = await api.get('/health');
    return response.data;
  },

  /**
   * Get all credentials
   */
  async getCredentials(): Promise<Credential[]> {
    const response = await api.get('/credentials');
    return response.data.credentials || [];
  },

  /**
   * Get a specific credential by ID
   */
  async getCredential(id: string): Promise<Credential> {
    const response = await api.get(`/credentials/${id}`);
    return response.data;
  },

  /**
   * Store a credential manually
   */
  async storeCredential(credential: any): Promise<void> {
    await api.post('/credentials', { credential });
  },

  /**
   * Delete a credential
   */
  async deleteCredential(id: string): Promise<void> {
    await api.delete(`/credentials/${id}`);
  },

  /**
   * Accept an OOB invitation
   */
  async acceptInvitation(invitationUrl: string): Promise<ParsedOOBInvitation> {
    const response = await api.post('/invitations/accept', { invitationUrl });
    return response.data;
  },

  /**
   * Request a credential from an issuer
   */
  async requestCredential(params: {
    issuerDid: string;
    credentialType: string[];
    claims?: Record<string, any>;
  }): Promise<void> {
    await api.post('/credentials/request', params);
  },

  /**
   * Create a verifiable presentation
   */
  async createPresentation(params: {
    credentials: string[]; // Array of credential IDs
    challenge?: string;
    domain?: string;
    verifierDid?: string;
  }): Promise<VerifiablePresentation> {
    const response = await api.post('/presentations/create', params);
    return response.data.presentation;
  },

  /**
   * Send a presentation to a verifier
   */
  async sendPresentation(params: {
    verifierDid: string;
    presentation: VerifiablePresentation;
    threadId?: string;
  }): Promise<void> {
    await api.post('/presentations/send', params);
  },

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    failed: number;
  }> {
    const response = await api.get('/queue/stats');
    return response.data;
  },
};

export default holderApi;

