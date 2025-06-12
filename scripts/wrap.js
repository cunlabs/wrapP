// wrap plume official
const fs = require('fs');
const moment = require('moment');
const colors = require('colors');
const ethers = require('ethers');
const { NETWORKS } = require('../src/utils/config');
const { WRAP_ABI } = require('../src/ABI/abiWrap');

// Setup provider using network config
const network = NETWORKS.plume;
const provider = new ethers.JsonRpcProvider(network.rpcUrl);

// Initialize with timestamps and user info
console.log('='.repeat(50));
console.log(`Current Date and Time (UTC): ${moment().utc().format('YYYY-MM-DD HH:mm:ss')}`);
console.log('='.repeat(50));

const CONTRACT = WRAP_ABI.at(-1).CA;

// const abiWithoutCA = WRAP_ABI.slice(0, -1);
// const iface = new ethers.Interface(abiWithoutCA);
// const depositFunction = iface.getFunction('deposit');
// const dataValue = iface.encodeFunctionData(depositFunction);
const DEPOSIT_SIGNATURE = '0xd0e30db0';
//official reff
const REFERRAL_CODE = '3f2e24c6531d8ae2f6c09d8e7a6ad7f7e87a81cb75dfda61c9d83286';
const dataValue = DEPOSIT_SIGNATURE + REFERRAL_CODE;

// Validate contract address
console.log(`Contract Address: ${CONTRACT}`.cyan);
console.log(`Function Signature: ${dataValue}`.cyan);

let PRIVATE_KEYS;
try {
    console.log('Reading privateKeys.json...'.cyan);
    PRIVATE_KEYS = JSON.parse(fs.readFileSync('privateKeys.json', 'utf-8'));
    console.log(`Successfully loaded ${PRIVATE_KEYS.length} private keys`.green);
} catch (error) {
    console.error('ERROR reading privateKeys.json:'.red);
    console.error(error.message.red);
    console.log('Make sure privateKeys.json exists and contains valid data'.yellow);
    process.exit(1);
}

async function Wrap(wallet) {
    try {
        const dataValue = '0xd0e30db0';        
        // Generate random amount between 0.1 to 0.3 PLUME with 2 desimal
        const randomAmount = (Math.random() * (0.3 - 0.1) + 0.1).toFixed(2);
        const wrapAmount = ethers.parseUnits(randomAmount.toString(), "ether");
        
        console.log(`\n[${moment().format('HH:mm:ss')}] Processing wallet: ${wallet.address}`.cyan);
        console.log(`Network: ${network.name} (${network.symbol})`.cyan);
        
        console.log('\nWrapping Details:'.cyan);
        console.log(`Amount in PLUME: ${randomAmount} PLUME`.yellow);

        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        console.log(`Wallet balance: ${ethers.formatEther(balance)} ${network.symbol}`.cyan);
        

        
        // Get fee data
        console.log('Getting fee data...'.cyan);
        const feeData = await wallet.provider.getFeeData();
        
        // Get nonce
        console.log('Getting nonce...'.cyan);
        const nonce = await provider.getTransactionCount(wallet.address);
        
        const gasFee = feeData.gasPrice;
        console.log(`Gas Price: ${ethers.formatUnits(gasFee, "gwei")} Gwei`.cyan);

        // Estimate gas
        console.log('Estimating gas...'.cyan);
        const gasLimit = await wallet.estimateGas({
            data: dataValue,
            to: CONTRACT,
            value: wrapAmount
        });
        console.log(`Gas Limit: ${gasLimit.toString()}`.cyan);

        const tx = {
            to: CONTRACT,
            from: wallet.address,
            nonce,
            data: dataValue,
            gasLimit,
            gasPrice: gasFee,
            value: wrapAmount,
            chainId: network.chainId
        };

        console.log('Sending transaction...'.yellow);
        const result = await wallet.sendTransaction(tx);
        
        console.log(`Transaction sent! Hash: ${result.hash}`.green);
        console.log(
            `[${moment().format('HH:mm:ss')}] Wrapping ${randomAmount} PLUME from ${
                wallet.address
            } successful!`.green
        );
        console.log(
            `Check transaction: ${network.explorer}tx/${result.hash}`.cyan
        );
        
        // Wait for transaction confirmation
        console.log('Waiting for transaction confirmation...'.yellow);
        await result.wait(1);
        console.log('Transaction confirmed!'.green);

    } catch (error) {
        console.error(`Error in Wrap for ${wallet.address}:`.red);
        console.error(error.message.red);
        throw error;
    }
}

async function processWrap() {
    console.log('\nStarting wrap process...'.yellow);
    console.log(`Processing ${PRIVATE_KEYS.length} wallets`.cyan);

    for (let i = 0; i < PRIVATE_KEYS.length; i++) {
        const privateKey = PRIVATE_KEYS[i];
        console.log(`\nProcessing wallet ${i + 1}/${PRIVATE_KEYS.length}`.cyan);
        
        try {
            const wallet = new ethers.Wallet(privateKey, provider);
            console.log(`Wallet address: ${wallet.address}`.cyan);
            await Wrap(wallet);
            
            // Add delay between transactions
            if (i < PRIVATE_KEYS.length - 1) {
                const delay = Math.floor(Math.random() * (15000 - 5000) + 5000); // Random delay 5-15 seconds
                console.log(`Waiting ${delay/1000} seconds before next transaction...`.yellow);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        } catch (error) {
            console.error(`Failed processing wallet ${i + 1}:`.red);
            console.error(error.message.red);
            // Continue with next wallet instead of stopping
        }
    }
}

// Execute main function
console.log('\nInitiating wrap process...'.yellow);
processWrap()
    .then(() => {
        console.log('\nWrap process completed successfully!'.green);
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nFatal error in wrap process:'.red);
        console.error(error.message.red);
        process.exit(1);
    });
