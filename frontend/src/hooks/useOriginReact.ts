import { useState } from 'react';
import { useAuthState, useAuth } from "@campnetwork/origin/react";
import { originService, MintIpNFTParams, MintResult } from '../services/camp/originService';

export function useOriginReact() {
  const { authenticated } = useAuthState();
  const auth = useAuth();
  const [minting, setMinting] = useState(false);
  const [querying, setQuerying] = useState(false);

  const mintIpNFT = async (params: MintIpNFTParams): Promise<MintResult> => {
    if (!authenticated || !auth?.origin) {
      throw new Error('User not authenticated. Please connect wallet and authenticate with Origin first.');
    }

    if (!auth.viem) {
      throw new Error('Wallet not connected to Origin. Please try disconnecting Origin and reconnecting.');
    }

    setMinting(true);
    try {
      // Use the origin instance from React hook
      const origin = auth.origin;


      // Prepare metadata for IpNFT
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

      // Upload file to IPFS if provided (optional)
      if (params.file) {
        try {
          await originService.uploadToPinata(params.file);
        } catch (error: any) {
          console.warn('[Origin] IPFS upload failed (non-critical), continuing without file URL:', error.message);
        }
      }

      // Use origin.registerIpNFT for metadata registration
      const licenseTerms = {
        price: BigInt(0), // Free
        duration: 0, // No expiration
        royaltyBps: 0, // No royalties
        paymentToken: '0x0000000000000000000000000000000000000000' as any, // Native token
      };

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

      // Wrap registerIpNFT in additional error handling to prevent crashes
      let result;
      try {
        result = await origin.registerIpNFT(
          'file', // source
          deadline,
          licenseTerms,
          metadata,
          undefined, // fileKey - would need to upload file first if using file
        );
      } catch (registerError: any) {
        throw new Error(`Failed to register NFT: ${registerError?.message || registerError}`);
      }

      return {
        success: true,
        nftId: result.tokenId?.toString() || result.id,
        tokenId: result.tokenId?.toString(),
        transactionHash: result.txHash || result.transactionHash,
        message: 'IpNFT registered successfully on CAMP network',
        data: result,
      };
    } catch (error: any) {
      console.error('[Origin] Minting error:', error);
      // Ensure error is always thrown (not swallowed) so UploadPage can catch it
      throw error;
    } finally {
      setMinting(false);
    }
  };

  const queryNFT = async (watermarkHash: string): Promise<any> => {
    setQuerying(true);
    try {
      const subgraphUrl = import.meta.env.VITE_SUBGRAPH_URL;
      if (!subgraphUrl) {
        throw new Error('Subgraph URL not configured. Please set VITE_SUBGRAPH_URL in your .env file to enable NFT queries.');
      }
      return await originService.queryNFT(watermarkHash);
    } catch (error: any) {
      console.error('[Origin] Query error:', error);
      throw error;
    } finally {
      setQuerying(false);
    }
  };

  return {
    authenticated,
    minting,
    querying,
    mintIpNFT,
    queryNFT,
    origin: auth?.origin,
    walletAddress: auth?.walletAddress,
  };
}

