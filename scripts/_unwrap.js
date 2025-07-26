const fs = require('fs');
const moment = require('moment');
const colors = require('colors');
const ethers = require('ethers');
const { NETWORKS } = require('../src/utils/config');
const { WRAP_ABI } = require('../src/ABI/abiWrap');

// Setup provider
const network = NETWORKS.plume;
const provider = new ethers.JsonRpcProvider(network.rpcUrl);

const CONTRACT = WRAP_ABI.at(-1).CA;
const ABI = WRAP_ABI.slice(0, -1);
const iface = new ethers.Interface(ABI);

const DEPOSIT_SIGNATURE = '0xd0e30db0'; // deposit()
const AMOUNT_PER_DEPOSIT = ethers.parseUnits("1", "ether");
const WITHDRAW_SIGNATURE = '0x2e1a7d4d'; // withdraw(uint256)

let PRIVATE_KEYS;
try {
    PRIVATE_KEYS = JSON.parse(fs.readFileSync('privateKeys.json', 'utf-8'));
    if (!Array.isArray(PRIVATE_KEYS)) throw new Error("privateKeys.json must contain an array of private keys");
} catch (error) {
    console.error('ERROR reading privateKeys.json:'.red);
    process.exit(1);
}

function getRandomDepositCount() {
    // Random integer between 3 and 8 inclusive
    return Math.floor(Math.random() * (8 - 3 + 1)) + 3;
}

async function depositMultiple(wallet, times, amountPerDeposit) {
    for (let i = 0; i < times; i++) {
        try {
            console.log(`[${moment().format('HH:mm:ss')}] Deposit #${i + 1} for wallet: ${wallet.address}`.cyan);

            const feeData = await wallet.provider.getFeeData();
            const nonce = await provider.getTransactionCount(wallet.address);

            const gasLimit = await wallet.estimateGas({
                to: CONTRACT,
                data: DEPOSIT_SIGNATURE,
                value: amountPerDeposit
            });

            const tx = {
                to: CONTRACT,
                from: wallet.address,
                nonce,
                data: DEPOSIT_SIGNATURE,
                gasLimit,
                gasPrice: feeData.gasPrice,
                value: amountPerDeposit,
                chainId: network.chainId
            };

            const result = await wallet.sendTransaction(tx);
            console.log(`Deposit TX sent! Hash: ${result.hash}`.green);
            await result.wait(1);
            console.log('Deposit confirmed!'.green);

            if (i < times - 1) {
                const delay = Math.floor(Math.random() * (15000 - 2500) + 2500);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        } catch (error) {
            console.error(`Deposit #${i + 1} failed for ${wallet.address}:`.red, error.message.red);
        }
    }
}

async function withdrawOnce(wallet, totalAmount) {
    try {
        const withdrawData = iface.encodeFunctionData('withdraw', [totalAmount]);
        const feeData = await wallet.provider.getFeeData();
        const nonce = await provider.getTransactionCount(wallet.address);

        const gasLimit = await wallet.estimateGas({
            to: CONTRACT,
            data: withdrawData,
            value: 0
        });

        const tx = {
            to: CONTRACT,
            from: wallet.address,
            nonce,
            data: withdrawData,
            gasLimit,
            gasPrice: feeData.gasPrice,
            value: 0,
            chainId: network.chainId
        };

        console.log(`[${moment().format('HH:mm:ss')}] Withdrawing ${ethers.formatUnits(totalAmount, "ether")} PLUME for wallet: ${wallet.address}`.yellow);
        const result = await wallet.sendTransaction(tx);
        console.log(`Withdraw TX sent! Hash: ${result.hash}`.green);

        await result.wait(1);
        console.log('Withdraw confirmed!'.green);
    } catch (error) {
        console.error(`Withdraw failed for ${wallet.address}:`.red, error.message.red);
    }
}

async function processAllWallets() {
    for (const [idx, privateKey] of PRIVATE_KEYS.entries()) {
        const wallet = new ethers.Wallet(privateKey, provider);
        console.log('\n' + '='.repeat(60));
        console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Processing wallet ${idx + 1}/${PRIVATE_KEYS.length} : ${wallet.address}`.cyan);

        // Random total deposit for this wallet
        const depositCount = getRandomDepositCount();
        console.log(`Random deposit count for ${wallet.address}: ${depositCount}`.magenta);

        // Step 1: deposit random times (amount 1)
        await depositMultiple(wallet, depositCount, AMOUNT_PER_DEPOSIT);

        // Step 2: withdraw total deposit (amount = depositCount)
        await new Promise(resolve => setTimeout(resolve, 8000)); // Optional delay
        await withdrawOnce(wallet, ethers.parseUnits(depositCount.toString(), "ether"));

        if (idx < PRIVATE_KEYS.length - 1) {
            const delay = Math.floor(Math.random() * (15000 - 6000) + 6000);
            console.log(`Waiting ${delay / 1000} seconds before next wallet...`.yellow);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    console.log('\nAll wallets completed!'.green);
    process.exit(0);
}

processAllWallets();
