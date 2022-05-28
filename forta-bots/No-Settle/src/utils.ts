import { Interface } from "@ethersproject/abi";
import { BigNumber } from "ethers";
import { Finding, FindingSeverity, FindingType } from "forta-agent";

export const DAYS_THRESHOLD: number = 5;
export const SECONDS_THRESHOLD: BigNumber = BigNumber.from(60 * 60 * 24).mul(DAYS_THRESHOLD);

const SETTLE_EVENT: string = "event Settle(bytes32 indexed sourceDomain, uint256 batchedDaiToFlush)";
export const SETTLE_IFACE: Interface = new Interface([SETTLE_EVENT]);

export const createFinding = (
  threshold: number,
  blockTimestamp: string,
  latestSettleTimestamp: string | any = undefined
): Finding => {
  return Finding.fromObject({
    name: "MakerDAO No Settle monitor",
    description: `No Settle event emitted from TeleportJoin for ${threshold} days`,
    alertId: "MK-04",
    protocol: "MakerDAO",
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    metadata: {
      blockTimestamp,
      latestSettleTimestamp,
    },
  });
};
