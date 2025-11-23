/**
 * CAMP Origin SDK Integration Service
 * Handles IpNFT minting with watermark hash as metadata
 */

export interface OriginConfig {
  originApi: string;
  originClientId: string;
  pinataJwt?: string;
  subgraphUrl?: string;
}

export interface MintIpNFTParams {
  watermarkHash: string;
  userId: string;
  timestamp: number;
  contentType: string;
  license: string;
  file?: File;
  additionalMetadata?: Record<string, any>;
}

export interface MintResult {
  success: boolean;
  nftId?: string;
  tokenId?: string;
  transactionHash?: string;
  message: string;
  data?: any;
}

class OriginService {
  private config: OriginConfig | null = null;
  private sdk: any = null;
  private isAuthenticated: boolean = false;

  async initialize(config: OriginConfig): Promise<void> {
    this.config = config;

    const originModule: any = await import('@campnetwork/origin');
    const { Auth } = originModule;

    if (!Auth || typeof Auth !== 'function') {
      throw new Error(`Auth is not a constructor function. Found: ${typeof Auth}, value: ${Auth}`);
    }

    if (!config.originClientId) {
      throw new Error('VITE_ORIGIN_CLIENT_ID is required. Please set it in your .env file.');
    }

    const authConfig: any = {
      clientId: config.originClientId,
      redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
      environment: 'DEVELOPMENT',
    };

    try {
      this.sdk = new Auth(authConfig);
    } catch (error: any) {
      console.error('[Origin] Auth instance creation failed:', error);
      throw error;
    }

    try {
      await this.sdk.recoverProvider();
      if (this.sdk.origin) {
        this.isAuthenticated = true;
      }
    } catch (error) {
      // No previous authentication found
    }
  }

