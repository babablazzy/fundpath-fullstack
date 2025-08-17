Got it. I’ll prepare a comprehensive developer documentation for building a non-custodial crypto payment gateway using NOWNodes API. The documentation will cover:

* How to generate temporary wallet addresses (BTC, ETH, USDT, TON, SOL, USDC, BNB, TRON)
* How to detect and confirm payments
* How to auto-forward funds to merchants’ wallets
* Smart contract support for USDT on Ethereum and Tron
* Example API requests and responses
* Next.js-based frontend/backend code snippets for core flows

I’ll let you know as soon as it’s ready.


# Building a Crypto Payment Gateway (Fundpath) with NOWNodes and Next.js

## Introduction

Fundpath is a non-custodial cryptocurrency payment gateway, similar to NOWPayments, enabling merchants to accept multiple cryptocurrencies and receive funds directly in their own wallets. In a non-custodial flow, customer payments go to a temporary deposit address controlled by the gateway, which then immediately forwards the funds to the merchant’s wallet. This means the platform does not hold custody of funds beyond the time needed to transfer them. (By contrast, a custodial flow would store funds on the platform until withdrawal.) Using a non-custodial design, however, requires that each payment is forwarded via an on-chain transaction – incurring network fees that the merchant typically pays.

To implement this system, we leverage **NOWNodes API** as our blockchain backend. NOWNodes provides easy API access to full nodes and blockchain explorers for 100+ networks, so we can interact with Bitcoin, Ethereum, Tron, and other supported blockchains without running our own nodes. We’ll use **Next.js** for both frontend and backend: Next.js will power the merchant dashboard and payment pages (frontend) as well as server-side API routes to handle blockchain interactions (backend). This documentation will outline how to integrate NOWNodes into the Fundpath platform – including obtaining an API key, generating deposit addresses, monitoring incoming payments, and programmatically forwarding those payments to merchants’ wallets. Example code snippets (in JavaScript/Node.js) are provided to illustrate key steps.

## Getting Started with NOWNodes API

**1. Sign Up and API Key:** Begin by signing up for a NOWNodes account and obtaining an API key. After registering (a free “START” plan is available), log in to your NOWNodes dashboard. Choose the blockchains you plan to use (e.g. BTC, ETH, TRX, etc.), then click “Add New Key” in the dashboard – a unique API key will be generated for you. This API key is used to authenticate all requests to NOWNodes. Store it securely (e.g. in an environment variable on your server) and **do not expose it on the client-side**.

**2. Supported Networks and Endpoints:** NOWNodes offers both **full node RPC endpoints** and **explorer (Blockbook) endpoints** for many blockchains. Full node endpoints allow JSON-RPC calls (POST requests with methods like `getBlock`, `sendrawtransaction`, etc.), while explorer endpoints provide RESTful APIs (GET requests to fetch address or transaction info, etc.). Below are the main networks Fundpath will support and the corresponding NOWNodes endpoints (mainnet):

