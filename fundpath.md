Building Fundpath: Integrating NOWNodes for a Crypto Payment Gateway
Overview of Fundpath and NOWNodes Integration
Fundpath is envisioned as a crypto payment gateway (similar to NOWPayments) that lets merchants accept multiple cryptocurrencies (BTC, ETH, USDT, TON, SOL, USDC, BNB, TRX) with payments forwarded instantly to the merchant’s own wallet. We will leverage NOWNodes API – a blockchain node and explorer service – to interact with each blockchain without running our own nodes. NOWNodes provides unified API access to 100+ blockchains (Bitcoin, Ethereum, BSC, Solana, Tron, TON, etc.), including full node RPC endpoints and block explorer (Blockbook) APIs
nownodes.io
nownodes.io
. Using NOWNodes means we can query balances, send transactions, and monitor addresses via HTTP or WebSocket, all with a single API key. Key advantages of NOWNodes for our use-case:
Unified API for Multiple Chains: A single service/API key gives access to all required blockchain nodes and explorers
nownodes.io
. This simplifies integration since we don’t need separate libraries or node setups for each coin.
Blockbook Explorer Endpoints: NOWNodes’ Blockbook API provides ready-made methods to get address details, transaction history, and balances across different chains
nownodes.io
. This saves us from writing low-level parsing logic.
WebSocket Support: For real-time updates, NOWNodes offers WebSocket endpoints to subscribe to new transactions or address activity
nownodes.io
nownodes.gitbook.io
. We can use this to instantly detect incoming payments.
No Custodial Infrastructure: We retain control of keys and addresses. NOWNodes does not hold funds or keys – it simply relays blockchain data and broadcasts transactions on our behalf. All private key operations (address generation, transaction signing) happen in our application, keeping the solution non-custodial.
Non-Custodial Payment Flow (Like NOWPayments)
Fundpath’s payment flow will mirror the non-custodial model of NOWPayments. In a non-custodial gateway, the provider never permanently holds merchant funds or private keys – payments go directly to merchants’ wallets shortly after the customer pays
nowpayments.io
. Below is the typical flow:
Merchant Creates a Payment: Via Fundpath’s dashboard or API, the merchant initiates a payment request (specifying amount, currency, etc.). Our backend generates a temporary deposit address for the chosen crypto and returns it (along with QR code data) to be shown to the customer.
Customer Pays the Address: The customer sends the required crypto amount to the deposit address. The address is unique per transaction (or per invoice), so we can identify the payment. At this point the payment is “waiting” or “confirming” on the blockchain
nowpayments.io
.
Detection and Confirmation: Fundpath monitors the blockchain (via NOWNodes) for the incoming payment. Once the transaction is detected and reaches the needed confirmations, our server marks the payment as confirmed. (We could also optionally notify the merchant via webhook, similar to an IPN callback in NOWPayments
nowpayments.io
.)
Instant Forwarding to Merchant Wallet: As soon as the deposit transaction is confirmed, Fundpath immediately forwards the funds from the temporary address to the merchant’s own wallet address. This payout happens within minutes, so the merchant directly receives the crypto in their wallet (typically under 5 minutes, as NOWPayments achieves)
nowpayments.io
. Because the merchant provided their wallet address beforehand, Fundpath never needs their private key – we never store merchant funds or keys
nowpayments.io
.
Completion: The payment is marked “finished” once the forwarding transaction succeeds
nowpayments.io
. The merchant now has the funds, and the customer’s order can be fulfilled.
Throughout this flow, Fundpath acts only as a transient agent: it generates deposit addresses and executes the forwarding transfer. The non-custodial design means Fundpath does not hold funds beyond the brief period between customer payment and forwarding, and private keys for merchant wallets are never requested. We only control the keys of the one-time deposit addresses (necessary to move the funds). This approach ensures security and trust – similar to NOWPayments’ promise that they “never store your funds and never have private keys to any of your wallets”
nowpayments.io
.
Setting Up NOWNodes API (API Key and Endpoint Usage)
Before implementing blockchain operations, we need to configure access to NOWNodes:
Get an API Key: Sign up at NOWNodes and obtain an API key from the dashboard
nownodes.gitbook.io
. This key authenticates our requests to all blockchain nodes.
Endpoint Format: NOWNodes provides different base URLs for each blockchain’s RPC and explorer. For example:
Full Node RPC: Use <chain>.nownodes.io as the host, with the API key appended. For instance, Ethereum RPC calls go to https://eth.nownodes.io/YOUR_API_KEY 
nownodes.gitbook.io
, Bitcoin RPC to https://btc.nownodes.io/YOUR_API_KEY, Tron to https://trx.nownodes.io/YOUR_API_KEY, etc. We send JSON-RPC payloads as HTTP POST to these endpoints.
Blockbook Explorer API: Alternatively, we can use REST GET endpoints for common queries. Each chain often has an explorer subdomain, e.g. Bitcoin’s is https://btcbook.nownodes.io 
nownodes.gitbook.io
, Ethereum’s likely https://ethbook.nownodes.io, etc. We include the API key in the request header (api-key: YOUR_API_KEY) for these calls
nownodes.gitbook.io
. For instance, to get Bitcoin address info:
GET https://btcbook.nownodes.io/api/v2/address/{BTC_ADDRESS}
api-key: YOUR_API_KEY
This returns balance, total received, total sent, transaction count, etc for the address
nownodes.gitbook.io
. (We will use such endpoints for monitoring payments.)
Using HTTP vs WebSocket: For simplicity, we will primarily use HTTP API calls (polled periodically) to detect payments. NOWNodes also offers WebSocket endpoints (at e.g. wss://btcbook.nownodes.io/wss/{YOUR_API_KEY}) where we can send subscribe commands (like subscribeAddresses) to get real-time notifications when a transaction involving a given address occurs
nownodes.gitbook.io
nownodes.gitbook.io
. In production, a WebSocket subscription for each deposit address can yield instant payment detection, but a polling approach (e.g. every few seconds) via HTTP API can also suffice for a first implementation.
Tip: We will keep the NOWNodes API key on the server side (e.g. in Next.js environment variables) and never expose it on the client. All blockchain interactions will be handled in our Next.js backend API routes to maintain security.
Address Generation and Wallet Management
A crucial part of Fundpath is generating a unique deposit address for each payment. This address is where the customer sends funds, and from which we forward to the merchant. We must manage private keys for these temporary addresses in a secure way. There are two approaches:
HD Wallet per Merchant: We can derive deposit addresses from a merchant’s extended public key (xpub). For example, a merchant could provide an xpub for their Bitcoin wallet, and Fundpath will derive a new unused address for each payment. This way, the merchant’s wallet (for which only they hold the xprv) directly receives the funds (the deposit address is part of their wallet). This is truly non-custodial – Fundpath never has the private key and doesn’t need to forward funds (the payment is sent straight into the merchant’s wallet). However, this requires merchants to be technically capable of providing xpubs for each coin, and handling multiple addresses.
Ephemeral Addresses Managed by Platform: Simpler initially – Fundpath itself generates a new keypair for each transaction, gives out the public address to receive payment, then uses the private key to send the money to the merchant’s address after confirmation. In this model, Fundpath temporarily controls the funds (from receipt until forwarding), but for a very short time. We must protect private keys and ensure automated forwarding to minimize risk. We will adopt this approach for now (as NOWPayments does under the hood) and later can add xpub support for advanced users.
Generating Addresses: We will generate addresses using appropriate libraries for each blockchain:
Bitcoin (BTC) – for example, using bitcoinjs-lib in Node:
const bitcoin = require('bitcoinjs-lib');
const keyPair = bitcoin.ECPair.makeRandom();  // generate random key
const { address } = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey }); 
console.log("New BTC deposit address:", address);
// Save keyPair.privateKey securely for later use in forwarding
This produces a SegWit BTC address (bech32). We would store the private key (encrypted) in our database along with the pending payment record and merchant destination.
Ethereum (ETH) and BSC (BNB) – using ethers.js:
const { Wallet } = require('ethers');
const wallet = Wallet.createRandom();
console.log("New ETH/BNB deposit address:", wallet.address);
// Save wallet.privateKey for later, and note whether it's ETH or BSC chain.
This gives us an EVM address (0x...). The same method works for any Ethereum-like chain (Ethereum, Binance Smart Chain, etc.). We’ll generate one per payment.
Tron (TRX) – using TronWeb or similar:
const TronWeb = require('tronweb');
const account = TronWeb.utils.accounts.generateAccount();  // generates a new TRX address
console.log("New TRX deposit address:", account.address.base58);
// Save account.privateKey securely.
Tron addresses are presented in Base58 (starting with T) for users, though NOWNodes API often expects the hex representation (prefix 41...) – TronWeb gives both formats.
Solana (SOL) – using @solana/web3.js:
const { Keypair, PublicKey } = require('@solana/web3.js');
const keypair = Keypair.generate();
const solAddress = keypair.publicKey.toBase58();
console.log("New SOL deposit address:", solAddress);
// Save keypair.secretKey for later.
Toncoin (TON) – TON addresses are more complex (they are smart contract addresses). The typical way is to use a wallet contract (such as TON Wallet v3). For simplicity, we can use tonweb library to create a new wallet:
const TonWeb = require('tonweb');
const tonweb = new TonWeb();
const wallet = tonweb.wallet.create({ workchain: 0 });  // generate new wallet contract
const tonKey = TonWeb.utils.newSeed();  // 32-byte random seed
const keyPair = TonWeb.utils.keyPairFromSeed(tonKey);
await wallet.deploy(keyPair.secretKey);  // would create the wallet on-chain (needs funding)
const tonAddress = await wallet.getAddress();
console.log("New TON deposit address:", tonAddress.toString());
In practice, generating a TON address and using it requires deploying a wallet smart contract and funding it with some TON for fees. This is an advanced case – we may pre-generate TON wallets and keep a reserve of TON for fees to forward payments. (NOWNodes also provides an Indexer API to get TON account info and send messages without running a TON node
nownodes.gitbook.io
nownodes.gitbook.io
.)
Each newly generated address and its private key are stored in our database along with the merchant’s target address and payment details (amount, currency, etc.). Security best practices: encrypt the private keys at rest, and ideally discard them after use (once funds are forwarded). Additionally, for high-volume scenarios, consider using a single HD wallet per coin (controlled by Fundpath) to derive many addresses (which can simplify key management via an XPUB). But initially, individual keypairs per payment are acceptable.
Integrating Blockchain Support with NOWNodes
With address generation in place, we now detail how to monitor and forward payments on each supported blockchain using NOWNodes. We’ll handle two phases for each coin: (A) Payment Detection and (B) Forwarding Transaction. The logic will reside in Next.js API routes (server-side):
Bitcoin (BTC)
A. Detecting BTC Payment: Once a BTC deposit address is given to the customer, our backend needs to watch for an incoming transaction. We can use NOWNodes Blockbook API to check the address balance and transactions. For example, using a periodic task or on-demand check:
Address info endpoint: GET https://btcbook.nownodes.io/api/v2/address/{BTC_ADDRESS} with our API key. This returns JSON like:
{
  "address": "bc1q...9332d",
  "balance": "0",
  "totalReceived": "4555309",
  "totalSent": "4555309",
  "unconfirmedBalance": "0",
  "txs": 2,
  "txids": [ "txid1", "txid2" ]
}
(In this example, balance 0 means no funds currently, totalReceived equals totalSent which implies past transactions were forwarded)
nownodes.gitbook.io
. We will check if balance (confirmed balance) or unconfirmedBalance is >= the expected payment amount. We can also retrieve the latest txids and confirm one of them corresponds to the customer’s payment.
Confirmation tracking: We might call GET /api/v2/tx-specific/{txid} to get transaction details including confirmation count
nownodes.gitbook.io
nownodes.gitbook.io
. However, Blockbook’s address query gives us enough to know once the funds are in the address with required confirmations (when unconfirmedBalance goes to 0 and balance updates, or when a transaction appears in the address’s tx list). For automation, using the WebSocket subscribeAddresses on wss://btcbook.nownodes.io is ideal – NOWNodes would push a message as soon as a new transaction involving our deposit address is seen
nownodes.gitbook.io
. To keep it simple, we can poll the address every ~10 seconds via the HTTP API until the balance shows up.
B. Forwarding BTC to Merchant: After detecting the BTC payment, we create a Bitcoin transaction that sends the received amount to the merchant’s BTC address (minus any miner fee or service fee).
Gather UTXOs: We need the unspent output(s) from the deposit address. The Blockbook address endpoint provides a list of transaction IDs but not the full UTXO details by default. We can either:
Use the Bitcoin JSON-RPC via NOWNodes: call listunspent on the address (if wallet RPC were enabled – likely not on shared nodes), or
Use Blockbook’s UTXO API: GET /api/v2/utxo/{address} which returns an array of unspent outputs (each with txid, output index, and value).
Construct Transaction: Using a Bitcoin library, we create a new transaction spending those UTXO(s) to the merchant’s address. For example, with bitcoinjs-lib:
const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
// Add inputs from UTXOs
utxos.forEach(u => {
  psbt.addInput({
    hash: u.txid,
    index: u.vout,
    witnessUtxo: { script: Buffer.from(u.scriptHex, 'hex'), value: u.valueSat }
  });
});
// Add output to merchant
psbt.addOutput({ address: merchantAddress, value: totalValue - fee });
// (Optional) If we want to subtract a platform fee or handle change, add additional outputs accordingly.
// Sign with the deposit address's private key
psbt.signAllInputs(bitcoin.ECPair.fromPrivateKey(depositPrivKey));
psbt.finalizeAllInputs();
const rawTxHex = psbt.extractTransaction().toHex();
Here we must estimate a miner fee – e.g., calculate bytes and use a fee rate or use a small fixed fee if amounts are low. Alternatively, we could use NOWNodes’ fee estimate (e.g., getnetworkinfo RPC or Blockbook’s estimatefee if available).
Broadcast via NOWNodes: Take the hex of the signed transaction and submit it. NOWNodes provides a direct endpoint for broadcasting:
GET https://btcbook.nownodes.io/api/v2/sendtx/{hexTxData}
api-key: YOUR_API_KEY
For example, sendtx/0100000001abcdef... will broadcast the transaction
nownodes.gitbook.io
. The response will indicate success and return the new transaction ID if all goes well (e.g., "result": "Transaction broadcasted successfully", "txid": "<new_txid>" on success)
nownodes.gitbook.io
. We can also use the Bitcoin JSON-RPC method via POST (e.g., call sendrawtransaction with the hex) if preferred – but the GET endpoint is convenient.
Result: The merchant’s address will receive the BTC (we can optionally double-check via NOWNodes that the merchant address got this tx). Finally, we mark the payment complete in our database. The deposit address’s job is done – we could discard its key or archive it.
Code Example – Checking and Forwarding BTC (pseudo-code for an API route):
// Example: /api/check-btc-payment?address=<depositAddr>&merchant=<destAddr>
import fetch from 'node-fetch';
import bitcoin from 'bitcoinjs-lib';

