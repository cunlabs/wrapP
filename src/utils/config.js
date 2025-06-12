require('dotenv').config();

const NETWORKS = {
    plume: {
        name: 'Plume Mainnet',
        rpcUrl: 'https://rpc.plume.org',
        chainId: 98866,
        symbol: 'PLUME',
        decimals: 18,
        explorer: 'https://explorer.plume.org/'
    }
};

module.exports = { NETWORKS};
