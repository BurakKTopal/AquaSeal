import { apiClient } from './client';
import { UploadResponse } from '../../types/api';
import { MetadataInput } from '../../types/metadata';

export async function uploadFile(
  file: File,
  metadata: MetadataInput
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', metadata.user_id);
  formData.append('license', metadata.license);
  if (metadata.personal_info) {
    formData.append('personal_info', metadata.personal_info);
  }

  try {
    const response = await apiClient.post<UploadResponse>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 second timeout for large files
    });

    return response.data;
  } catch (error: any) {
    // Re-throw with more context
    if (error.response) {
      // Server responded with error
      throw new Error(error.response.data?.detail || error.response.data?.message || 'Server error');
    } else if (error.request) {
      // Request made but no response
      throw new Error('No response from server. Please check if the backend is running.');
    } else {
      // Something else happened
      throw new Error(error.message || 'Failed to upload file');
    }
  }
}

