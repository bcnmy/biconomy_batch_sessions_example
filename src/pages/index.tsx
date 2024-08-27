import React, { useState } from "react";
import {
  PaymasterMode,
  createSmartAccountClient,
  createSession,
  Rule,
  Policy,
  createSessionKeyEOA,
  BiconomySmartAccountV2,
  createSessionSmartAccountClient,
  getSingleSessionTxParams,
  createBundler,
} from "@biconomy/account";
import { contractABI } from "../contract/contractABI";
import { ethers } from "ethers";
import { encodeFunctionData } from "viem";
import { polygonAmoy, sepolia, berachainTestnetbArtio } from "viem/chains";
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
  const [txnHash, setTxnHash] = useState<string | null>(null);

  const chains = [
    {
      chainNo: 0,
      chainId: 80084,
      name: "Bera Testnet",
      providerUrl: "https://bartio.rpc.b-harvest.io",
      incrementCountContractAdd: "0xcf29227477393728935BdBB86770f8F81b698F1A",
      biconomyPaymasterApiKey: "9ooHeMdTl.aa829ad6-e07b-4fcb-afc2-584e3400b4f5",
      explorerUrl: "https://bartio.beratrail.io/tx/",
      chain: berachainTestnetbArtio,
      bundlerUrl:
        "https://bundler.biconomy.io/api/v2/80084/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44",
      paymasterUrl:
        "https://paymaster.biconomy.io/api/v1/80084/9ooHeMdTl.aa829ad6-e07b-4fcb-afc2-584e3400b4f5",
    },
    {
      chainNo: 1,
      chainId: 11155111,
      name: "Ethereum Sepolia",
      providerUrl: "https://eth-sepolia.public.blastapi.io",
      incrementCountContractAdd: "0xd9ea570eF1378D7B52887cE0342721E164062f5f",
      biconomyPaymasterApiKey: "gJdVIBMSe.f6cc87ea-e351-449d-9736-c04c6fab56a2",
      explorerUrl: "https://sepolia.etherscan.io/tx/",
      chain: sepolia,
      bundlerUrl:
        "https://bundler.biconomy.io/api/v2/11155111/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44",
      paymasterUrl:
        "https://paymaster.biconomy.io/api/v1/11155111/gJdVIBMSe.f6cc87ea-e351-449d-9736-c04c6fab56a2",
    },
    {
      chainNo: 2,
      chainId: 80002,
      name: "Polygon Amoy",
      providerUrl: "https://rpc-amoy.polygon.technology/",
      incrementCountContractAdd: "0xfeec89eC2afD503FF359487967D02285f7DaA9aD",
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

    const policy: Policy[] = [
      {
        sessionKeyAddress,
        //@ts-ignore
        contractAddress: chains[chainSelected].incrementCountContractAdd,
        functionSelector: "increment()",
        rules: [],
        interval: {
          validUntil: 0,
          validAfter: 0,
        },
        valueLimit: BigInt(0),
      },
    ];

    const { wait, session } = await createSession(
      //@ts-ignore
      smartAccount,
      policy,
      sessionStorageClient,
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

  const incrementCount = async () => {
    const toastId = toast("Incrementing Count", { autoClose: false });

    const emulatedUsersSmartAccount = await createSessionSmartAccountClient(
      {
        //@ts-ignore
        accountAddress: smartAccountAddress,
        bundlerUrl: chains[chainSelected].bundlerUrl,
        paymasterUrl: chains[chainSelected].paymasterUrl,
        chainId: chains[chainSelected].chainId,
      },
      smartAccountAddress
    );

    const minTx = {
      to: chains[chainSelected].incrementCountContractAdd,
      data: encodeFunctionData({
        abi: contractABI,
        functionName: "increment",
        args: [],
      }),
    };

    const params = await getSingleSessionTxParams(
      //@ts-ignore
      smartAccountAddress,
      chains[chainSelected].chain,
      0
    );

    const { wait } = await emulatedUsersSmartAccount.sendTransaction(minTx, {
      ...params,
      ...withSponsorship,
    });

    const {
      receipt: { transactionHash },
      success,
    } = await wait();

    setTxnHash(transactionHash);

    toast.update(toastId, {
      render: "Session Creation Successful",
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
      <div className="text-[4rem] font-bold text-orange-400">
        Biconomy Session Key Demo
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
                onClick={incrementCount}
              >
                Increment Count
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
          <div className="flex flex-row justify-center items-center gap-4">
            <button
              className="w-[10rem] h-[3rem] bg-orange-300 text-black font-bold rounded-lg"
              onClick={getCountId}
            >
              Get Count Value
            </button>
            <span>{count}</span>
          </div>
        </>
      )}
    </main>
  );
}