  async authenticate(): Promise<void> {
    if (!this.sdk) {
      throw new Error('Origin SDK not initialized. Call initialize() first.');
    }

    try {
      await this.sdk.recoverProvider();
      if (this.sdk.origin) {
        this.isAuthenticated = true;
        return;
      }
    } catch (error) {
      // No previous provider found
    }

    const hasEthereum = typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined';

    if (!hasEthereum) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('No wallet provider found. Please install MetaMask or another Web3 wallet and refresh the page.'));
        }, 5000);

        this.sdk.on('providers', (providers: any[]) => {
          clearTimeout(timeout);

          if (providers.length === 0) {
            reject(new Error('No wallet providers detected. Please install MetaMask or another Web3 wallet.'));
            return;
          }

          const selectedProvider = providers[0];

          try {
            this.sdk.setProvider(selectedProvider);
          } catch (error: any) {
            console.error('[Origin] setProvider() failed:', error);
            reject(error);
            return;
          }

          this.sdk.connect()
            .then((result: any) => {
              if (result && result.success && this.sdk.origin) {
                this.isAuthenticated = true;
                resolve();
              } else {
                const errorMsg = result?.message || result?.error || 'Authentication failed';
                this.handleAuthError(errorMsg, reject);
              }
            })
            .catch((error: any) => {
              this.handleAuthError(error?.message || error?.toString() || 'Authentication failed', reject);
            });
        });

        if (typeof window !== 'undefined' && (window as any).ethereum) {
          clearTimeout(timeout);
          this.sdk.off('providers');

          this.sdk.setProvider({
            provider: (window as any).ethereum,
            info: { name: 'MetaMask', rdns: 'io.metamask' },
          });

          this.sdk.connect()
            .then((result: any) => {
              if (result && result.success && this.sdk.origin) {
                this.isAuthenticated = true;
                resolve();
              } else {
                const errorMsg = result?.message || result?.error || 'Authentication failed';
                this.handleAuthError(errorMsg, reject);
              }
            })
            .catch((error: any) => {
              this.handleAuthError(error?.message || error?.toString() || 'Authentication failed', reject);
            });
        }
      });
    } else {
      try {
        this.sdk.setProvider({
          provider: (window as any).ethereum,
          info: { name: 'MetaMask', rdns: 'io.metamask' },
        });
      } catch (error: any) {
        console.error('[Origin] setProvider() failed:', error);
        throw error;
      }

      let result;
      try {
        result = await this.sdk.connect();
      } catch (connectError: any) {
        const errorMsg = connectError?.message || connectError?.toString() || 'Authentication failed';
        if (this.isUnauthorizedError(errorMsg)) {
          throw new Error(
            `Unauthorized: ${errorMsg}\n\n` +
            `Troubleshooting steps:\n` +
            `1. Check your .env file has correct values:\n` +
            `   VITE_ORIGIN_CLIENT_ID=${this.config?.originClientId ? 'Set' : 'MISSING'}\n` +
            `2. Make sure you're using the correct Client ID from CAMP\n` +
            `3. Restart the dev server after changing .env file`
          );
        }
        throw new Error(`Authentication failed: ${errorMsg}. Make sure your wallet is unlocked and connected.`);
      }

      if (result && result.success && this.sdk.origin) {
        this.isAuthenticated = true;
      } else {
        const errorMsg = result?.message || result?.error || 'Authentication failed';
        if (this.isUnauthorizedError(errorMsg)) {
          throw new Error(
            `Unauthorized: ${errorMsg}\n\n` +
            `Troubleshooting steps:\n` +
            `1. Check your .env file has correct values:\n` +
            `   VITE_ORIGIN_CLIENT_ID=${this.config?.originClientId ? 'Set' : 'MISSING'}\n` +
            `2. Make sure you're using the correct Client ID from CAMP\n` +
            `3. Restart the dev server after changing .env file`
          );
        }
        throw new Error(`${errorMsg}. Make sure your wallet is unlocked and connected.`);
      }
    }
  }

  private handleAuthError(errorMsg: string, reject: (error: Error) => void): void {
    if (this.isUnauthorizedError(errorMsg)) {
      reject(new Error(
        `Unauthorized: ${errorMsg}\n\n` +
        `Troubleshooting steps:\n` +
        `1. Check your .env file has correct values:\n` +
        `   VITE_ORIGIN_CLIENT_ID=${this.config?.originClientId ? 'Set' : 'MISSING'}\n` +
        `2. Make sure you're using the correct Client ID from CAMP\n` +
        `3. Restart the dev server after changing .env file`
      ));
    } else {
      reject(new Error(errorMsg));
    }
  }

  private isUnauthorizedError(errorMsg: string): boolean {
    return errorMsg.toLowerCase().includes('unauthorized') ||
      errorMsg.toLowerCase().includes('401') ||
      errorMsg.toLowerCase().includes('403') ||
      errorMsg.toLowerCase().includes('invalid') ||
      errorMsg.toLowerCase().includes('api key') ||
      errorMsg.toLowerCase().includes('client id');
  }

  getAuthenticated(): boolean {
    return this.isAuthenticated && !!this.sdk?.origin;
  }

  async mintIpNFT(params: MintIpNFTParams): Promise<MintResult> {
    if (!this.config) {
      throw new Error('Origin SDK not initialized. Call initialize() first.');
    }

    const metadata = {
      name: `Watermarked ${params.contentType} - ${params.userId}`,
      description: `Watermarked content with hash: ${params.watermarkHash}`,
      watermark_hash: params.watermarkHash,
      user_id: params.userId,
      timestamp: params.timestamp,
      content_type: params.contentType,
      license: params.license,
      ...params.additionalMetadata,
    };

    if (params.file) {
      try {
        await this.uploadToPinata(params.file);
      } catch (error: any) {
        console.warn('[Origin] IPFS upload failed (non-critical):', error.message);
      }
    }

    if (!this.sdk) {
      throw new Error('Origin SDK not initialized. Call initialize() first.');
    }

    if (!this.sdk.origin) {
      throw new Error('User not authenticated. Call authenticate() first to connect wallet and authenticate.');
    }

    const origin = this.sdk.origin;

    const licenseTerms = {
      price: BigInt(0),
      duration: 0,
      royaltyBps: 0,
      paymentToken: '0x0000000000000000000000000000000000000000' as any,
    };

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const result = await origin.registerIpNFT(
      'file',
      deadline,
      licenseTerms,
      metadata,
      undefined,
    );

    return {
      success: true,
      nftId: result.tokenId?.toString() || result.id,
      tokenId: result.tokenId?.toString(),
      transactionHash: result.txHash || result.transactionHash,
      message: 'IpNFT registered successfully on CAMP network',
      data: result,
    };
  }

  async uploadToPinata(file: File): Promise<string | null> {
    if (!this.config?.pinataJwt) {
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);

    const metadata = JSON.stringify({
      name: file.name,
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', options);

    try {
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.pinataJwt}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Pinata upload failed: ${response.status} ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage += ` - ${errorData.error || errorData.message || errorText}`;
        } catch {
          errorMessage += ` - ${errorText.substring(0, 200)}`;
        }

        console.warn('[Pinata] Upload failed (non-critical):', errorMessage);
        return null;
      }

      const data = await response.json();

      if (!data.IpfsHash) {
        console.warn('[Pinata] Response missing IpfsHash');
        return null;
      }

      return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
    } catch (error: any) {
      console.warn('[Pinata] Upload error (ignored):', error.message);
      return null;
    }
  }

  async queryNFT(watermarkHash: string): Promise<any> {
    if (!this.config?.subgraphUrl) {
      throw new Error('Subgraph URL not configured');
    }

    const query = `
      query GetNFTByWatermarkHash($hash: String!) {
        nfts(where: { watermark_hash: $hash }) {
          id
          tokenId
          owner
          watermark_hash
          metadata
        }
      }
    `;

    try {
      const response = await fetch(this.config.subgraphUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { hash: watermarkHash },
        }),
      });

      if (!response.ok) {
        throw new Error(`Subgraph query failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error: any) {
      console.error('Subgraph query error:', error);
      throw new Error(`Failed to query subgraph: ${error.message}`);
    }
  }
}

export const originService = new OriginService();