export default async function handler(req, res) {
  const { address, merchant } = req.query;
  // 1. Check deposit address balance via NOWNodes
  const url = `https://btcbook.nownodes.io/api/v2/address/${address}`;
  const resp = await fetch(url, { headers: { 'api-key': process.env.NOWNODES_API_KEY }});
  const data = await resp.json();
  const confirmed = parseInt(data.balance);
  if (confirmed > 0) {
    // 2. Retrieve UTXOs for the address
    const utxoResp = await fetch(`https://btcbook.nownodes.io/api/v2/utxo/${address}`, { headers: { 'api-key': process.env.NOWNODES_API_KEY }});
    const utxos = await utxoResp.json();
    // 3. Build and sign transaction (assuming one UTXO for simplicity)
    const key = /* retrieve deposit address private key from secure storage */;
    const keyPair = bitcoin.ECPair.fromPrivateKey(Buffer.from(key, 'hex'));
    const psbt = new bitcoin.Psbt();
    utxos.forEach(u => {
      psbt.addInput({ hash: u.txid, index: u.vout, witnessUtxo: { script: Buffer.from(u.scriptHex, 'hex'), value: u.value }});
    });
    const totalValue = utxos.reduce((sum, u) => sum + u.value, 0);
    const fee = 1000; // sats (example fee)
    psbt.addOutput({ address: merchant, value: totalValue - fee });
    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();
    const rawHex = psbt.extractTransaction().toHex();
    // 4. Broadcast via NOWNodes
    const sendResp = await fetch(`https://btcbook.nownodes.io/api/v2/sendtx/${rawHex}`, { headers: { 'api-key': process.env.NOWNODES_API_KEY }});
    const sendResult = await sendResp.json();
    console.log("Broadcast result:", sendResult);
    // Respond with success
    return res.status(200).json({ forwardedTx: sendResult.txid });
  } else {
    return res.status(200).json({ message: "Payment not received or not confirmed yet." });
  }
}
Explanation: This example checks the address, and if a confirmed balance is found, it fetches UTXOs, builds a simple transaction sending all funds to the merchant (minus a fee), signs it with the deposit address’s key, and broadcasts via NOWNodes. In a real app, you’d include error handling, dynamic fee calculation, and possibly handle multiple UTXOs or change outputs. But it illustrates the integration with NOWNodes for both querying and broadcasting BTC transactions.
Ethereum (ETH) and Binance Smart Chain (BNB) – EVM Chains
Ethereum and BSC operate on an account model (not UTXOs) and use smart contracts for tokens like USDT and USDC. NOWNodes gives access to their JSON-RPC APIs and Blockbook for certain queries. We’ll treat them similarly, with differences mainly in chain IDs and token contract addresses. A. Detecting ETH/BNB Payment: After generating an Ethereum deposit address, we need to watch for an incoming transfer to that address.
For ETH or BNB (native coin): The simplest way is to poll the address balance via JSON-RPC. We can call eth_getBalance on the address through NOWNodes:
// Example using fetch for JSON-RPC call
const body = {
  jsonrpc: "2.0",
  method: "eth_getBalance",
  params: [ depositAddress, "latest" ],
  id: 1
};
const resp = await fetch(`https://eth.nownodes.io/${API_KEY}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});
const result = await resp.json();
const balanceWei = parseInt(result.result, 16);
If balanceWei >= expected amount (in Wei), we know the funds arrived. We’d do similarly for BSC (https://bsc.nownodes.io/${API_KEY} endpoint) using the BSC deposit address. Alternatively, we could use Blockbook: calling https://ethbook.nownodes.io/api/v2/address/{address}?details=basic would return an object with the ETH balance (in wei or ETH) and possibly token balances
nownodes.gitbook.io
. For example, Blockbook’s tokenBalances detail will list any ERC-20 tokens the address holds
nownodes.gitbook.io
.
For ERC-20/BEP-20 tokens (USDT, USDC): When a customer is paying in USDT or USDC on Ethereum (ERC-20) or on BSC (BEP-20), the deposit address will receive tokens, not ETH/BNB. We have two ways to detect this:
Check token balance via Blockbook: As mentioned, the Blockbook address API can include token balances. If we add details=tokenBalances, the response will contain an array of token holdings for that address
nownodes.gitbook.io
. We can filter for the USDT or USDC contract. For example, an Ethereum address query might show:
"tokens": [
   {
     "type": "ERC20",
     "name": "Tether USD",
     "contract": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
     "balance": "15000000",
     "decimals": 6,
     "symbol": "USDT"
   }
]
indicating the address has 15 USDT (balance in base units) on Ethereum. NOWNodes’ explorer can directly give this info, simplifying detection.
Listen for transfer event (advanced): Using JSON-RPC, we could filter for the Transfer event of the token contract to the deposit address. For instance, using eth_getLogs with the contract address and the deposit address as an indexed topic. However, this is more complex and usually not needed if we check balances after the fact.
We might simply do: call eth_call on the token’s balanceOf(depositAddress) method as a readonly call (which returns current token balance). For example, for USDT (Etherum):
const usdtContract = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const data = "0x70a08231" + depositAddress.slice(2).padStart(64, '0'); // ERC20 balanceOf(addr)
const body = { jsonrpc:"2.0", method:"eth_call", params: [{ to: usdtContract, data }, "latest"], id:1 };
// POST to eth.nownodes.io/API_KEY
The result will be the balance (in hex Wei for that token’s smallest unit). But using the explorer API is simpler.
Confirmation: Ethereum transactions are typically considered confirmed after e.g. 12 blocks (~3 minutes). We could wait for a few blocks before forwarding, to ensure finality. NOWNodes will show the block height and confirmations for a transaction via Blockbook or eth_getTransactionReceipt. We can poll eth_getTransactionReceipt(txHash) until it returns a status and block number, indicating inclusion in a block.
B. Forwarding ETH/BNB to Merchant: Once we confirm the deposit, we create a transaction from the deposit address to the merchant’s address:
ETH/BNB native: Use the deposit address’s private key to sign a transaction sending the amount to merchant.
We can use ethers.js for convenience by importing the private key into a Wallet connected to NOWNodes RPC:
const provider = new ethers.providers.JsonRpcProvider(`https://eth.nownodes.io/${API_KEY}`);
const depositWallet = new ethers.Wallet(depositPrivateKey, provider);
const tx = await depositWallet.sendTransaction({
  to: merchantAddress,
  value: ethers.utils.parseEther(amountEth)  // amount in ETH to send
});
await tx.wait(1);  // wait for 1 confirmation
console.log("Forwarded TX hash:", tx.hash);
This will handle signing and broadcasting through NOWNodes. (For BSC, use the BSC endpoint similarly by setting provider to https://bsc.nownodes.io/${API_KEY} and amounts in BNB.) We must ensure the deposit address has enough ETH/BNB to cover gas fees – usually it will if the customer sent more than the exact amount, or we might slightly inflate the required amount to cover fees. If not, our platform might need to fund the address with a tiny amount for gas.
Alternatively, craft a raw transaction: get the current nonce of the deposit address (eth_getTransactionCount via NOWNodes), then create and sign a TX hex (RLP encoded) with the private key. Using ethers is simpler for code.
USDT/USDC token on Ethereum or BSC: This is a bit more involved because the deposit address holds tokens but might have no ETH/BNB for gas. To forward tokens:
Provide Gas: We need to have the deposit address pay the network fee. If the address received only tokens (e.g. USDT), it has 0 ETH for gas. One approach: our platform keeps a reserve of ETH and BNB to pre-fund each token deposit address with a small amount (e.g. ~$1 worth) when a payment is detected, then proceed to send tokens. Another approach: use a central account with a smart contract to transfer tokens on behalf of the user (meta-transactions), but that’s complex. For Fundpath MVP, simplest is to pre-fund or require the customer also send a tiny amount of ETH if paying ERC-20 (could be part of instructions).
Send Token Transfer: Once gas is available, use the deposit address’s key to send the token. Using ethers.js:
const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, depositWallet);
const tx = await usdtContract.transfer(merchantAddress, tokenAmount);
await tx.wait();
console.log("USDT forwarded, TX:", tx.hash);
This constructs an ERC-20 transfer transaction from the deposit address to merchant. The depositWallet (with provider set to NOWNodes) signs and sends it. Under the hood this calls eth_sendRawTransaction via NOWNodes RPC.
Gas Fee Consideration: The deposit address will spend some ETH/BNB on this gas. If we pre-funded it, we might deduct an equivalent from the token amount to make up for it (or charge the merchant a fee).
USDT on Tron vs Ethereum: (Tron specifics are in the next section, but note that USDT exists on Tron as a TRC-20 which we handle differently. Here we focused on ERC-20 on Ethereum.)
After broadcasting the token transfer, the merchant’s address will receive the tokens. We verify the merchant got the tokens (e.g. check merchant address token balance via Blockbook or wait for the transaction receipt with status=1). Then mark payment complete. BNB on BSC is forwarded just like ETH, and BEP-20 tokens on BSC (if supporting USDT or USDC on BSC) would follow the same pattern as ERC-20 on Ethereum, just using BSC’s RPC endpoint and token contract addresses. Code Snippet – Forwarding ETH using Ethers.js:
// Using ethers.js with NOWNodes RPC to forward ETH
const { ethers } = require('ethers');
const API_KEY = process.env.NOWNODES_API_KEY;
const provider = new ethers.providers.JsonRpcProvider(`https://eth.nownodes.io/${API_KEY}`);
const depositWallet = new ethers.Wallet(depositPrivKey, provider);
const tx = await depositWallet.sendTransaction({
  to: merchantAddress,
  value: ethers.utils.parseUnits(amountInEth, "ether")  // send full balance minus gas
});
console.log(`Forwarding ETH... TX hash: ${tx.hash}`);
await tx.wait(1);
console.log("ETH forwarded to merchant.");
(In a Next.js API route, you’d wrap this in an async function and handle errors appropriately.)
Tron (TRX) and TRC-20 Tokens (USDT on Tron)
Tron is another account-based chain, but with different APIs. NOWNodes provides a Tron full-node API that mirrors Tron’s HTTP API (used by TronGrid). We’ll use that to detect and forward TRX and TRC-20 payments. A. Detecting TRX/USDT Payment: After providing a Tron deposit address (e.g. T... format), we monitor the Tron blockchain:
TRX (native coin): Use wallet/getaccount via NOWNodes for the address:
curl -X POST https://trx.nownodes.io/wallet/getaccount -d '{"address": "<hexAddress>"}'
(Address in hex, or add visible=true param to use Base58 format
nownodes.gitbook.io
nownodes.gitbook.io
.) The response is an Account object that includes balance (in sun, where 1 TRX = 1,000,000 sun) if the account exists
nownodes.gitbook.io
. If the deposit address has received TRX, its balance will reflect that. We check if the balance >= expected amount in sun. Note: Tron accounts are created either by receiving TRX or by explicit creation. If a brand-new address receives USDT (but no TRX), Tron will auto-create the account (burning 0.1 TRX from the sender as account activation fee). However, an account with only TRC-20 and no TRX might show up with no balance field (or balance 0) but have token balances. So we must handle that scenario.
USDT (TRC-20 on Tron): To see TRC-20 token balances, the getaccount call does not directly list TRC-20 tokens. Tron provides a separate API to query a contract or we can use a trigger:
Use wallet/triggerconstantcontract on the USDT contract’s balanceOf(address) function to query the balance
nownodes.gitbook.io
nownodes.gitbook.io
. For example:
const usdtContractHex = "<USDT_contract_address_in_hex>";
const functionSelector = "balanceOf(address)";
const param = TronWeb.address.toHex(depositAddress); //  hex string of address
const body = {
  contract_address: usdtContractHex,
  function_selector: "balanceOf(address)",
  parameter: param.replace(/^0x/, ""),  // Tron expects hex without 0x and 32-byte aligned
  owner_address: TronWeb.address.toHex(depositAddress)
};
// POST to https://trx.nownodes.io/wallet/triggerconstantcontract
The result’s constant_result field will contain the token balance (in hex). We convert it to integer to see if USDT was received.
Alternatively, listen for events: Tron’s wallet/gettransactionbyid for a payment’s TXID can show internal TRC20 transfer info. But since we might not know the TXID easily, polling balance is okay.
Tron’s Blockbook (if available) could also help. NOWNodes might have a Tron Blockbook to query api/v2/address/{addr} similar to Ethereum. If so, it might list TRC-20 balances too. (We would check https://trxbook.nownodes.io/api/v2/address/{addr} if it exists.) B. Forwarding on Tron:
Forwarding TRX: We create a transaction from deposit address to merchant address. Tron’s API call wallet/createtransaction helps to build a transfer. Example:
curl -X POST https://trx.nownodes.io/wallet/createtransaction -d '{
  "owner_address": "<hex_deposit_address>",
  "to_address": "<hex_merchant_address>",
  "amount": 1000000
}'
This returns an unsigned transaction object
nownodes.gitbook.io
nownodes.gitbook.io
. We then sign it with the deposit private key (Tron uses ECDSA secp256k1 same as ETH/BTC). We can sign using TronWeb:
const unsignedTx = /* result from createtransaction */;
const signedTx = await tronWeb.trx.sign(unsignedTx, depositPrivateKey);
Finally, broadcast it:
curl -X POST https://trx.nownodes.io/wallet/broadcasttransaction -d '<signed_transaction_json>'
If successful, it returns { "result": true, "txid": "..." }
nownodes.gitbook.io
. NOWNodes also provides wallet/broadcasthex to send a raw hex string of a signed tx
nownodes.gitbook.io
, which might be easier if we have the hex.
Forwarding USDT (TRC-20): On Tron, USDT is a smart contract (typically at address TXLA..., on Tron mainnet).
We must invoke its transfer(address to, uint256 value) method from our deposit address:
Create the transfer transaction via wallet/triggersmartcontract. For example:
curl -X POST https://trx.nownodes.io/wallet/triggersmartcontract -d '{
  "contract_address": "<USDT_contract_hex>",
  "function_selector": "transfer(address,uint256)",
  "parameter": "<encoded_params>",
  "fee_limit": 10000000,
  "owner_address": "<hex_deposit_address>"
}'
Here, parameter is the ABI-encoded arguments (20-byte recipient, 32-byte amount). We can encode it using TronWeb or online tools. fee_limit is the max TRX to burn for energy (here 10 TRX). This returns an unsigned contract transaction
nownodes.gitbook.io
nownodes.gitbook.io
.
Sign the transaction with deposit’s private key (using TronWeb’s trx.sign as above).
Broadcast with wallet/broadcasttransaction similarly.
The deposit address must have enough TRX for energy/fee. TRC-20 transfers consume bandwidth and energy; if the address has none, 0.1 TRX might be burned from it (if available) or from the sender of the call. We may need to fund a little TRX to cover fee_limit if the user sent absolutely no TRX. Typically, the USDT sender would have paid for the creation of our address, but we might have to burn a bit for the outgoing transfer. Including a small TRX reserve in each deposit address is advisable.
After broadcasting, the merchant’s Tron address receives the USDT. We can confirm via getaccount for the merchant or by checking the transaction receipt (wallet/gettransactioninfobyid) for status. Summary: Tron integration requires handling Tron-specific API calls. NOWNodes essentially proxies those calls for us (no need to run Tron Full Node or Solidity Node ourselves). The flow is: detect via account query or contract query, then create+sign+broadcast transaction via Tron APIs. This can be wrapped in our Next.js backend similar to other coins.
Solana (SOL)
Solana differs significantly – it uses a Proof-of-History based ledger and has its own RPC protocol. NOWNodes provides Solana RPC access at https://sol.nownodes.io/{API_KEY} 
nownodes.io
. We can use the official Solana web3 library by pointing it to NOWNodes. A. Detecting SOL Payment: Once we have a Solana deposit public key:
We query the balance with the JSON-RPC method getBalance. Using solana-web3.js:
const solConnection = new Connection(`https://sol.nownodes.io/${API_KEY}`);
const balanceLamports = await solConnection.getBalance(new PublicKey(depositAddress));
This returns lamports (1 SOL = 1e9 lamports). If balanceLamports >= expected, payment arrived. Or using direct RPC:
{ "method": "getBalance", "params": [ "<base58Address>" ], "id":1, "jsonrpc":"2.0" }
(POST to NOWNodes Solana endpoint) which returns the balance
nownodes.io
.
Confirmations on Solana are a bit different (finalized or confirmed states). getBalance by default gives the latest finalized balance. We can assume once it’s nonzero and a few seconds passed, it’s effectively confirmed (Solana finality is typically a few seconds).
B. Forwarding SOL: We need to send SOL from the deposit Keypair to the merchant’s address:
Use solana-web3:
const fromKeypair = Keypair.fromSecretKey(depositSecretKey);
const transaction = new Transaction();
transaction.add(SystemProgram.transfer({
  fromPubkey: fromKeypair.publicKey,
  toPubkey: new PublicKey(merchantAddress),
  lamports: balanceLamports - 5000, // leave some lamports for fee
}));
const signature = await solConnection.sendTransaction(transaction, [fromKeypair]);
console.log("Forwarding SOL, tx signature:", signature);
await solConnection.confirmTransaction(signature, 'finalized');
This creates a transfer instruction and sends it. We subtract a small amount for fees (Solana fees are very low, a few thousand lamports).
The Solana RPC will handle broadcasting and confirmation. NOWNodes being the endpoint means sendTransaction is actually calling NOWNodes’ RPC under the hood to propagate the TX.
After that, the merchant gets the SOL. We can double-check the merchant’s balance or the confirmed transaction via getTransaction RPC if needed. Solana’s high throughput means this whole operation is quick. One consideration: if the deposit address had Associated Token Accounts for USDC (as Solana supports USDC SPL token), our platform might in future support USDC on Solana. That would involve creating and managing token accounts – a complex topic beyond this scope since the user didn’t explicitly list USDC on Solana.
Toncoin (TON)
TON is quite unique. Each TON wallet is a smart contract, and interacting with it requires complex message forming. NOWNodes provides a TON Indexer API
nownodes.gitbook.io
nownodes.gitbook.io
 to query accounts and also endpoints to send pre-built BOC (Bag of Cells) messages
