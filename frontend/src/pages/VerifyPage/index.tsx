import React from 'react';
import VerificationForm from '../../components/verification/VerificationForm';
import VerificationResult from '../../components/verification/VerificationResult';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useVerification } from '../../hooks/useVerification';
import styles from './VerifyPage.module.css';

const VerifyPage: React.FC = () => {
  const { file, fileType, preview, error: fileError, handleFileSelect, clearFile } = useFileUpload();
  const { verify, loading, result, error: verifyError, reset: resetVerification } = useVerification();

  const handleVerify = async () => {
    if (!file) return;
    try {
      await verify(file);
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleReset = () => {
    clearFile();
    resetVerification();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Verify Watermark</h1>
        <p className={styles.subtitle}>
          Upload a file to verify its watermark authenticity
        </p>
      </div>

      {!result ? (
        <div className={styles.verifyFlow}>
          <VerificationForm
            onFileSelect={handleFileSelect}
            onVerify={handleVerify}
            fileType={fileType}
            preview={preview}
            error={fileError}
            loading={loading}
            onClear={clearFile}
            file={file}
          />
          {verifyError && (
            <div className={styles.error}>{verifyError}</div>
          )}
        </div>
      ) : (
        <VerificationResult result={result} onReset={handleReset} />
      )}
    </div>
  );
};

export default VerifyPage;
