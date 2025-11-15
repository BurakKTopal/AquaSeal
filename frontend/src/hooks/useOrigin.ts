import { useState, useEffect } from 'react';
import { originService, MintIpNFTParams, MintResult } from '../services/camp/originService';

const ORIGIN_API = import.meta.env.VITE_ORIGIN_API || '';
const ORIGIN_CLIENT_ID = import.meta.env.VITE_ORIGIN_CLIENT_ID || '';
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const SUBGRAPH_URL = import.meta.env.VITE_SUBGRAPH_URL;

export function useOrigin() {
  const [initialized, setInitialized] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      setInitializing(true);
      try {
        await originService.initialize({
          originApi: ORIGIN_API,
          originClientId: ORIGIN_CLIENT_ID,
          pinataJwt: PINATA_JWT,
          subgraphUrl: SUBGRAPH_URL,
        });
        setInitialized(true);
        setAuthenticated(originService.getAuthenticated());
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Origin initialization error:', err);
      } finally {
        setInitializing(false);
      }
    };

    init();
  }, []);

  const authenticate = async (): Promise<void> => {
    if (!initialized) {
      throw new Error('Origin SDK not initialized');
    }

    setAuthenticating(true);
    setError(null);
    try {
      await originService.authenticate();
      setAuthenticated(true);
    } catch (err: any) {
      const errorMessage = err.message || 'Authentication failed';
      setError(errorMessage);
      throw err;
    } finally {
      setAuthenticating(false);
    }
  };

  const mintIpNFT = async (params: MintIpNFTParams): Promise<MintResult> => {
    if (!initialized) {
      throw new Error('Origin SDK not initialized');
    }

    if (!authenticated) {
      throw new Error('User not authenticated. Call authenticate() first to connect wallet.');
    }

    setError(null);
    const result = await originService.mintIpNFT(params);
    return result;
  };

  const queryNFT = async (watermarkHash: string) => {
    if (!initialized) {
      throw new Error('Origin SDK not initialized');
    }

    try {
      setError(null);
      return await originService.queryNFT(watermarkHash);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to query NFT';
      setError(errorMessage);
      throw err;
    }
  };

  return {
    initialized,
    initializing,
    authenticated,
    authenticating,
    error,
    authenticate,
    mintIpNFT,
    queryNFT,
  };
}