nownodes.gitbook.io
nownodes.gitbook.io
. A. Detecting TON Payment: After giving out a TON address (wallet contract address) for deposit:
Use NOWNodes TON API getAddressInformation or getWalletInformation to check the account state and balance:
GET https://ton.nownodes.io/getAddressInformation?address=<TON_address>
api-key: YOUR_API_KEY
This returns the balance (in nanotons) and last transaction info
nownodes.gitbook.io
. We check if balance > 0 to confirm a payment.
TON has an async, sharded blockchain, so we might also use getTransactions to see the inbound payment transaction details
nownodes.gitbook.io
. It can list recent transactions on that address.
B. Forwarding TON: To send TON from the wallet contract to the merchant:
We need to send an external message to our wallet contract instructing it to transfer funds. This usually means creating a payload with the wallet’s secret key (to authenticate) and the destination address and amount. For a v3 wallet, this involves sequence numbers and signatures.
Using a TON SDK (like tonweb or ton-core), we can compose this. For example, tonweb’s wallet.transfer() method can create the message.
Once we have the signed message as a BOC, we call:
POST https://ton.nownodes.io/sendBoc 
Content-Type: application/json
api-key: YOUR_API_KEY
{
  "boc": "<base64_encoded_boc>"
}
NOWNodes will broadcast this external message to the TON network
nownodes.gitbook.io
nownodes.gitbook.io
. There is also sendBocReturnHash which returns the message hash
nownodes.gitbook.io
nownodes.gitbook.io
.
After sending, the merchant receives the TON. We can confirm by querying the merchant address or checking for a new transaction.
TON integration is the most advanced and may require careful building of the message. For a comprehensive solution, one could use the official TON SDK to automate this. NOWNodes essentially acts as our gateway to send and query TON without needing a local TON node.
Putting It All Together in Next.js
We’ve outlined each coin’s integration. In a Next.js app, we can organize this into API routes and background jobs:
API Route for Payment Creation: e.g. POST /api/create-payment. The merchant (or our front-end) calls this with { amount, currency, merchantId }. The handler will:
Generate a new address for the requested currency (using the methods above).
Save a payment record in our database with merchantId, amount, currency, depositAddress, merchantAddress (the merchant’s destination wallet, retrieved from their profile), and status “waiting”.
Return the deposit address (and perhaps a QR code or payment link) to be presented to the customer.
Example (pages/api/create-payment.js):
import { generateBTCAddress, generateETHAddress, generateTRXAddress, /*...*/ } from '../../lib/addresses';
import db from '../../lib/db';

