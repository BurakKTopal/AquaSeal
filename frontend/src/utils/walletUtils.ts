export const generateProvider = async (account: any) => {
  if (!account || !account.connector) return null;

  // Safely get provider - handle different connector structures
  // In production builds, connector.getProvider might not exist or be structured differently
  let prov = null;
  try {
    // Check if getProvider method exists before calling it
    if (typeof account.connector.getProvider === 'function') {
      prov = await account.connector.getProvider();
    } else if (account.connector.provider) {
      // Fallback: use provider directly if available
      prov = account.connector.provider;
    } else if (account.connector.getAccount && typeof account.connector.getAccount === 'function') {
      // Alternative: try getAccount if available
      try {
        const accountData = await account.connector.getAccount();
        prov = accountData?.provider || null;
      } catch (e) {
        // Ignore getAccount errors
      }
    }
  } catch (error) {
    console.warn('[WalletUtils] Error getting provider, trying fallbacks:', error);
    // Try fallback approaches
    if (account.connector.provider) {
      prov = account.connector.provider;
    }
  }

  return {
    provider: prov || null,
    info: {
      name:
        account.connector.name ||
        account.connector.paraDetails?.name ||
        "Unknown Wallet",
      icon:
        account.connector.icon ||
        account.connector.paraDetails?.iconUrl ||
        null,
    },
    exclusive: true,
  };
};

