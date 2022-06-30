const hre = require('hardhat')
import { expect } from 'earljs'
import { ethers, providers, Wallet } from 'ethers'
import waitForExpect from 'wait-for-expect'

import { setupDatabaseTestSuite } from '../../test-e2e/database'
import { impersonateAccount, mineABunchOfBlocks, mintEther } from '../../test-e2e/hardhat-utils'
import { getAttestations } from '../../test-e2e/signing'
import { chainIds, networks } from '../config'
import { FlushRepository } from '../peripherals/db/FlushRepository'
import { SettleRepository } from '../peripherals/db/SettleRepository'
import { SynchronizerStatusRepository } from '../peripherals/db/SynchronizerStatusRepository'
import { TeleportRepository } from '../peripherals/db/TeleportRepository'
import { getKovanSdk } from '../sdk'
import { monitor } from './monitor'

describe('Monitoring', () => {
  const kovanProxy = '0x0e4725db88Bb038bBa4C4723e91Ba183BE11eDf3'
  const hhProvider = hre.ethers.provider as providers.Provider
  const signers = [Wallet.createRandom()]
  const receiver = Wallet.createRandom().connect(hhProvider)
  let cancel: Function
  const prisma = setupDatabaseTestSuite()

  it('detects bad debt', async () => {
    const sourceDomain = 'KOVAN-SLAVE-OPTIMISM-1'
    const targetDomain = 'KOVAN-MASTER-1'
    const daiToMint = 2137

    // start monitoring
    const network = networks[chainIds.KOVAN]
    const l2Provider = new ethers.providers.JsonRpcProvider(network.slaves[0].l2Rpc)
    const teleportRepository = new TeleportRepository(prisma)
    const settleRepository = new SettleRepository(prisma)
    const synchronizerStatusRepository = new SynchronizerStatusRepository(prisma)
    const flushRepository = new FlushRepository(prisma)
    await synchronizerStatusRepository.upsert({
      domain: sourceDomain,
      block: (await l2Provider.getBlock('latest')).number,
      name: 'InitEventsSynchronizer',
    })
    await synchronizerStatusRepository.upsert({
      domain: sourceDomain,
      block: (await l2Provider.getBlock('latest')).number,
      name: 'FlushEventsSynchronizer',
    })
    await synchronizerStatusRepository.upsert({
      domain: targetDomain,
      block: (await hhProvider.getBlockNumber()) - 8,
      name: 'SettleEventsSynchronizer',
    })

    const { metrics, cancel: _cancel } = await monitor({
      network,
      l1Provider: hhProvider,
      teleportRepository,
      synchronizerStatusRepository,
      flushRepository,
      settleRepository,
    })
    cancel = _cancel

    // print unbacked DAI
    const sdk = getKovanSdk(hhProvider as any)
    const impersonator = await impersonateAccount(kovanProxy, hhProvider)
    await mintEther(receiver.address, hhProvider)
    await sdk.oracleAuth.connect(impersonator).addSigners(signers.map((s) => s.address))
    const teleport = {
      sourceDomain: ethers.utils.formatBytes32String(sourceDomain),
      targetDomain: ethers.utils.formatBytes32String(targetDomain),
      receiver: ethers.utils.hexZeroPad(receiver.address, 32),
      operator: ethers.utils.hexZeroPad(receiver.address, 32),
      amount: daiToMint.toString(),
      nonce: '1',
      timestamp: '0',
    }
    const { signatures } = await getAttestations(signers, teleport)
    await sdk.oracleAuth.connect(receiver).requestMint(teleport, signatures, 0, 0)
    console.log(`Printing unbacked DAI done at block ${await hhProvider.getBlockNumber()}`)
    await mineABunchOfBlocks(hhProvider)

    // assert
    await waitForExpect(() => {
      expect(metrics['teleport_bad_debt{domain="KOVAN-MASTER-1"}']).toEqual(daiToMint.toString())
    }, 10_000)
  })

  afterEach(async () => {
    if (cancel) {
      cancel()
    }
  })
})
