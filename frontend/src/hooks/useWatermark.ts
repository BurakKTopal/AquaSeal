import { useState } from 'react';
import { uploadFile } from '../services/api/upload';
import { UploadResponse } from '../types/api';
import { MetadataInput } from '../types/metadata';

export function useWatermark() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const watermarkFile = async (file: File, metadata: MetadataInput) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await uploadFile(file, metadata);
      setResult(response);
      setLoading(false);
      return response;
    } catch (err: any) {
      console.error('Watermark error:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to watermark file';
      setError(errorMessage);
      setLoading(false);
      // Don't throw - let the UI handle the error state
      return null;
    }
  };

  const reset = () => {
    setLoading(false);
    setResult(null);
    setError(null);
  };

  return {
    watermarkFile,
    loading,
    result,
    error,
    reset,
  };
}

