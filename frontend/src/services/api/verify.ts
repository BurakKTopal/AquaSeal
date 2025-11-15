import { apiClient } from './client';
import { VerificationResponse } from '../../types/api';

export async function verifyFile(file: File): Promise<VerificationResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<VerificationResponse>('/verify', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

