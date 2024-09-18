import {
  Web3Function,
  Web3FunctionContext, Web3FunctionResultCallData
} from "@gelatonetwork/web3-functions-sdk";
import { Contract } from "@ethersproject/contracts";
import { AddressZero } from "@ethersproject/constants"

const RESERVOIR_ORACLE_ABI = ["function updatePrice(address aTokenA, address aTokenB, address aRewardRecipient)"]

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, storage, multiChainProvider } = context;
  const provider = multiChainProvider.default();

  const reservoirPriceOracle = new Contract("0x999", RESERVOIR_ORACLE_ABI, provider);
  const watchlist: string[] = (userArgs.watchList as string[]) ?? [];
  const countThreshold = userArgs.countThreshold as number;

  const pairsToUpdate: [string, string][] = [];

  for (const pair in watchlist) {
    // Number of rounds where the rewards have been unclaimed
    const lapsedCountStr = await storage.get(pair);
    let lapsedCount = lapsedCountStr !== undefined ?  parseInt(lapsedCountStr) : 0;

    const [tokenA, tokenB] = pair.split('-');

    // Simulate updating price
    const reward = await reservoirPriceOracle.callStatic.updatePrice(
      tokenA,
      tokenB,
      AddressZero
    );

    if (reward > 0) {
      if (lapsedCount > countThreshold) {
        // Update this price
        pairsToUpdate.push([tokenA, tokenB]);
        lapsedCount = 0;
      } else {
        // increment count
        lapsedCount += 1;
      }
    }
    // reward is not available, price is within threshold
    else {
      // Reset counter regardless of number of previous lapses
      lapsedCount = 0;
    }
    storage.set(pair, lapsedCount.toString());
  }

  const calldata: Web3FunctionResultCallData[] = [];
  if (pairsToUpdate.length > 0) {

    if (pairsToUpdate.length == 1) {
      // call oracle contract directly
      calldata.push({
        to: reservoirPriceOracle.address,
        data: reservoirPriceOracle.interface.encodeFunctionData("updatePrice", [pairsToUpdate[0][0],  pairsToUpdate[0][1], AddressZero])
      });
    } else {
      // should we use a multi-call contract to save on gas?
    }
    return {
      canExec: true,
      // calldata takes an array
      // does it mean that it will execute N separate transactions depending on the length of the array?
      callData: calldata
    };
  }
  else {
    return {
      canExec: false,
      message: "No pairs to update"
    }
  }
});
