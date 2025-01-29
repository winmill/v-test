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
  useAppKitNetwork,
} from "@reown/appkit/react";
import { arbitrumSepolia } from "@reown/appkit/networks";

import { createVertexClient, VertexClient } from "@vertex-protocol/client";
import {
  PlaceOrderParams,
  OrderExpirationType,
  subaccountToHex,
  createDeterministicLinkedSignerPrivateKey,
} from "@vertex-protocol/client";
import { getExpirationTimestamp } from "@vertex-protocol/contracts";
import { nowInSeconds, toFixedPoint } from "@vertex-protocol/utils";
import { BigDecimal, toPrintableObject } from "@vertex-protocol/utils";

const targetNetwork = arbitrumSepolia;

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
  const { switchNetwork } = useAppKitNetwork();

  useEffect(() => {
    if (!walletProvider) {
      setSigner(undefined);
      setWalletKey(undefined);
      setVertexWallet(undefined);
      setVertexClient(undefined);
    }
  }, [walletProvider]);

  const createLink = async () => {
    try {
      if (walletProvider) {
        // set to required network
        switchNetwork(targetNetwork);

        // get local wallet
        const provider = new BrowserProvider(walletProvider as Eip1193Provider);
        const signer = await provider.getSigner();
        setSigner(signer);
        console.log("local wallet", signer);

        // create vertexClient from local wallet
        const client = createVertexClient("arbitrumTestnet", {
          signerOrProvider: signer,
        });

        // create the deterministic private key for the signer
        // const linkedWallet = await client.subaccount.createStandardLinkedSigner(
        //   subaccountName
        // );
        // console.log(linkedWallet);

        // create the deterministic private key for the signer
        const key = await createDeterministicLinkedSignerPrivateKey({
          chainId: targetNetwork.id,
          endpointAddress: "0xadefde1a14b6ba4da3e82414209408a49930e8dc",
          signer: signer,
          subaccountName: "default",
          subaccountOwner: signer.address,
        });
        setWalletKey(key);

        // use key to create signing wallet
        const linkedWallet = new Wallet(
          key, // add private key, or import, or use .env
          // Use a provider of choice, initialized for the relevant testnet/mainnet network
          new JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc", {
            name: "arbitrum-sepolia",
            chainId: targetNetwork.id,
          })
        );
        setVertexWallet(linkedWallet);

        // actually authorize that signer to sign on behalf of the main subaccount
        const ret = await client.subaccount.linkSigner({
          signer: subaccountToHex({
            subaccountOwner: linkedWallet.address,
            subaccountName: "",
          }),
          subaccountName,
        });

        //
        if (ret.status === "success") {
          console.log("link success");
          // enable 1CT
          client.setLinkedSigner(linkedWallet);
          setVertexClient(client);
        } else {
          console.log("link failed");
        }
      }
    } catch (err) {
      const error = err as Error;
      console.warn(error.name);
    }

    // show remaining linked signer switches
    await checkRemaining(address);
  };

  /*
  const onSignMessage = async () => {
    try {
      if (walletProvider) {
        switchNetwork(targetNetwork);
        const provider = new BrowserProvider(walletProvider as Eip1193Provider);
        const signer = await provider.getSigner();
        setSigner(signer);
        if (signer) {
          const key = await createDeterministicLinkedSignerPrivateKey({
            chainId: targetNetwork.id,
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

    // show remaining linked signer switches
    await showRemaining(address);
  };
  */

  /*
  const getVertexWallet = async () => {
    try {
      if (walletKey && address) {
        const signer = new Wallet(
          walletKey, // add private key, or import, or use .env
          // Use a provider of choice, initialized for the relevant testnet/mainnet network
          new JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc", {
            name: "arbitrum-sepolia",
            chainId: targetNetwork.id,
          })
        );
        console.log(signer);
        setVertexWallet(signer);

        // display network of signer
        const network = await signer.provider?.getNetwork();
        console.log("network", network?.chainId);

        // create vertex client
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

    // show remaining linked signer switches
    await showRemaining(address);
  };
  */

  const accountInfo = async () => {
    try {
      if (vertexClient && address) {
        console.log("fetching account info");
        // const network = await vertexWallet?.provider?.getNetwork();
        const network =
          await vertexClient.context.signerOrProvider.provider?.getNetwork();
        console.log("network", network?.chainId);
        const subaccountData =
          await vertexClient.subaccount.getEngineSubaccountSummary({
            subaccountOwner: address,
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

  const orderInfo = async () => {
    try {
      if (vertexClient && address) {
        const productIds = [2, 4];
        console.log(`fetching orders for [${productIds}]`);
        const t1 = performance.now();
        const openOrders =
          await vertexClient.market.getOpenSubaccountMultiProductOrders({
            subaccountOwner: address,
            subaccountName,
            productIds,
          });
        for (let orders of openOrders.productOrders) {
          for (let order of orders.orders) {
            const qty = BigDecimal(order.totalAmount).div(1e18).toNumber();
            const expiration = BigDecimal(order.expiration).toNumber();
            const expireDate = new Date(Date.UTC(1970, 0, 1, 0, 0, expiration));
            const expiresIn = (expireDate.getTime() - Date.now()) / 1000;
            console.log(
              `[id: ${orders.productId}] ${qty} @${order.price} (exp in ${expiresIn}s)`
            );
            // prettyPrintJson(
            //   `[id: ${orders.productId}] ${qty} @${order.price} (exp in ${expiresIn}s)`,
            //   order.orderParams
            // );
          }
        }
        const queryTime = BigDecimal(performance.now())
          .minus(t1)
          .decimalPlaces(0)
          .toNumber();
        console.log("done", queryTime, "ms");
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
        const t1 = performance.now();
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

        const orderTime = BigDecimal(performance.now())
          .minus(t1)
          .decimalPlaces(0)
          .toNumber();
        prettyPrintJson("Place Order Result", placeOrderResult);
        console.log("> vertex order time:", orderTime, "ms");
      } else {
        console.log("no vertexWallet");
      }
    } catch (err) {
      const error = err as Error;
      console.warn(error);
    }
  };

  //
  // show remaining signer linkings
  //
  const checkRemaining = async (showAddress: string | undefined) => {
    if (!showAddress) return;
    const signerTemp = new Wallet(
      "0x0123456789012345678901234567890123456789012345678901234567890123",
      // Use a provider of choice, initialized for the relevant testnet/mainnet network
      new JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc", {
        name: "arbitrum-sepolia",
        chainId: targetNetwork.id,
      })
    );

    const clientTemp = createVertexClient("arbitrumTestnet", {
      signerOrProvider: signerTemp,
    });

    const linkedSigner =
      await clientTemp.subaccount.getSubaccountLinkedSignerWithRateLimit({
        subaccount: {
          subaccountOwner: showAddress,
          subaccountName,
        },
      });
    console.log("signer", linkedSigner.signer);
    console.log(
      "remaining",
      BigDecimal(linkedSigner.remainingTxs).toNumber(),
      "for " + showAddress.slice(0, 10) + "..."
    );
  };

  return (
    <>
      <div className="card">
        <button
          style={{ marginLeft: "1em" }}
          disabled={!walletProvider}
          // onClick={onSignMessage}
          onClick={createLink}
        >
          Get wallet key
        </button>
        {/* <button
          style={{ marginLeft: "1em" }}
          disabled={!walletKey}
          onClick={getVertexWallet}
        >
          Create wallet
        </button> */}
        <button
          style={{ marginLeft: "1em" }}
          disabled={!vertexClient}
          onClick={accountInfo}
        >
          Check balance
        </button>
        <button
          style={{ marginLeft: "1em" }}
          disabled={!vertexClient}
          onClick={orderInfo}
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
        <div>local wallet addr: {signer?.address.slice(0, 20)}...</div>
        <div>wallet secret key: {walletKey?.slice(0, 20)}...</div>
        <div>signing wallet: {vertexWallet?.address?.slice(0, 20)}...</div>
        <div>vertexClient: {vertexClient ? "yes" : "no"}</div>
      </div>
    </>
  );
};

export default VertexWallet;

function prettyPrintJson(label: string, json: any) {
  console.log(label);
  console.log(JSON.stringify(toPrintableObject(json), null, 2));
}

