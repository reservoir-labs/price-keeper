import path from "path";
import { Web3FunctionContextData } from "@gelatonetwork/web3-functions-sdk";
import { Web3FunctionLoader } from "@gelatonetwork/web3-functions-sdk/loader";
import { runWeb3Function } from "./utils";
import { AnvilServer } from "./utils/anvil-server";

const w3fName = "price-keeper";
const w3fRootDir = path.join("web3-functions");
const w3fPath = path.join(w3fRootDir, w3fName, "index.ts");

describe("Reservoir Price Oracle Keeper test", () => {
  let context: Web3FunctionContextData;
  let sepoliaFork: AnvilServer;

  beforeAll(async () => {
    sepoliaFork = await AnvilServer.fork({
      forkUrl: "https://1rpc.io/sepolia",
    });
    const gasPrice = (await sepoliaFork.provider.getGasPrice()).toString();

    const { secrets } = Web3FunctionLoader.load(w3fName, w3fRootDir);

    context = {
      secrets,
      storage: {},
      gelatoArgs: {
        chainId: (await sepoliaFork.provider.getNetwork()).chainId,
        gasPrice: gasPrice,
      },

      userArgs: {
        "watchList": [
          "0x0000000000000000000000000000000000000000-0x0000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000-0x0000000000000000000000000000000000000000"
        ],
        "oracle": "0xD00Fe322DC3829D0c597aEB8C4309784Cf92236d",
        "countThreshold": 5
      },
    };
  }, 10000);

  afterAll(() => {
    sepoliaFork.kill();
  })

  it("canExec: true", async () => {
    const res = await runWeb3Function(w3fPath, context, [sepoliaFork.provider]);

    expect(res.result.canExec).toEqual(true);
  });
  it("canExec: false when price is within range", async () => {
    const res = await runWeb3Function(w3fPath, context, [sepoliaFork.provider]);

    expect(res.result.canExec).toEqual(false);
  });
});
