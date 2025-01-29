import { useState, useEffect } from "react";
import {
  BrowserProvider,
  Eip1193Provider,
  JsonRpcSigner,
  Wallet,
  JsonRpcProvider,
} from "ethers";
import {
  useAppKitProvider,
  useWalletInfo,
  useAppKitAccount,
} from "@reown/appkit/react";

import { createDeterministicLinkedSignerPrivateKey } from "@vertex-protocol/contracts";
import { createVertexClient, VertexClient } from "@vertex-protocol/client";
import { PlaceOrderParams, OrderExpirationType } from "@vertex-protocol/client";
import { getExpirationTimestamp } from "@vertex-protocol/contracts";
import { nowInSeconds, toFixedPoint } from "@vertex-protocol/utils";
import { BigDecimal, toPrintableObject } from "@vertex-protocol/utils";

const VertexWallet = () => {
  const [signer, setSigner] = useState<JsonRpcSigner | undefined>(undefined);
  const [walletKey, setWalletKey] = useState<string | undefined>(undefined);
  const [vertexWallet, setVertexWallet] = useState<Wallet | undefined>(
    undefined
  );
  const [vertexClient, setVertexClient] = useState<VertexClient | undefined>(
    undefined
  );
  const { address } = useAppKitAccount();
  const subaccountName = "default";

  const { walletInfo } = useWalletInfo();
  const { walletProvider } = useAppKitProvider("eip155");

  const onSignMessage = async () => {
    try {
      if (walletProvider) {
        const provider = new BrowserProvider(walletProvider as Eip1193Provider);
        const signer = await provider.getSigner();
        setSigner(signer);
        if (signer) {
          const key = await createDeterministicLinkedSignerPrivateKey({
            chainId: 421614,
            endpointAddress: "0xadefde1a14b6ba4da3e82414209408a49930e8dc",
            signer: signer,
            subaccountName: "default",
            subaccountOwner: signer.address,
          });
          setWalletKey(key);
          console.log("wallet key", key);
        } else {
          console.log("no signer");
        }
      } else {
        console.log("no walletProvider");
      }
    } catch (err) {
      const error = err as Error;
      console.warn(error.name);
    }
  };

  useEffect(() => {
    if (!walletProvider) {
      setSigner(undefined);
      setWalletKey(undefined);
      setVertexWallet(undefined);
      setVertexClient(undefined);
    }
  }, [walletProvider]);

  const getVertexWallet = async () => {
    try {
      if (walletKey) {
        const signer = new Wallet(
          walletKey, // add private key, or import, or use .env
          // Use a provider of choice, initialized for the relevant testnet/mainnet network
          new JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc", {
            name: "arbitrum-sepolia",
            chainId: 421614,
          })
        );
        console.log(signer);
        setVertexWallet(signer);

        const client = createVertexClient("arbitrumTestnet", {
          signerOrProvider: signer,
        });
        console.log(client);
        setVertexClient(client);
      } else {
        console.log("no walletKey");
      }
    } catch (err) {
      const error = err as Error;
      console.warn(error.message);
    }
  };

  const useWallet = async () => {
    try {
      if (vertexClient && address) {
        console.log("fetching account info");
        const subaccountData =
          await vertexClient.subaccount.getEngineSubaccountSummary({
            subaccountOwner: address ?? "0x",
            subaccountName,
          });
        console.log("exists", subaccountData.exists);
        const assets = BigDecimal(subaccountData.health.initial.assets)
          .div(1e18)
          .decimalPlaces(4)
          .toNumber();
        console.log("assets:", assets);
      } else {
        console.log("no vertexWallet");
      }
    } catch (err) {
      const error = err as Error;
      console.warn(error.message);
    }
  };

  const queryOrders = async () => {
    try {
      if (vertexClient && address) {
        console.log("fetching orders for [2, 4]");
        const productIds = [2, 4];
        const openOrders =
          await vertexClient.market.getOpenSubaccountMultiProductOrders({
            subaccountOwner: address,
            subaccountName: "default",
            productIds,
          });
        console.log(openOrders);
      } else {
        console.log("no vertexWallet");
      }
    } catch (err) {
      const error = err as Error;
      console.warn(error);
    }
  };

  const placeOrder = async () => {
    try {
      if (vertexClient) {
        console.log("placing order");
        const expTimestamp = {
          type: "default" as OrderExpirationType,
          expirationTime: nowInSeconds() + 60,
        };

        const orderParams: PlaceOrderParams["order"] = {
          subaccountName: "default",
          expiration: getExpirationTimestamp(expTimestamp).toString(),
          price: 98446,
          // setting amount to 10**16
          amount: toFixedPoint(0.004, 18).toString(),
        };

        const placeOrderResult = await vertexClient.market.placeOrder({
          order: orderParams,
          productId: 2,
        });

        prettyPrintJson("Place Order Result", placeOrderResult);
      } else {
        console.log("no vertexWallet");
      }
    } catch (err) {
      const error = err as Error;
      console.warn(error);
    }
  };

  return (
    <>
      <div className="card">
        <button
          style={{ marginLeft: "1em" }}
          disabled={!walletProvider}
          onClick={onSignMessage}
        >
          Get wallet key
        </button>
        <button
          style={{ marginLeft: "1em" }}
          disabled={!walletKey}
          onClick={getVertexWallet}
        >
          Create wallet
        </button>
        <button
          style={{ marginLeft: "1em" }}
          disabled={!vertexClient}
          onClick={useWallet}
        >
          Check balance
        </button>
        <button
          style={{ marginLeft: "1em" }}
          disabled={!vertexClient}
          onClick={queryOrders}
        >
          Check orders
        </button>
        <button
          style={{ marginLeft: "1em" }}
          disabled={!vertexClient}
          onClick={placeOrder}
        >
          Place order
        </button>
      </div>
      <div>
        <div>using: {walletInfo?.name}</div>
        <div>signer addr: {signer?.address.slice(0, 20)}...</div>
        <div>walletKey: {walletKey?.slice(0, 20)}...</div>
        <div>vertexWallet: {vertexWallet?.address?.slice(0, 20)}...</div>
        <div>vertexClient: {vertexClient ? "yes" : "no"}</div>
      </div>
    </>
  );
};

export default VertexWallet;

export function prettyPrintJson(label: string, json: any) {
  console.log(label);
  console.log(JSON.stringify(toPrintableObject(json), null, 2));
}
