import { createBarzAgent, parsePaymentRequired, X402Error } from '../src/index'
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

  console.log('\nCreating Barz agent on Base Sepolia...')

  const baseSepoliaAgent = await createBarzAgent({
    chain: 'base-sepolia',
    owner: ownerKey,
    pimlico: { apiKey: pimlicoApiKey },
  })

  console.log('Base Sepolia agent address:', baseSepoliaAgent.address)
  console.log('Explorer:', baseSepoliaAgent.getExplorerUrl(batchHash))

  // ── x402 Payment Protocol Test ──

  console.log('\n--- x402 Payment Protocol ---')

  // Test 1: enableX402 with config
  agent.enableX402({
    maxPaymentPerRequest: '0.01 USDC',
    maxDailyPayments: '1 USDC',
    allowedDomains: ['api.example.com'],
  })
  console.log('x402 enabled with limits: 0.01 USDC/req, 1 USDC/day')

  // Test 2: Parse a mock 402 response
  const mock402 = new Response(null, {
    status: 402,
    headers: {
      'x-payment-amount': '10000',
      'x-payment-address': '0x1234567890abcdef1234567890abcdef12345678',
      'x-payment-token': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      'x-payment-network': 'base',
    },
  })

  const paymentRequest = parsePaymentRequired(mock402)
  console.log('Parsed payment request:', {
    amount: paymentRequest.amount.toString(),
    address: paymentRequest.address,
    token: paymentRequest.token,
    network: paymentRequest.network,
  })

  // Test 3: Verify missing headers are caught
  try {
    parsePaymentRequired(new Response(null, { status: 402 }))
    console.error('FAIL: Should have thrown on missing headers')
  } catch (err) {
    if (err instanceof X402Error) {
      console.log('Missing headers correctly rejected:', err.message)
    } else {
      throw err
    }
  }

  console.log('\nx402 tests passed!')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
