export type StandardToken = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logo: string;
  tokenId: bigint;
};

const TOKEN_IDS: bigint[] = [BigInt(1), BigInt(2), BigInt(3), BigInt(4)];

export const TOKENS: StandardToken[] = [
  {
    address: '0x0FF4C36AD67d4E64A903F59070a76e0Bf836E7db',
    name: 'WETH',
    symbol: 'WETH',
    decimals: 18,
    logo: 'https://img.cryptorank.io/coins/weth1701090834118.png',
    tokenId: TOKEN_IDS[0],
  },
  {
    address: '0x54e98382b0e5E1260a6C458Ea38ACB2f5Fc5c705',
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6,
    logo: 'https://img.cryptorank.io/coins/usd%20coin1634317395959.png',
    tokenId: TOKEN_IDS[1],
  },
  {
    address: '0x16f869dc5BfE8dfB239BDd2774876f3daDD934cD',
    name: 'DAI',
    symbol: 'DAI',
    decimals: 18,
    logo: 'https://img.cryptorank.io/coins/multi-collateral-dai1574400689822.png',
    tokenId: TOKEN_IDS[2],
  },
  {
    address: '0xa91e0f6d622108a97df116A6eA5b5687034Fb39e',
    name: 'USDT',
    symbol: 'USDT',
    decimals: 6,
    logo: 'https://img.cryptorank.io/coins/tether1645007690922.png',
    tokenId: TOKEN_IDS[3],
  },
];
