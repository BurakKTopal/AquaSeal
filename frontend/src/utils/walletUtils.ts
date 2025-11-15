export const generateProvider = async (account: any) => {
  if (!account || !account.connector) return null;

  const prov = await account.connector.getProvider();

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

