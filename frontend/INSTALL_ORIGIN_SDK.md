# Installing Origin SDK

The Origin SDK is not available on npm, so it needs to be installed from GitHub.

## Installation Steps

1. Install the Origin SDK from GitHub:
   ```bash
   npm install github:campaign-layer/origin-sdk
   ```

2. After installation, update `frontend/src/services/camp/originService.ts`:
   - Uncomment the import statement at the top
   - Uncomment the SDK initialization code in the `initialize()` method
   - Update the `mintIpNFT()` method to use the actual SDK instead of mock

## Alternative: Manual Installation

If the GitHub installation doesn't work, you can:

1. Clone the repository:
   ```bash
   git clone https://github.com/campaign-layer/origin-sdk.git
   cd origin-sdk
   npm install
   npm run build
   ```

2. Then link it to your project:
   ```bash
   npm link
   cd ../frontend
   npm link @campaign-layer/origin-sdk
   ```

## Current Status

The application works in mock mode without the Origin SDK installed. The watermarking functionality is fully operational, and IpNFT minting will work once the SDK is properly installed and configured.

