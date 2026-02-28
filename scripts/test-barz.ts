import { createBarzAgent } from '../src/index'
import type { Hex } from 'viem'

async function main() {
  const ownerKey = process.env.OWNER_PRIVATE_KEY as Hex | undefined
  const pimlicoApiKey = process.env.PIMLICO_API_KEY

  if (!ownerKey) {
    console.error('Missing OWNER_PRIVATE_KEY in .env')
    process.exit(1)
  }
  if (!pimlicoApiKey) {
    console.error('Missing PIMLICO_API_KEY in .env')
    process.exit(1)
  }

  console.log('Creating Barz agent on Sepolia...')

  const agent = await createBarzAgent({
    chain: 'sepolia',
    owner: ownerKey,
    pimlico: { apiKey: pimlicoApiKey },
  })

  console.log('Agent address:', agent.address)

  console.log('Sending test transaction (0 ETH to self)...')

  const txHash = await agent.sendTransaction({
    to: agent.address,
    value: 0n,
  })

  console.log('Transaction hash:', txHash)

  console.log('\nSending batch transaction (2x 0 ETH to self)...')

  const batchHash = await agent.batchTransactions([
    { to: agent.address, value: 0n },
    { to: agent.address, value: 0n },
  ])

  console.log('Batch transaction hash:', batchHash)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