export default async function handler(req, res) {
  const { currency, amount, merchantId } = req.body;
  // 1. Generate deposit address and key
  let depositAddr, privKey;
  switch(currency) {
    case 'BTC':
      ({ address: depositAddr, privateKey: privKey } = generateBTCAddress());
      break;
    case 'ETH':
      ({ address: depositAddr, privateKey: privKey } = generateETHAddress());
      break;
    case 'TRX':
      ({ address: depositAddr, privateKey: privKey } = generateTRXAddress());
      break;
    // ... other cases for SOL, TON, etc.
  }
  // 2. Store payment record (ensure to encrypt privKey in DB!)
  await db.payment.create({
    data: { merchantId, currency, amount, depositAddress: depositAddr, depositPrivKey: encrypt(privKey), status: 'waiting' }
  });
  // 3. Respond with the address
  res.json({ address: depositAddr });
}
The front-end will call this and then display the address/QR code to the customer.
Payment Monitoring Service: We need a process to detect and forward payments. There are a few strategies:
Polling (cron job or interval): A server-side timer (or a separate worker process) that periodically checks all “waiting” payments. It can use the logic from each coin’s section to query the blockchain via NOWNodes for each pending deposit. If a payment is found, mark it as confirming/confirmed, create the forwarding transaction, broadcast it, update status to “forwarded” and then “finished”.
WebSocket listeners: Alternatively, open a WebSocket connection to NOWNodes for each coin and subscribe to all pending addresses (NOWNodes allows subscribing to multiple addresses in one request
nownodes.gitbook.io
). On receiving a notification, handle the respective payment. This is efficient but requires maintaining live connections.
Hybrid: Use WebSockets for quick detection and fall back to polling as backup.
For example, a simple polling loop (pseudo-code):
const pendingPayments = await db.payment.findMany({ where: { status: 'waiting' } });
for (let pay of pendingPayments) {
  if (pay.currency === 'BTC') {
    const info = await getBTCAddressInfo(pay.depositAddress);
    if (info.balance >= pay.amount) {
      // Payment arrived, proceed to forward
      await forwardBTC(pay.depositAddress, pay.depositPrivKey, pay.merchantAddress, pay.amount);
      await db.payment.update({ where: {id: pay.id}, data: { status: 'finished' }});
    }
  }
  else if (pay.currency === 'ETH') {
    // similar check with eth_getBalance or token balance
  }
  // ... handle other currencies
}
This can run every minute.
Forwarding Implementation: We should encapsulate each coin’s forwarding logic into functions (as we sketched in earlier sections). Ensure to handle errors (e.g., broadcast failure) – maybe retry or mark as error.
Security & Cleanup: After forwarding, consider removing or wiping the private key from the database (or mark as used). Maintain logs of transactions (like the TXIDs of forwards and maybe incoming TXIDs for reference). We should also secure the API key from NOWNodes (store in process.env and use server-side only).
Testing: Use testnets first. NOWNodes has endpoints for testnets (e.g., https://btcbook-testnet.nownodes.io and https://eth-testnet.nownodes.io for Görli or Sepolia networks). We can test end-to-end without risking real funds. Once confirmed, switch to mainnet endpoints.
Conclusion
Using NOWNodes API, we can build Fundpath as a robust, multi-crypto payment gateway without managing our own nodes. We covered generating deposit addresses, monitoring them via NOWNodes’ RPC and explorer APIs, and forwarding funds promptly to merchants – achieving a non-custodial flow where merchants receive funds in their wallets almost immediately
nowpayments.io
. By leveraging NOWNodes’ unified interface and Next.js for our web framework, Fundpath can support Bitcoin, Ethereum (and ERC-20 tokens like USDT/USDC), Binance Smart Chain, Tron (and TRC-20 USDT), Solana, and Toncoin in one platform. This documentation illustrated example code and API calls for each step. In practice, you would refine error handling, confirmation thresholds, fee management, and security (key storage, encryption) before production deployment. Nonetheless, the combination of Next.js and NOWNodes provides a solid foundation for building a crypto payment gateway like Fundpath quickly and reliably. Sources:
NOWNodes Documentation – Multi-Blockchain API and Blockbook usage
nownodes.io
nownodes.io
nownodes.gitbook.io
NOWPayments Integration Guide – Non-custodial payment flow and status definitions
nowpayments.io
nowpayments.io
NOWNodes Blockbook API Reference – Address info and transaction broadcast for BTC
nownodes.gitbook.io
nownodes.gitbook.io
Tron Full Node API Reference (via NOWNodes) – Creating accounts and triggering smart contracts
nownodes.gitbook.io
nownodes.gitbook.io
Solana RPC Integration Guide – Using JSON-RPC methods via NOWNodes endpoints
nownodes.io
nownodes.io
Citations

Affordable Blockchain Developer API | Access RPC Nodes & WebSocket | NOWNodes

https://nownodes.io/

Explorer API vs custom methods

https://nownodes.io/blog/explorer-via-api-vs-custom-methods/

Explorer API vs custom methods

https://nownodes.io/blog/explorer-via-api-vs-custom-methods/

Blockbook WSS | BTC (Bitcoinn)

https://nownodes.gitbook.io/btc-bitcoin/btc-bitcoin/blockbook-wss

NOWPayments Integration Guide

https://nowpayments.io/blog/integration-guide

NOWPayments Integration Guide

https://nowpayments.io/blog/integration-guide

NOWPayments Integration Guide

https://nowpayments.io/blog/integration-guide

NOWPayments Integration Guide

https://nowpayments.io/blog/integration-guide

NOWPayments Integration Guide

https://nowpayments.io/blog/integration-guide

How to Get Started with NOWNodes API key | Documentation

https://nownodes.gitbook.io/documentation/welcome-to-nownodes-docs/how-to-get-started-with-nownodes-api-key

How to Get Started with NOWNodes API key | Documentation

https://nownodes.gitbook.io/documentation/welcome-to-nownodes-docs/how-to-get-started-with-nownodes-api-key

BlockBook | BTC (Bitcoinn)

https://nownodes.gitbook.io/btc-bitcoin/btc-bitcoin/blockbook

BlockBook | BTC (Bitcoinn)

https://nownodes.gitbook.io/btc-bitcoin/btc-bitcoin/blockbook

BlockBook | BTC (Bitcoinn)

https://nownodes.gitbook.io/btc-bitcoin/btc-bitcoin/blockbook

Blockbook WSS | BTC (Bitcoinn)

https://nownodes.gitbook.io/btc-bitcoin/btc-bitcoin/blockbook-wss

Blockbook WSS | BTC (Bitcoinn)

https://nownodes.gitbook.io/btc-bitcoin/btc-bitcoin/blockbook-wss

API V1 Reference | TON (Toncoin)

https://nownodes.gitbook.io/ton-toncoin/

API V1 Reference | TON (Toncoin)

https://nownodes.gitbook.io/ton-toncoin/

BlockBook | BTC (Bitcoinn)

https://nownodes.gitbook.io/btc-bitcoin/btc-bitcoin/blockbook

BlockBook | BTC (Bitcoinn)

https://nownodes.gitbook.io/btc-bitcoin/btc-bitcoin/blockbook

BlockBook | BTC (Bitcoinn)

https://nownodes.gitbook.io/btc-bitcoin/btc-bitcoin/blockbook

BlockBook | BTC (Bitcoinn)

https://nownodes.gitbook.io/btc-bitcoin/btc-bitcoin/blockbook

BlockBook | BTC (Bitcoinn)

https://nownodes.gitbook.io/btc-bitcoin/btc-bitcoin/blockbook

HTTP API | TRX (Tron)

https://nownodes.gitbook.io/trx-tron/

HTTP API | TRX (Tron)

https://nownodes.gitbook.io/trx-tron/

HTTP API | TRX (Tron)

https://nownodes.gitbook.io/trx-tron/

HTTP API | TRX (Tron)

https://nownodes.gitbook.io/trx-tron/

HTTP API | TRX (Tron)

https://nownodes.gitbook.io/trx-tron/

HTTP API | TRX (Tron)

https://nownodes.gitbook.io/trx-tron/

HTTP API | TRX (Tron)

https://nownodes.gitbook.io/trx-tron/

HTTP API | TRX (Tron)

https://nownodes.gitbook.io/trx-tron/

HTTP API | TRX (Tron)

https://nownodes.gitbook.io/trx-tron/

HTTP API | TRX (Tron)

https://nownodes.gitbook.io/trx-tron/

HTTP API | TRX (Tron)

https://nownodes.gitbook.io/trx-tron/

How to Integrate Solana RPC Endpoints in 5 Minutes

https://nownodes.io/blog/how-to-integrate-solana-rpc-endpoints-in-5-minutes/

How to Integrate Solana RPC Endpoints in 5 Minutes

https://nownodes.io/blog/how-to-integrate-solana-rpc-endpoints-in-5-minutes/

API V1 Reference | TON (Toncoin)

https://nownodes.gitbook.io/ton-toncoin/

API V1 Reference | TON (Toncoin)

https://nownodes.gitbook.io/ton-toncoin/

API V1 Reference | TON (Toncoin)

https://nownodes.gitbook.io/ton-toncoin/

API V1 Reference | TON (Toncoin)

https://nownodes.gitbook.io/ton-toncoin/

API V1 Reference | TON (Toncoin)

https://nownodes.gitbook.io/ton-toncoin/

API V1 Reference | TON (Toncoin)

https://nownodes.gitbook.io/ton-toncoin/

Blockbook WSS | BTC (Bitcoinn)

https://nownodes.gitbook.io/btc-bitcoin/btc-bitcoin/blockbook-wss

NOWPayments Integration Guide

https://nowpayments.io/blog/integration-guide
All Sources

nownodes

nownodes.gitbook
