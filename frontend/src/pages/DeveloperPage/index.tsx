import React, { useState } from 'react';
import { useOriginReact } from '../../hooks/useOriginReact';
import styles from './DeveloperPage.module.css';

const DeveloperPage: React.FC = () => {
  const {
    authenticated,
    minting,
    querying,
    mintIpNFT,
    queryNFT
  } = useOriginReact();

  const [formData, setFormData] = useState({
    watermarkHash: '',
    userId: 'test_user_123',
    contentType: 'image/png',
    license: 'CC-BY-4.0',
    personalInfo: 'Test personal info',
  });

  const [mintResult, setMintResult] = useState<any>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [queryHash, setQueryHash] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const generateTestHash = () => {
    const randomHash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    setFormData(prev => ({ ...prev, watermarkHash: randomHash }));
  };

  const handleMint = async () => {
    if (!formData.watermarkHash) {
      setMintError('Please enter a watermark hash');
      return;
    }

    setMintResult(null);
    setMintError(null);

    try {
      const result = await mintIpNFT({
        watermarkHash: formData.watermarkHash,
        userId: formData.userId,
        timestamp: Date.now(),
        contentType: formData.contentType,
        license: formData.license,
        file: selectedFile || undefined,
        additionalMetadata: {
          personal_info: formData.personalInfo,
        },
      });

      setMintResult(result);
    } catch (err: any) {
      setMintError(err.message || 'Failed to mint NFT');
    }
  };

  const handleQuery = async () => {
    if (!queryHash.trim()) {
      setQueryError('Please enter a watermark hash to query');
      return;
    }

    setQueryResult(null);
    setQueryError(null);

    try {
      const result = await queryNFT(queryHash.trim());
      setQueryResult(result);
    } catch (err: any) {
      setQueryError(err.message || 'Failed to query NFT');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Developer Tools</h1>
        <p className={styles.subtitle}>
          Test NFT minting and querying functionality
        </p>
      </div>

      {!authenticated && (
        <div className={styles.warning}>
          Connect your wallet and authenticate to use developer tools
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2>Mint Test NFT</h2>
          
          <div className={styles.formGroup}>
            <label>Watermark Hash *</label>
            <div className={styles.inputGroup}>
              <input
                type="text"
                name="watermarkHash"
                value={formData.watermarkHash}
                onChange={handleInputChange}
                placeholder="Enter watermark hash (64 hex characters)"
                className={styles.input}
                disabled={minting}
              />
              <button
                type="button"
                onClick={generateTestHash}
                className={styles.btnSecondary}
                disabled={minting}
              >
                Generate
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>User ID</label>
            <input
              type="text"
              name="userId"
              value={formData.userId}
              onChange={handleInputChange}
              className={styles.input}
              disabled={minting}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Content Type</label>
            <select
              name="contentType"
              value={formData.contentType}
              onChange={handleInputChange}
              className={styles.input}
              disabled={minting}
            >
              <option value="image/png">image/png</option>
              <option value="image/jpeg">image/jpeg</option>
              <option value="audio/mpeg">audio/mpeg</option>
              <option value="audio/wav">audio/wav</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>License</label>
            <input
              type="text"
              name="license"
              value={formData.license}
              onChange={handleInputChange}
              className={styles.input}
              disabled={minting}
            />
          </div>

          <div className={styles.formGroup}>
            <label>File (Optional)</label>
            <input
              type="file"
              onChange={handleFileChange}
              className={styles.input}
              disabled={minting}
            />
            {selectedFile && (
              <p className={styles.fileInfo}>
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <button
            onClick={handleMint}
            className={styles.btnPrimary}
            disabled={minting || !authenticated || !formData.watermarkHash}
          >
            {minting ? 'Minting...' : 'Mint NFT'}
          </button>

          {mintError && (
            <div className={styles.error}>{mintError}</div>
          )}

          {mintResult && (
            <div className={styles.result}>
              <h3>{mintResult.success ? '✓ Success' : '✗ Failed'}</h3>
              <pre>{JSON.stringify(mintResult, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className={styles.card}>
          <h2>Query NFT</h2>
          
          <div className={styles.formGroup}>
            <label>Watermark Hash *</label>
            <input
              type="text"
              value={queryHash}
              onChange={(e) => setQueryHash(e.target.value)}
              placeholder="Enter watermark hash to query"
              className={styles.input}
              disabled={querying}
            />
          </div>

          <button
            onClick={handleQuery}
            className={styles.btnPrimary}
            disabled={querying || !queryHash.trim()}
          >
            {querying ? 'Querying...' : 'Query'}
          </button>

          {queryError && (
            <div className={styles.error}>{queryError}</div>
          )}

          {queryResult && (
            <div className={styles.result}>
              <h3>Result</h3>
              <pre>{JSON.stringify(queryResult, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeveloperPage;

