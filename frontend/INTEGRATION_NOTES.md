# Origin-App Integration Notes

## Fixed Issues

### 1. Buffer Polyfill
- Added `vite-plugin-node-polyfills` to handle buffer module in browser
- Updated `vite.config.ts` to include buffer polyfill

### 2. Para API Key
- Made Para API key optional (empty string fallback)
- Para SDK will show errors in console but won't break functionality
- External wallet connection works without Para API key

### 3. Signature Error ("Failed to get signature")
- Added check for `auth.viem` before minting
- This ensures the wallet provider is properly connected to Origin
- If `auth.viem` is not available, user needs to reconnect

### 4. Subgraph URL
- Made subgraph URL check more explicit with better error message
- Query functionality requires `VITE_SUBGRAPH_URL` to be set

## Remaining Considerations

### Signature Error Troubleshooting
If you still see "Failed to get signature" errors:

1. **Ensure wallet is unlocked** - The wallet must be unlocked to sign transactions
2. **Check provider connection** - Make sure the provider is properly set on the auth instance
3. **Verify wallet address match** - The Para wallet address should match the Origin wallet address
4. **Try reconnecting** - Disconnect and reconnect both Para wallet and Origin authentication

### Environment Variables

Required:
- `VITE_ORIGIN_CLIENT_ID` - CAMP Origin client ID (required)

Optional but recommended:
- `VITE_PARA_API_KEY` - Para API key (optional, only for on-ramp features)
- `VITE_WALLETCONNECT_PROJECT_ID` - WalletConnect project ID (has default)
- `VITE_SUBGRAPH_URL` - Subgraph URL for NFT queries
- `VITE_PINATA_JWT` - Pinata JWT for IPFS uploads

### React Router Warnings
The React Router future flag warnings are informational and can be addressed later by updating React Router configuration.

