export interface UploadResponse {
  success: boolean;
  message: string;
  watermarked_file_url?: string;
  watermark_hash?: string;
  nft_id?: string;
}

export interface VerificationResponse {
  verified: boolean;
  watermark_found: boolean;
  watermark_hash?: string;
  match: boolean;
  nft_metadata?: any;
  payload?: {
    user_id: string;
    timestamp: number;
    metadata_hash: string;
    content_hash: string;
    license: string;
  };
  debug_info?: string[];
  message: string;
}

