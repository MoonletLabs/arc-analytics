// ============================================
// CCTP V1 TokenMessenger ABI (key events only)
// ============================================

export const TOKEN_MESSENGER_ABI = [
  {
    type: 'event',
    name: 'DepositForBurn',
    inputs: [
      { name: 'nonce', type: 'uint64', indexed: true },
      { name: 'burnToken', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'depositor', type: 'address', indexed: true },
      { name: 'mintRecipient', type: 'bytes32', indexed: false },
      { name: 'destinationDomain', type: 'uint32', indexed: false },
      { name: 'destinationTokenMessenger', type: 'bytes32', indexed: false },
      { name: 'destinationCaller', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MintAndWithdraw',
    inputs: [
      { name: 'mintRecipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'mintToken', type: 'address', indexed: true },
    ],
  },
] as const;

// ============================================
// CCTP V2 TokenMessenger ABI (Arc uses this)
// ============================================

export const TOKEN_MESSENGER_V2_ABI = [
  {
    type: 'event',
    name: 'DepositForBurn',
    inputs: [
      { name: 'nonce', type: 'uint64', indexed: true },
      { name: 'burnToken', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'depositor', type: 'address', indexed: true },
      { name: 'mintRecipient', type: 'bytes32', indexed: false },
      { name: 'destinationDomain', type: 'uint32', indexed: false },
      { name: 'destinationTokenMessenger', type: 'bytes32', indexed: false },
      { name: 'destinationCaller', type: 'bytes32', indexed: false },
      { name: 'maxFee', type: 'uint256', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'MintAndWithdraw',
    inputs: [
      { name: 'mintRecipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'mintToken', type: 'address', indexed: true },
    ],
  },
] as const;

// ============================================
// CCTP MessageTransmitter ABI (key events only)
// ============================================

export const MESSAGE_TRANSMITTER_ABI = [
  {
    type: 'event',
    name: 'MessageSent',
    inputs: [{ name: 'message', type: 'bytes', indexed: false }],
  },
  {
    type: 'event',
    name: 'MessageReceived',
    inputs: [
      { name: 'caller', type: 'address', indexed: true },
      { name: 'sourceDomain', type: 'uint32', indexed: false },
      { name: 'nonce', type: 'uint64', indexed: true },
      { name: 'sender', type: 'bytes32', indexed: false },
      { name: 'messageBody', type: 'bytes', indexed: false },
    ],
  },
] as const;

// ============================================
// ERC20 ABI (for token identification and transfers)
// ============================================

export const ERC20_ABI = [
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Approval',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'spender', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

// ============================================
// StableFX FxEscrow ABI (for swap tracking)
// ============================================

export const FX_ESCROW_ABI = [
  // Trade settled event - emitted when a swap is completed
  {
    type: 'event',
    name: 'TradeSettled',
    inputs: [
      { name: 'tradeId', type: 'bytes32', indexed: true },
      { name: 'maker', type: 'address', indexed: true },
      { name: 'taker', type: 'address', indexed: true },
      { name: 'makerToken', type: 'address', indexed: false },
      { name: 'takerToken', type: 'address', indexed: false },
      { name: 'makerAmount', type: 'uint256', indexed: false },
      { name: 'takerAmount', type: 'uint256', indexed: false },
    ],
  },
  // Trade created event
  {
    type: 'event',
    name: 'TradeCreated',
    inputs: [
      { name: 'tradeId', type: 'bytes32', indexed: true },
      { name: 'maker', type: 'address', indexed: true },
      { name: 'makerToken', type: 'address', indexed: false },
      { name: 'takerToken', type: 'address', indexed: false },
      { name: 'makerAmount', type: 'uint256', indexed: false },
      { name: 'takerAmount', type: 'uint256', indexed: false },
      { name: 'deadline', type: 'uint256', indexed: false },
    ],
  },
  // Trade cancelled event
  {
    type: 'event',
    name: 'TradeCancelled',
    inputs: [
      { name: 'tradeId', type: 'bytes32', indexed: true },
      { name: 'maker', type: 'address', indexed: true },
    ],
  },
] as const;

// ============================================
// USYC Teller ABI (for mint/redeem tracking)
// ============================================

export const USYC_TELLER_ABI = [
  // Deposit event - minting USYC
  {
    type: 'event',
    name: 'Deposit',
    inputs: [
      { name: 'depositor', type: 'address', indexed: true },
      { name: 'receiver', type: 'address', indexed: true },
      { name: 'depositAsset', type: 'address', indexed: false },
      { name: 'depositAmount', type: 'uint256', indexed: false },
      { name: 'shareAmount', type: 'uint256', indexed: false },
    ],
  },
  // Withdraw event - redeeming USYC
  {
    type: 'event',
    name: 'Withdraw',
    inputs: [
      { name: 'withdrawer', type: 'address', indexed: true },
      { name: 'receiver', type: 'address', indexed: true },
      { name: 'withdrawAsset', type: 'address', indexed: false },
      { name: 'withdrawAmount', type: 'uint256', indexed: false },
      { name: 'shareAmount', type: 'uint256', indexed: false },
    ],
  },
] as const;

// ============================================
// USYC Token ABI (ERC20 + additional)
// ============================================

export const USYC_TOKEN_ABI = [
  ...ERC20_ABI,
  // USYC-specific functions
  {
    type: 'function',
    name: 'convertToAssets',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'convertToShares',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

// ============================================
// Gateway ABI (for cross-chain abstraction)
// ============================================

export const GATEWAY_WALLET_ABI = [
  {
    type: 'event',
    name: 'DepositReceived',
    inputs: [
      { name: 'depositor', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'sourceDomain', type: 'uint32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'WithdrawalInitiated',
    inputs: [
      { name: 'withdrawer', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'destinationDomain', type: 'uint32', indexed: false },
    ],
  },
] as const;
