import React, { useState } from "react";
import {
  PaymasterMode,
  createSmartAccountClient,
  createSessionKeyEOA,
  BiconomySmartAccountV2,
  createSessionSmartAccountClient,
  createBundler,
  CreateSessionDataParams,
  createABISessionDatum,
  createBatchSession,
  getBatchSessionTxParams,
  Session,
} from "@biconomy/account";
import { contractABI } from "../contract/contractABI";
import { ethers } from "ethers";
import { encodeFunctionData, parseAbi } from "viem";
import { polygonAmoy, sepolia } from "viem/chains";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Home() {
  const [smartAccount, setSmartAccount] =
    useState<BiconomySmartAccountV2 | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(
    null
  );
  const [chainSelected, setChainSelected] = useState<number>(0);
  const [count, setCount] = useState<string | null>(null);
  const [nftCount, setNftCount] = useState<string | null>(null);
  const [txnHash, setTxnHash] = useState<string | null>(null);

  const chains = [
    {
      chainNo: 0,
      chainId: 11155111,
      name: "Ethereum Sepolia",
      providerUrl: "https://eth-sepolia.public.blastapi.io",
      incrementCountContractAdd: "0xd9ea570eF1378D7B52887cE0342721E164062f5f",
      nftAddress: "0x1758f42Af7026fBbB559Dc60EcE0De3ef81f665e",
      biconomyPaymasterApiKey: "gJdVIBMSe.f6cc87ea-e351-449d-9736-c04c6fab56a2",
      explorerUrl: "https://sepolia.etherscan.io/tx/",
      chain: sepolia,
      bundlerUrl:
        "https://bundler.biconomy.io/api/v2/11155111/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44",
      paymasterUrl:
        "https://paymaster.biconomy.io/api/v1/11155111/gJdVIBMSe.f6cc87ea-e351-449d-9736-c04c6fab56a2",
    },
    {
      chainNo: 1,
      chainId: 80002,
      name: "Polygon Amoy",
      providerUrl: "https://rpc-amoy.polygon.technology/",
      incrementCountContractAdd: "0xfeec89eC2afD503FF359487967D02285f7DaA9aD",
      nftAddress: "0x1758f42Af7026fBbB559Dc60EcE0De3ef81f665e",
      biconomyPaymasterApiKey: "TVDdBH-yz.5040805f-d795-4078-9fd1-b668b8817642",
      explorerUrl: "https://www.oklink.com/amoy/tx/",
      chain: polygonAmoy,
      bundlerUrl:
        "https://bundler.biconomy.io/api/v2/80002/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44",
      paymasterUrl:
        "https://paymaster.biconomy.io/api/v1/80002/TVDdBH-yz.5040805f-d795-4078-9fd1-b668b8817642",
    },
  ];

  const withSponsorship = {
    paymasterServiceData: { mode: PaymasterMode.SPONSORED },
  };

  const createSessionWithSponsorship = async () => {
    const toastId = toast("Creating Session", { autoClose: false });

    const { sessionKeyAddress, sessionStorageClient } =
      await createSessionKeyEOA(
        //@ts-ignore
        smartAccount,
        chains[chainSelected].chain
      );

    const abiSessionLeaf1: CreateSessionDataParams = createABISessionDatum({
      interval: {
        validUntil: 0,
        validAfter: 0,
      },
      sessionKeyAddress,
      //@ts-ignore
      contractAddress: chains[chainSelected].incrementCountContractAdd,
      functionSelector: "increment()",
      rules: [],
      valueLimit: BigInt(0),
    });

    const abiSessionLeaf2: CreateSessionDataParams = createABISessionDatum({
      interval: {
        validUntil: 0,
        validAfter: 0,
      },
      sessionKeyAddress,
      //@ts-ignore
      contractAddress: chains[chainSelected].nftAddress,
      functionSelector: "safeMint(address)",
      rules: [
        {
          offset: 0,
          condition: 0,
          //@ts-ignore
          referenceValue: smartAccountAddress,
        },
      ],
      valueLimit: BigInt(0),
    });

    const policyLeaves: CreateSessionDataParams[] = [
      abiSessionLeaf1,
      abiSessionLeaf2,
    ];

    const { wait, session } = await createBatchSession(
      //@ts-ignore
      smartAccount,
      sessionStorageClient,
      policyLeaves,
      withSponsorship
    );

    const {
      receipt: { transactionHash },
      success,
    } = await wait();

    console.log(success, transactionHash);

    toast.update(toastId, {
      render: "Session Creation Successful",
      type: "success",
      autoClose: 5000,
    });
  };

  const batchTxn = async () => {
    const toastId = toast("Batching Txns", { autoClose: false });

    const emulatedUsersSmartAccount = await createSessionSmartAccountClient(
      {
        //@ts-ignore
        accountAddress: smartAccountAddress, // Dapp can set the account address on behalf of the user
        bundlerUrl: chains[chainSelected].bundlerUrl,
        paymasterUrl: chains[chainSelected].paymasterUrl,
        chainId: chains[chainSelected].chainId,
      },
      smartAccountAddress,
      // sessionId,
      // a) Full Session, b) storage client or c) the smartAccount address (if using default storage for your environment)
      true // if in batch session mode
    );

    const minTx = {
      to: chains[chainSelected].incrementCountContractAdd,
      data: encodeFunctionData({
        abi: contractABI,
        functionName: "increment",
        args: [],
      }),
    };

    console.log("minTx Data", minTx.data);

    const nftMintTx = {
      to: chains[chainSelected].nftAddress,
      data: encodeFunctionData({
        abi: parseAbi(["function safeMint(address _to)"]),
        functionName: "safeMint",
        //@ts-ignore
        args: [smartAccountAddress],
      }),
    };

    console.log("nftMintTx Data", nftMintTx.data);

    const txs = [minTx, nftMintTx];

    const batchSessionParams = await getBatchSessionTxParams(
      //@ts-ignore
      txs,
      [0, 1],
      // Order must match the order in which corresponding policies were set
      //@ts-ignore
      smartAccountAddress, // Storage client, full Session or simply the smartAccount address if using default storage for your environment
      chains[chainSelected].chain
    );

    const { wait } = await emulatedUsersSmartAccount.sendTransaction(
      //@ts-ignore
      txs,
      {
        ...batchSessionParams,
        ...withSponsorship,
      }
    );

    const {
      receipt: { transactionHash },
      success,
    } = await wait();

    setTxnHash(transactionHash);

    toast.update(toastId, {
      render: "Transation Successful",
      type: "success",
      autoClose: 5000,
    });
  };

  const getCountId = async () => {
    const toastId = toast("Getting Count", { autoClose: false });
    const contractAddress = chains[chainSelected].incrementCountContractAdd;
    const provider = new ethers.providers.JsonRpcProvider(
      chains[chainSelected].providerUrl
    );
    const contractInstance = new ethers.Contract(
      contractAddress,
      contractABI,
      provider
    );
    const countId = await contractInstance.getCount();
    setCount(countId.toString());
    toast.update(toastId, {
      render: "Successful",
      type: "success",
      autoClose: 5000,
    });
  };

  const getNftCount = async () => {
    const toastId = toast("Getting Count", { autoClose: false });
    const contractAddress = chains[chainSelected].nftAddress;
    const provider = new ethers.providers.JsonRpcProvider(
      chains[chainSelected].providerUrl
    );
    const ERC721_ABI = [
      "function balanceOf(address owner) view returns (uint256)",
    ];
    const contractInstance = new ethers.Contract(
      contractAddress,
      ERC721_ABI,
      provider
    );
    const nftCount = await contractInstance.balanceOf(smartAccountAddress);
    setNftCount(nftCount.toString());
    toast.update(toastId, {
      render: "Successful",
      type: "success",
      autoClose: 5000,
    });
  };

  const connect = async () => {
    const ethereum = (window as any).ethereum;
    try {
      const provider = new ethers.providers.Web3Provider(ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();

      const config = {
        biconomyPaymasterApiKey: chains[chainSelected].biconomyPaymasterApiKey,
        bundlerUrl: chains[chainSelected].bundlerUrl,
      };

      const bundler = await createBundler({
        bundlerUrl: config.bundlerUrl,
        userOpReceiptMaxDurationIntervals: {
          [chains[chainSelected].chainId]: 120000,
        },
        userOpReceiptIntervals: { [chains[chainSelected].chainId]: 3000 },
      });

      const smartWallet = await createSmartAccountClient({
        signer: signer,
        biconomyPaymasterApiKey: config.biconomyPaymasterApiKey,
        bundler: bundler,
        rpcUrl: chains[chainSelected].providerUrl,
        chainId: chains[chainSelected].chainId,
      });

      setSmartAccount(smartWallet);
      const saAddress = await smartWallet.getAddress();
      setSmartAccountAddress(saAddress);
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-start gap-8 p-24">
      <div className="flex flex-col justify-center items-center">
        <div className="text-[4rem] font-bold text-orange-400 text-center">
          Biconomy Session Key Demo
        </div>
        <div className="text-[3rem] font-bold text-orange-400 text-center">
          Batched Transactions
        </div>
      </div>

      {!smartAccount && (
        <>
          <div className="flex flex-row justify-center items-center gap-4">
            {chains.map((chain) => {
              return (
                <div
                  key={chain.chainNo}
                  className={`w-[10rem] h-[3rem] cursor-pointer rounded-lg flex flex-row justify-center items-center text-white ${
                    chainSelected == chain.chainNo
                      ? "bg-orange-600"
                      : "bg-black"
                  } border-2 border-solid border-orange-400`}
                  onClick={() => {
                    setChainSelected(chain.chainNo);
                  }}
                >
                  {chain.name}
                </div>
              );
            })}
          </div>
          <button
            className="w-[10rem] h-[3rem] bg-orange-300 text-black font-bold rounded-lg"
            onClick={connect}
          >
            EOA Sign in
          </button>
        </>
      )}

      {smartAccount && (
        <>
          {" "}
          <span>Smart Account Address</span>
          <span>{smartAccountAddress}</span>
          <span>Network: {chains[chainSelected].name}</span>
          <div className="flex flex-row justify-center items-start gap-4">
            <button
              className="w-[10rem] h-[3rem] bg-orange-300 text-black font-bold rounded-lg"
              onClick={createSessionWithSponsorship}
            >
              Create Session
            </button>
            <div className="flex flex-col justify-start items-center gap-2">
              <button
                className="w-[10rem] h-[3rem] bg-orange-300 text-black font-bold rounded-lg"
                onClick={batchTxn}
              >
                Batch Txn
              </button>
              <span>
                {txnHash && (
                  <a
                    target="_blank"
                    href={`${chains[chainSelected].explorerUrl + txnHash}`}
                  >
                    <span className="text-white font-bold underline">
                      Txn Hash
                    </span>
                  </a>
                )}
              </span>
            </div>
          </div>
          <div className="flex flex-row items-center justify-center gap-4">
            <div className="flex flex-col justify-center items-center gap-4">
              <button
                className="w-[10rem] h-[3rem] bg-orange-300 text-black font-bold rounded-lg"
                onClick={getCountId}
              >
                Get Count Value
              </button>
              <span>{count}</span>
            </div>
            <div className="flex flex-col justify-center items-center gap-4">
              <button
                className="w-[10rem] h-[3rem] bg-orange-300 text-black font-bold rounded-lg"
                onClick={getNftCount}
              >
                Get NFT count
              </button>
              <span>{nftCount}</span>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
