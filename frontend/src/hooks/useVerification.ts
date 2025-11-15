import { useState } from 'react';
import { verifyFile } from '../services/api/verify';
import { VerificationResponse } from '../types/api';

export function useVerification() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await verifyFile(file);
      setResult(response);
      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to verify file';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setResult(null);
    setError(null);
  };

  return {
    verify,
    loading,
    result,
    error,
    reset,
  };
}