* **Bitcoin (BTC):** Full Node – `btc.nownodes.io`; Explorer – `btcbook.nownodes.io`
* **Ethereum (ETH):** Full Node – `eth.nownodes.io`; Explorer – `eth-blockbook.nownodes.io`
* **Binance Smart Chain (BNB/BSC):** Full Node – `bsc.nownodes.io`; Explorer – `bsc-blockbook.nownodes.io`
* **Tron (TRX):** Full Node – `trx.nownodes.io`; Explorer – `trx-blockbook.nownodes.io`
* **Toncoin (TON):** Full Node – `ton.nownodes.io`; **Indexer** – `ton-index.nownodes.io` (Ton indexer for advanced queries)
* **Solana (SOL):** Full Node – `sol.nownodes.io` (Solana’s RPC endpoint; no separate explorer)
* **Tether USD (USDT):** *Network-specific:* as an ERC-20 token on Ethereum, TRC-20 on Tron, etc. (Uses the ETH or TRX node endpoints plus contract calls; see [Supporting Smart Contracts](#supporting-smart-contracts-usdt-and-usdc) below.)
* **USD Coin (USDC):** Similarly an ERC-20 token on Ethereum (or SPL on Solana, if supported).

All requests to NOWNodes must include your API key in the header. For example, if using curl or fetch, include `api-key: YOUR_API_KEY` in the HTTP headers. NOWNodes handles the heavy lifting of running nodes – you just send API calls to their endpoints and receive blockchain data. This frees you to focus on building the application rather than managing node infrastructure.

**3. Next.js Setup:** In a Next.js project, you can call NOWNodes from server-side code. It’s recommended to create backend API routes (e.g. in the `pages/api` directory or Next 13’s `app` routes) to interact with NOWNodes. This way your API key remains secret on the server. The frontend can communicate with those API routes to initiate payment creation or check payment status. For example, you might have an API route `/api/createPayment` that generates a deposit address (by calling a helper function or library, since NOWNodes itself doesn’t generate keys) and stores the details in a database, and another route `/api/checkPayment` to query the blockchain for payment confirmation. We will delve into these implementation details next.

## Platform Workflow Overview

To clarify how Fundpath will function end-to-end, let’s outline the typical payment flow and how NOWNodes is used at each stage:

1. **Merchant Creates Payment Request:** A merchant (via the Fundpath dashboard or API) initiates a new payment request/invoice, specifying parameters like amount and currency (e.g. 50 USDT on Tron, or 0.01 BTC). The Fundpath backend will generate a **unique deposit address** for this payment and return it (along with QR code, etc.) to the merchant or frontend.

2. **Generate Deposit Address:** The deposit address is a temporary wallet address where the customer will send the crypto. Fundpath must generate this address and keep track of its private key (if the platform is responsible for forwarding funds). We **do not** get deposit addresses from NOWNodes (since NOWNodes is a node provider, not a wallet service) – instead, we generate keys using our own code or libraries (e.g. using cryptographic libraries for each blockchain). This is detailed in the next section. The deposit address and its corresponding private key (or derivation path) are stored securely by the platform (e.g. encrypted in a database) until the payment is completed and funds forwarded.

3. **Customer Pays to Deposit Address:** The customer is shown the deposit address (and perhaps a QR code) and sends the required cryptocurrency amount. For example, they send `0.01 BTC` to the provided Bitcoin address, or `50 USDT` to the provided Tron address. This transaction happens on the respective blockchain.

4. **Detect Incoming Payment:** The Fundpath backend needs to detect that the payment has arrived on-chain. Using the NOWNodes API, we can **monitor the deposit address** for incoming transactions or balance changes. There are two approaches:

   * *Polling via Explorer API:* Periodically (e.g. every few seconds) call the address endpoint on the appropriate explorer to check for new transactions or an updated balance. For instance, for a BTC address, call `GET https://btcbook.nownodes.io/api/v2/address/<BTC_ADDRESS>` with the API key to retrieve its transaction history and confirmed balance. For Ethereum or BSC addresses, call the blockbook endpoint (which may also list ERC-20 token transfers if applicable). For Tron addresses, use the Tron explorer or node API to get account info (which includes balance and TRC-20 token balances).
   * *WebSocket subscription:* NOWNodes supports WebSockets (WSS) on both full nodes and blockbook for certain chains (see “WSS” and “BB WSS” in the endpoint list above). For real-time updates, you could connect to `wss://btcbook.nownodes.io/wss` (for BTC) or similar, and subscribe to address events. For example, NOWNodes’ blockbook API supports subscribing to specific addresses to get notified when a new transaction involving that address occurs. However, using WebSockets in a serverless environment (like Next.js API routes) can be tricky, so an alternative is running a background service or using polling combined with client-side updates. In this documentation, we’ll focus on the simpler polling method for clarity.

5. **Forward Funds to Merchant Wallet:** Once the payment is detected (optionally after a certain number of confirmations, which you can configure per coin), Fundpath will **forward the funds** from the deposit address to the merchant’s own wallet address. This is an on-chain transaction executed by the platform: Fundpath uses the private key of the deposit address to create and sign a transaction sending the full received amount (minus any fees or merchant service charges) to the merchant’s address. This step requires interacting with the blockchain (again via NOWNodes) to broadcast the signed transaction. After broadcasting, the payment is considered complete on our side – the merchant will receive the crypto directly in their wallet.

6. **Post-processing:** Fundpath can notify the merchant via webhook or update the payment status in the database at this point. Any service fee (e.g. Fundpath’s commission) can be accounted for either by invoicing separately or deducting from the payment amount (similar to NOWPayments’ 0.5% fee model, which merchants can choose to cover or pass to customers).

Throughout this flow, NOWNodes is used for **blockchain communication**: we query blockchain data (address balances, transactions) and broadcast transactions through NOWNodes endpoints. Next, we will dive into the technical implementation of key steps: creating deposit addresses, monitoring payments, and forwarding funds.

## Generating Deposit Addresses (Wallet Management)

Fundpath is **non-custodial**, meaning merchants ultimately control the funds, but the platform still needs to generate unique addresses for each payment in order to track them. There are two possible approaches to address generation:

* **Platform-Generated Addresses (with Forwarding):** Fundpath generates a new address from its own wallet infrastructure for each payment. The platform holds the private key for that address temporarily, solely to forward the funds. After forwarding, the key can be discarded. This approach is straightforward and what we’ll describe in detail. It does mean the platform has control of funds in transit (so *technically* custodial for a short time), but “non-custodial” is usually meant in the sense that funds don’t stay with the platform and are immediately passed to the merchant. This is how NOWPayments operates (they generate a deposit address and then transfer funds to the merchant).

* **Merchant-Provided Xpub (truly non-custodial):** For advanced users, Fundpath could allow a merchant to provide an extended public key (xpub) or equivalent for each coin. The platform can derive addresses from the merchant’s xpub for each invoice. The customer pays to an address that directly belongs to the merchant (the merchant holds the private key via their own wallet). The platform can monitor the address and mark the invoice paid without ever controlling the funds. This is truly non-custodial since Fundpath never has the keys. However, implementing this requires more complexity on the merchant’s side (they must manage HD wallets and share public keys), so we’ll proceed with the platform-generated address approach for simplicity.

Regardless of the approach, NOWNodes itself does **not** generate wallet addresses for you – you must use cryptographic libraries or your own node’s wallet RPC. If you had a dedicated node with wallet support, you could use JSON-RPC methods like Bitcoin’s `getnewaddress`, but on NOWNodes’ shared nodes, wallet RPC methods are typically not available for security reasons. Instead, we will use libraries to generate keys locally.

**Address Generation per Blockchain:**

* **Bitcoin (and other UTXO coins like Litecoin, etc.):** You can use a library like [bitcoinjs-lib](https://github.com/bitcoinjs/bitcoinjs-lib) to create a new key pair and address. For example, to create a SegWit Bitcoin address (P2WPKH):

  ```js
  const bitcoin = require('bitcoinjs-lib');
  const keyPair = bitcoin.ECPair.makeRandom();  // generate random private key
  const { address } = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey });
  console.log("New BTC address:", address);
  // Store keyPair.privateKey securely (e.g. encrypted) for later use in forwarding
  ```

  This will output an address starting with `bc1...` (Bech32 format). You would save the address along with the private key (or WIF) in your database, associated with the payment request. Similarly, for **Bitcoin Cash, Litecoin, Dogecoin, etc.**, you can generate addresses with their respective libraries or using bitcoinjs with appropriate network parameters.

* **Ethereum (ETH) and EVM Chains (BSC, etc.):** Ethereum-based addresses are derived from ECDSA keys. Using the [ethers.js](https://docs.ethers.io/) library:

  ```js
  const { Wallet } = require('ethers');
  const wallet = Wallet.createRandom();  // generates a random Ethereum private key
  console.log("New ETH address:", wallet.address);
  ```

  This yields an address starting with `0x`. The `wallet` object contains a `privateKey` property – store that securely. The same method can be used for Binance Smart Chain (addresses are of the same format as Ethereum). In fact, the Ethereum address space is used; no special prefix changes. Just note which chain the address is intended for (ETH vs BSC) in your records.

* **Tron (TRX):** Tron uses a similar key type (secp256k1 ECDSA) but addresses are represented differently (Base58-check encoding with a T... prefix). You can use [TronWeb](https://github.com/tronprotocol/tron-web) or Tron’s official SDK to generate addresses. For example, using TronWeb:

  ```js
  const TronWeb = require('tronweb');
  const newAccount = await TronWeb.createAccount();
  console.log("New TRX address:", newAccount.address.base58);
  // newAccount.privateKey contains the private key
  ```

  This returns a new Tron address (e.g. `TXYZ...`) and a private key. The TronWeb library’s `createAccount()` is asynchronous (hence the `await`). Make sure to save the `privateKey` from the result. (Alternatively, you could generate an Ethereum-style key and convert it to Tron format – Tron addresses are essentially the hex form of the public key hashed (like Ethereum) but with different encoding. TronWeb abstracts this for you.)

* **Toncoin (TON):** TON addresses are ed25519-based and have a user-friendly format (starting with `EQ...` for mainnet). You would use a TON SDK (such as tonweb or ton-core libraries) to create a wallet and get an address. This can be complex due to TON’s contract-based wallets and workchains, but essentially you’d generate a key pair and derive the wallet address. (For brevity, the code for TON address generation is omitted, but TON developers can use **tonweb** or **Ton SDK** to get a wallet address and seed.) NOWNodes provides a TON indexer but not wallet creation; so key generation is done off-chain.

* **Solana (SOL):** Solana uses ED25519 keys. You can use the official [solana web3.js](https://solana-labs.github.io/solana-web3.js/) library:

  ```js
  const solanaWeb3 = require('@solana/web3.js');
  const keypair = solanaWeb3.Keypair.generate();
  const solAddress = keypair.publicKey.toBase58();
  console.log("New SOL address:", solAddress);
  ```

  This outputs a Solana public key (e.g. a 44-character base58 string). Save the `keypair.secretKey` bytes securely for signing transactions later.

* **USDT/USDC Tokens:** These are not separate blockchains, but tokens on Ethereum, Tron, etc. The deposit address for a token payment will be an address on the underlying chain (e.g. an Ethereum address for USDT-ERC20, a Tron address for USDT-TRC20). So no special generation is needed beyond creating the Ethereum/Tron address as above. Just be mindful of which network the token is on. For example, if a merchant wants USDT on Tron, generate a Tron address; for USDC on Ethereum, generate an Ethereum address.

**Security Considerations:** In all cases, **securely store the private keys**. Since Next.js API routes run on a server, you should not log or expose private keys. Ideally, encrypt them in your database or use a vault. If using an HD wallet approach, you might derive addresses from a master seed and store only the derivation index (the master seed could be in memory or in an HSM). But an in-depth wallet security design is beyond this scope – just ensure only your server can access the keys and that they are deleted after use if not needed.

## Handling Incoming Payments (Monitoring Deposits)

Once a deposit address is created and given to the customer, Fundpath needs to detect when the payment arrives on-chain. We can utilize NOWNodes’ explorer APIs or node APIs to monitor the address. Here are methods for different scenarios, along with examples:

**1. Querying Address Balance/Transactions via REST API:** For many chains, NOWNodes runs a Blockbook explorer which provides a convenient REST endpoint to get address details. When a customer claims to have paid (or on a schedule, e.g. every 10 seconds), your backend can call these endpoints:

* **Bitcoin Example (Address API):** Use the BTC Blockbook endpoint to get address info. This returns the balance, total received, total sent, and transaction list for the address.

  ```js
  // Example: Check Bitcoin address for new payments
  const depositAddress = "bc1qw4k...";  // the BTC deposit address to check
  const url = `https://btcbook.nownodes.io/api/v2/address/${depositAddress}`;
  const response = await fetch(url, { headers: { "api-key": process.env.NOWNODES_API_KEY } });
  const data = await response.json();
  console.log(`BTC Address ${depositAddress} balance: ${data.balance} satoshis, total TXs: ${data.txCount}`);
  ```

  In the JSON response, `balance` is the confirmed balance in satoshis, and `txCount` or `transactions` will indicate if a new transaction is present. You can inspect the transactions array to confirm the expected amount has arrived. For UTXO coins, you might specifically check the latest transaction outputs to ensure the deposit address received the required amount. (Blockbook API typically includes a list of UTXOs or you can call `/api/v2/utxo/<address>` to get unspent outputs.)

* **Ethereum Example (Address API):** The Ethereum explorer endpoint (`eth-blockbook.nownodes.io`) can similarly provide the ETH balance and a list of transactions involving the address. If the payment is in ETH, you can simply check the balance field. If the payment is an ERC-20 token (USDT, USDC), you need to detect token transfers. Blockbook might list token transfers in the transactions (some explorer APIs include token transfer events for addresses). If not, another approach is needed (see below for contract event querying).

  *Using Web3:* Alternatively, you can use web3/ethers with NOWNodes as the provider to check balances. For instance, using ethers.js with NOWNodes:

  ```js
  const { ethers } = require('ethers');
  const provider = new ethers.JsonRpcProvider({ url: "https://eth.nownodes.io", headers: { "api-key": process.env.NOWNODES_API_KEY } });
  const balanceWei = await provider.getBalance(depositAddress);
  console.log("ETH balance (wei):", balanceWei.toString());
  ```

  This will return the ETH balance. For ERC-20 tokens, you can use `provider.call` or an ethers `Contract` instance to query the token’s `balanceOf`. For example:

  ```js
  const usdtAddress = "<USDT_ERC20_contract_address>";
  const erc20Abi = [ "function balanceOf(address) view returns (uint256)" ];
  const usdtContract = new ethers.Contract(usdtAddress, erc20Abi, provider);
  const tokenBalance = await usdtContract.balanceOf(depositAddress);
  console.log("USDT (ERC20) balance:", tokenBalance.toString());
  ```

  Compare the tokenBalance with the expected amount (in smallest units, e.g. wei for ETH or token’s decimals for tokens) to determine if the payment is received.

* **Tron Example (Account API):** Tron’s full node API provides an account endpoint that returns balances. Using NOWNodes’ Tron node (`trx.nownodes.io`), you can call the `/wallet/getaccount` method. With TronWeb, it would be:

  ```js
  const tronWeb = new TronWeb({ fullHost: "https://trx.nownodes.io", headers: { "api-key": process.env.NOWNODES_API_KEY } });
  const accountInfo = await tronWeb.trx.getAccount(depositAddress);
  console.log("TRX balance:", accountInfo.balance);
  ```

  The returned `accountInfo` will include the TRX balance (in sun, where 1 TRX = 1e6 sun), and if the address has TRC-20 tokens, it often contains a `trc20` array with objects mapping token addresses to balances. You could check that array for the USDT contract address to get the USDT balance. If using the Tron explorer (Blockbook) at `trx-blockbook.nownodes.io`, you can attempt a similar GET request as Bitcoin. The explorer might list TRX transactions; for TRC20, you might still need to rely on the account info or an event query.

* **Solana Example (RPC call):** Solana’s RPC can be accessed via NOWNodes at `sol.nownodes.io`. Using Solana web3:

  ```js
  const solanaWeb3 = require('@solana/web3.js');
  const connection = new solanaWeb3.Connection("https://sol.nownodes.io", "confirmed");  // using confirmed commitment
  const balanceLamports = await connection.getBalance(new solanaWeb3.PublicKey(depositAddress));
  console.log("SOL balance:", balanceLamports, "lamports");
  ```

  You might also subscribe to account changes using `connection.onAccountChange` if maintaining a persistent service.

* **TON Example (Indexer API):** NOWNodes provides a TON indexer (`ton-index.nownodes.io`) which can give you rich data without running a full archive node. For instance, you can fetch transactions for a TON wallet address via a single call. Example (from NOWNodes docs):

  ```bash
  curl --request GET \
    --url 'https://ton-index.nownodes.io/transactions?account=EQDa4VOnTYlLvDJ0gZjNYm5PXfSmmtL6Vs6A_CZEtXCNICq_&limit=10&sort=desc' \
    --header 'api-key: YOUR_API_KEY'
  ```

  This would return the most recent transactions involving the specified TON address. From the data, you can determine if an expected payment (by amount or other identifier) has arrived. TON transactions don’t use “confirmations” in the same way, but you may wait for a block inclusion. NOWNodes’ indexer can also give account state (balance, etc.), though TON’s architecture is unique with persistent state in each account.

**2. Using WebSockets for Push Notifications (optional):** As mentioned, NOWNodes’ WSS endpoints can push new transaction info. For example, you could connect to `wss://btcbook.nownodes.io/wss` and then send a subscription message (Blockbook uses a JSON message like `{ "op": "addr_sub", "addr": "<address>" }` to subscribe to an address). Upon any new transaction, you’d receive a message. Similarly, Ethereum’s `eth.nownodes.io/wss` could allow subscribing to new heads or logs. If you run an always-on Node.js service (outside of Next.js API routes), this is an efficient way to get real-time updates. However, implementing that is beyond the scope of this documentation; a polling approach is simpler to illustrate.

**3. Confirmations and Filtering:** Ensure you check for **confirmations** if required. The Blockbook address API will typically show confirmed balance. If you want to wait for e.g. 1 confirmation, you can ignore unconfirmed transactions (or require `tx.confirmations > 0`). For Ethereum, by default `getBalance` shows the latest confirmed state (so once a transaction is in a block, it’s reflected). You might choose to wait a few blocks for safety on PoW chains. For Tron, transactions are near-instant finality (within a few seconds and confirmed in subsequent blocks). Solana has different commitment levels (we used `"confirmed"` above; you could use `"finalized"` for stronger assurance).

**Example – Checking a BTC Address (Next.js API route):** Here is a sample Next.js API route (`pages/api/checkPayment.js`) that could be used to check if a given invoice’s address received the payment:

```js
// pages/api/checkPayment.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { coin, address, expectedAmount } = req.query;
  const apiKey = process.env.NOWNODES_API_KEY;
  try {
    if (coin === 'BTC') {
      const url = `https://btcbook.nownodes.io/api/v2/address/${address}`;
      const resp = await fetch(url, { headers: { 'api-key': apiKey } });
      if (!resp.ok) throw new Error(`Error: ${resp.status}`);
      const data = await resp.json();
      const balanceSat = parseInt(data.balance);
      // expectedAmount for BTC might be provided in satoshis or BTC, adjust accordingly
      if (balanceSat >= expectedAmount) {
        return res.status(200).json({ paid: true, confirmedBalance: balanceSat });
      } else {
        return res.status(200).json({ paid: false, confirmedBalance: balanceSat });
      }
    }
    // Handle other coins similarly...
    // ETH: use provider.getBalance or explorer API
    // TRX: use tronWeb or node fetch to /wallet/getaccount
    // etc.
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
```

In practice, you would likely identify the payment by an ID and look up the address from your database rather than pass it in query, but this illustrates the use of NOWNodes API in a Next.js route. The route returns JSON indicating if the payment has been received.

With monitoring in place (either via polling or event-driven), once you detect the required amount is paid, you can proceed to the final step – forwarding the funds to the merchant.

## Forwarding Payments to the Merchant

Forwarding the payment involves creating a new blockchain transaction from the deposit address (where the money just arrived) to the merchant’s destination address. This is done separately for each payment. We will use the private key of the deposit address to sign the transaction, and then broadcast it via NOWNodes. Let’s break it down by blockchain:

**Bitcoin (UTXO) Forwarding:** After a BTC payment arrives at the deposit address, you have one or more UTXOs (unspent outputs) now controlled by that address’s private key. To forward the entire amount to the merchant:

1. Fetch the UTXOs for the deposit address. Using the blockbook API: `GET https://btcbook.nownodes.io/api/v2/utxo/<address>` will list all unspent outputs with their txid, output index, and value.
2. Construct a raw transaction that spends those outputs and sends the value to the merchant’s BTC address. You’ll need to calculate an appropriate miner fee and subtract it from the total; the difference between inputs and outputs is the fee. For example, if the address received 0.01 BTC, you might create a transaction sending 0.0099 BTC to the merchant and leaving 0.0001 BTC as fee (just an example, fees should be dynamically calculated based on size in vbytes and current fee rates).
3. Sign the transaction with the deposit address’s private key. Libraries like bitcoinjs-lib can create and sign transactions:

   ```js
   // using bitcoinjs-lib to build and sign the tx
   const { ECPair, payments, TransactionBuilder } = require('bitcoinjs-lib');
   const keyPair = ECPair.fromWIF(depositAddressWIF);
   const { address: depositAddrCheck } = payments.p2wpkh({ pubkey: keyPair.publicKey });
   // (depositAddrCheck should match the deposit address)
   const txb = new TransactionBuilder(bitcoin.networks.bitcoin);
   // add each UTXO as input
   utxos.forEach(utxo => {
     txb.addInput(utxo.txid, utxo.vout);
   });
   // add one output sending to merchant
   txb.addOutput(merchantAddress, amountToSendSatoshis);
   // (change output not needed if sending all minus fee)
   // sign each input
   utxos.forEach((utxo, index) => {
     txb.sign(index, keyPair);
   });
   const rawTxHex = txb.build().toHex();
   ```
4. Broadcast the raw transaction via NOWNodes. You can use the BTC full node RPC endpoint for this. For example:

   ```js
   await fetch("https://btc.nownodes.io", {
     method: "POST",
     headers: { "api-key": apiKey, "Content-Type": "application/json" },
     body: JSON.stringify({
       jsonrpc: "2.0", id: "sendTx", method: "sendrawtransaction", params: [ rawTxHex ]
     })
   });
   ```

   If successful, the node will return the transaction hash. (Alternatively, NOWNodes’ blockbook has a shortcut: `POST https://btcbook.nownodes.io/api/v2/sendtx/` with the raw hex in the body or as a query param will also broadcast the transaction.)

After broadcasting, the BTC will be on its way to the merchant. The merchant receives it as a normal transaction from your deposit address. **Note:** The merchant will pay the network fee by effectively receiving slightly less than the customer sent (if you deduct the fee). This aligns with NOWPayments’ non-custodial flow where the merchant covers the withdrawal (forwarding) fee. You could also choose to cover the fee as part of your service (reducing your revenue), but typically the merchant is responsible for it.

**Ethereum/BSC Forwarding:** For Ethereum-like chains, the deposit address will have the funds/tokens that need to be forwarded:

* If the payment was in **ETH (or BNB, etc.):** Simply create a transaction sending that amount from the deposit address to the merchant’s address. You can use ethers.js with NOWNodes as provider:

  ```js
  const provider = new ethers.JsonRpcProvider({ url: "https://eth.nownodes.io", headers: { "api-key": API_KEY } });
  const wallet = new ethers.Wallet(depositPrivateKey, provider);
  // Determine gas price (you can use provider.getFeeData())
  const tx = await wallet.sendTransaction({
    to: merchantAddress,
    value: ethers.parseEther(amountEth)  // amountEth as string, e.g. "0.5" for 0.5 ETH
    // You can specify gasPrice and gasLimit if needed, or let ethers estimate
  });
  console.log("Forwarding ETH tx sent, hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("Forwarding confirmed in block", receipt.blockNumber);
  ```

  This will automatically deduct gas fees from the deposit address’s balance. Make sure the deposit address has a little extra ETH beyond the amount to forward, to cover the gas. If the customer’s payment was exactly the invoice amount, you might end up short for gas. One strategy is to invoice slightly above the amount or have a secondary ETH funding mechanism. Alternatively, you can *pre-fund* the deposit address with a tiny amount of ETH when generating it (especially if expecting an ERC-20 token payment, since then the address initially has 0 ETH for gas).

* If the payment was in **ERC-20 token (USDT, USDC on Ethereum) or BEP-20 on BSC:** The deposit address will now hold that token balance. To forward it, you must execute a token transfer from the deposit address to the merchant’s address:

  * Ensure the deposit address has enough native coin (ETH or BNB) to pay gas. (For example, an ERC-20 transfer might cost \~50k gas. If gas price is 20 gwei, that’s 0.001 ETH or so. Fund accordingly.)
  * Use the token’s contract. For USDT (ERC20) on Ethereum, the contract address is well-known (e.g. Tether’s Ethereum contract at `0xdAC17F958D2ee523a2206206994597C13D831ec7`). For USDC, use its contract (e.g. `0xA0b86991c6218b36c1d19D4a2e9EB0cE3606EB48`). On BSC, use the BSC token contracts accordingly.
  * Use ethers.js or web3 to call the `transfer` function. For instance:

    ```js
    const tokenContract = new ethers.Contract(tokenAddress, ["function transfer(address to, uint256 value) public returns (bool)"], wallet);
    const tx = await tokenContract.transfer(merchantAddress, tokenAmount);
    console.log(`${tokenSymbol} transfer tx:`, tx.hash);
    await tx.wait();
    console.log("Token forwarded.");
    ```

    Here, `tokenAmount` is the integer amount in the token’s smallest unit (for USDT/USDC which have 6 decimals, to transfer 50 USDT you’d use `50000000` as the value).
  * NOWNodes will relay this transaction just like any other, since it goes through the connected Ethereum node.

**Tron Forwarding:** For Tron, the approach is analogous:

* For **TRX (Tron’s native coin):** Use TronWeb or call the RPC to create a transfer. With TronWeb, you could do:

  ```js
  tronWeb.setPrivateKey(depositPrivateKey);
  const tx = await tronWeb.trx.sendTransaction(merchantAddress, tronAmountSun);
  console.log("TRX forward TXID:", tx.txid);
  ```

  Tron transactions are very fast and cost negligible fees (a small amount of bandwidth, and possibly energy if smart contracts are involved). TRX transfers consume bandwidth which refills daily up to a limit; if the account has none, it will burn a tiny amount of TRX as fee.
* For **USDT TRC-20 on Tron:** USDT on Tron is a TRC20 token (contract address `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` on Tron mainnet). Forwarding it requires a contract call:

  ```js
  tronWeb.setPrivateKey(depositPrivateKey);
  const usdtContract = await tronWeb.contract().at("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t");
  const tx = await usdtContract.transfer(merchantAddress, tokenAmount).send();
  console.log("USDT-TRC20 forward TX:", tx);
  ```

  In TronWeb, `tokenAmount` should be an integer in the token’s smallest unit (USDT has 6 decimals on Tron as well). Tron’s fees for TRC20 involve energy; if the account has TRX frozen for energy or not, it might consume some TRX. Ensure the deposit address has a little TRX (a few TRX at least) to cover the fee or energy cost of the TRC20 transfer. If not, Tron will not execute the contract call. One strategy: when generating a Tron address for USDT, pre-fund it with e.g. 0.1 TRX from a central account to allow one token transfer.

  NOWNodes supports Tron full-node API, so the above TronWeb calls are actually hitting `trx.nownodes.io` under the hood (we set the fullHost to NOWNodes). The `send()` in TronWeb will broadcast the transaction through NOWNodes.

**Solana Forwarding:** For SOL, you would create a transaction with a transfer instruction from the deposit keypair to the merchant’s public key. Using solana web3.js:

```js
let transaction = new solanaWeb3.Transaction().add(
  solanaWeb3.SystemProgram.transfer({
    fromPubkey: depositKeypair.publicKey,
    toPubkey: new solanaWeb3.PublicKey(merchantAddress),
    lamports: amountLamports
  })
);
transaction.feePayer = depositKeypair.publicKey;
transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
transaction.sign(depositKeypair);
const txId = await connection.sendRawTransaction(transaction.serialize());
```

This sends SOL to the merchant. Solana fees are very low (\~0.000005 SOL). As with others, ensure deposit keypair has enough lamports for fee (which is usually negligible relative to any payment amount).

If supporting SPL tokens (like USDC on Solana), you’d need to include token program instructions (transfer tokens from the deposit token account to the merchant’s token account, possibly creating the token account if not exists). That requires more Solana-specific logic (using `Token` class or SPL libraries), which we won’t delve into here due to complexity. Many payment platforms avoid forwarding on Solana by directly asking for the merchant’s address if using SPL tokens.

**Broadcasting and Verification:** After broadcasting the forward transaction, you can use NOWNodes to verify it (e.g. fetch the tx hash on an explorer to confirm it’s in mempool or mined). It’s good to log the transaction hash and perhaps update the payment status to “completed” after a confirmation.

**Example – Forwarding ETH in a Next.js API route:** To illustrate, here’s a simplified example of an API route that forwards an Ethereum payment (assuming we know the deposit private key and target):

```js
// pages/api/forwardPayment.js
import { ethers } from "ethers";

export default async function handler(req, res) {
  const { depositPrivateKey, merchantAddress, amountEth } = req.body;
  if (!depositPrivateKey || !merchantAddress) {
    return res.status(400).json({ error: "Missing parameters" });
  }
  try {
    const provider = new ethers.JsonRpcProvider({ url: "https://eth.nownodes.io", headers: { "api-key": process.env.NOWNODES_API_KEY } });
    const wallet = new ethers.Wallet(depositPrivateKey, provider);
    const tx = await wallet.sendTransaction({
      to: merchantAddress,
      value: ethers.parseEther(amountEth)
    });
    console.log("Forward tx sent:", tx.hash);
    // You might not want to wait for confirmation in an API call, but you could:
    const receipt = await tx.wait(1); // wait for 1 confirmation
    console.log("Forward tx confirmed in block", receipt.blockNumber);
    return res.status(200).json({ success: true, txHash: tx.hash });
  } catch (err) {
    console.error("Forwarding failed:", err);
    return res.status(500).json({ error: err.message });
  }
}
```

In a real setup, this might be triggered automatically by your backend when a payment is detected, rather than exposed as a public API. But it demonstrates using NOWNodes (via provider) to broadcast a transaction. The same concept applies for other coins: use their RPC via NOWNodes or an SDK pointing to NOWNodes, sign with the deposit key, and send.

## Supporting Smart Contracts (USDT and USDC)

Fundpath aims to support stablecoins like USDT and USDC on multiple networks. This section highlights considerations specifically for these tokens:

* **USDT on Ethereum (ERC-20):** The USDT ERC20 contract is at Ethereum address `0xdAC17F958D2ee523a2206206994597C13D831ec7`. After a user sends USDT to the deposit ETH address, you’ll detect it by reading the token balance or listening for the `Transfer` event. To forward USDT, call the `transfer` method as described, using the deposit address’s private key. Note that USDT’s contract might have a small transfer fee (earlier implementations had pauses or fees, but Tether’s current implementation on Ethereum is standard). Always ensure the deposit address has ETH for gas.

* **USDT on Tron (TRC-20):** The TRC20 contract address for USDT on Tron is `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`. It’s important to interact with the Tron network in terms of SUN (1 USDT has 6 decimals, so 1 USDT = 1,000,000 micro-USDT on Tron as well). Tron’s API does not mirror Ethereum’s JSON-RPC; using TronWeb as shown is the easiest route. Also, Tron addresses must start with `T` – ensure you do not accidentally use the Ethereum-format address for Tron or vice versa (USDT can exist on many chains, always use the correct deposit address format for the network the user chose). The forwarding transaction on Tron should be near-instant.

* **USDC on Ethereum (ERC-20):** USDC’s Ethereum contract is `0xA0b86991c6218b36c1d19D4a2e9EB0cE3606EB48`. It works similarly to USDT. Use `transfer` via ethers.js. USDC has 6 decimals as well. Watch out for the fact that USDC (and USDT) may have a low-level requirement of approving spending when interacting from a third-party contract, but since we are doing a direct `transfer` from the address that holds the tokens, that’s fine.

* **USDC on Solana (SPL):** If you extend support to Solana USDC (which is a popular stablecoin on Solana), note that Solana uses a different mechanism (spl-token accounts). You’d need to ensure the merchant has an SPL token account for USDC, or create one on the fly (which costs a small rent fee in SOL). You’d then use the Solana Token Program to transfer. NOWNodes provides only the Solana node – you’d use solana web3.js or similar to craft the token transfer instruction.

* **Other Tokens (ERC20/BEP20/TRC20):** The general pattern for any token is: have the contract address, and use the appropriate method to send tokens from deposit to merchant. For EVM (ETH/BSC/etc.), that’s an ERC20 transfer. For Tron, a TRC20 transfer via TronWeb. Ensure gas coins are available. The NOWNodes API doesn’t abstract token operations – you interact with the chain’s RPC as you normally would, and NOWNodes simply passes your transactions to the network.

* **Handling Failures:** Smart contract transactions can fail (out-of-gas, etc.). Use try-catch and check receipts. For instance, after sending an ERC20 transfer, you might get a receipt with `status: 0` indicating failure. Handle these by logging and possibly retrying with adjusted gas. NOWNodes will relay the TX but if it fails on-chain, you’d need to act accordingly (perhaps top up gas and retry).

## Conclusion

By using NOWNodes as our blockchain connectivity layer, we can build a multi-cryptocurrency payment gateway without running any nodes ourselves. The steps to integrate are:

* **Initialize NOWNodes**: obtain an API key and note the endpoints for each blockchain we support (BTC, ETH, BSC, TRON, TON, SOL, etc.). The NOWNodes service gives us reliable access to send RPC requests and get data from over 100 blockchains with a unified API key.

* **Wallet Management**: generate deposit addresses for each payment using appropriate libraries (ensuring the format matches the blockchain). These addresses are one-time-use and linked to the payment request in our database.

* **Monitoring**: continuously or periodically check the blockchain (via NOWNodes APIs) for incoming funds at those addresses. This can be done through REST calls to explorer endpoints (as shown in examples) or via WebSocket subscriptions for real-time updates. For instance, calling the address API can reveal when a transaction hits the address, and specialized indexer calls (like TON’s) can list transactions by account.

* **Forwarding**: once detected, create and sign a transaction from the deposit address to the merchant. Use chain-specific methods – e.g., construct a Bitcoin TX and broadcast via `sendrawtransaction`, or use ethers.js for Ethereum to send a transaction/token transfer using the deposit wallet. NOWNodes’ node endpoints are used to propagate these transactions to the network.

* **Finalize**: update the payment status as complete, notify the merchant, and handle any post-processing (fees, conversions if any, etc.). For transparency, you may provide transaction hashes to merchants for both the incoming payment (customer -> deposit) and the outgoing forwarding (deposit -> merchant) so they can track on block explorers as needed.

Throughout development, refer to NOWNodes documentation and Postman collection for specific API usage and examples. NOWNodes essentially acts as our bridge to each blockchain, so any JSON-RPC or REST call we need can be made through their endpoints by including our API key for authentication. This significantly simplifies the infrastructure needed to support a wide array of cryptocurrencies on Fundpath.

By following this guide and using the code snippets as a starting point, you can implement a robust crypto payment gateway that supports BTC, ETH, USDT (ERC20 & TRC20), TON, SOL, USDC, BNB, TRX, and more. As always, test thoroughly on testnets where available (e.g. Bitcoin testnet, Sepolia for Ethereum, Shasta for Tron, etc. – NOWNodes provides testnet endpoints too) before going live, to ensure your integration handles all edge cases (confirmations, partial payments, network fees, etc.). Good luck with building Fundpath!

**Sources:** The design of this non-custodial flow is inspired by NOWPayments’ model, and all blockchain interactions are enabled by NOWNodes’ Blockchain-as-a-Service API which supports a wide range of networks through unified endpoints. For more detailed references on specific API calls and examples, see the NOWNodes official documentation and blogs.
