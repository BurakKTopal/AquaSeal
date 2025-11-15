import { apiClient } from './client';

export async function extractWatermark(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/extract', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

