import React from 'react';
import ImageUpload from '../../upload/ImageUpload';
import styles from './VerificationForm.module.css';
import { FileType } from '../../../types/file';

interface VerificationFormProps {
  onFileSelect: (file: File) => void;
  onVerify: () => void;
  fileType?: FileType | null;
  preview?: string | null;
  error?: string | null;
  loading?: boolean;
  onClear?: () => void;
  file?: File | null;
}

const VerificationForm: React.FC<VerificationFormProps> = ({
  onFileSelect,
  onVerify,
  fileType,
  preview,
  error,
  loading,
  onClear,
  file,
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Upload File to Verify</h2>
        <p className={styles.description}>
          Upload a file to check if it contains a watermark registered on the CAMP network.
        </p>

        <ImageUpload
          onFileSelect={onFileSelect}
          fileType={fileType}
          preview={preview}
          error={error}
          onClear={onClear}
          file={file}
        />

        <div className={styles.actions}>
          <button
            onClick={onVerify}
            disabled={!fileType || loading}
            className={styles.verifyBtn}
          >
            {loading ? 'Verifying...' : 'Verify Watermark'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationForm;
