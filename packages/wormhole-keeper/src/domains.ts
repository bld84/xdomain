import { CrossChainMessenger, MessageStatus } from '@eth-optimism/sdk'
import { Signer } from 'ethers'

export type FinalizeMessage = (txHash: string) => Promise<void>

export async function makeFinalizeMessageForOptimism(l1Signer: Signer, l2Signer: Signer): Promise<FinalizeMessage> {
  const l1ChainId = await l1Signer.getChainId()
  const sdk = new CrossChainMessenger({ l1SignerOrProvider: l1Signer, l2SignerOrProvider: l2Signer, l1ChainId })

  return async (txHash) => {
    const messageStatus = await sdk.getMessageStatus(txHash)

    if (messageStatus === MessageStatus.RELAYED) {
      console.log(`Message from tx ${txHash} already relayed.`)
      return
    }

    if (messageStatus === MessageStatus.READY_FOR_RELAY) {
      console.log(`Message from tx ${txHash} ready to finalize.`)
      const tx = await sdk.finalizeMessage(txHash)
      console.log(`Message from tx ${txHash} finalized in tx: ${tx.hash}`)
      return
    }

    if (
      messageStatus === MessageStatus.IN_CHALLENGE_PERIOD ||
      messageStatus === MessageStatus.STATE_ROOT_NOT_PUBLISHED
    ) {
      console.log(`Message from tx ${txHash} not ready to relay.`)
      return
    }

    console.log(`Message from tx ${txHash} can't be finalized! :( Reason: ${messageStatus}`)
  }
}
