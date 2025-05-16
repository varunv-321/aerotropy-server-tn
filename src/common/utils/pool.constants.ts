export type Pool = {
  name: string;
  address: string;
};

export const POOL_ADDRESSES: string[] = [
  '0x1527b9f572C49EC1D9240D66a882A2AaACceC8f8',
  '0x265e2068955685c3676ea1c075257ab0bf5148b4',
  '0x8a4dd22bcd307fca80db7eefb090e430badccf7f',
];

export const POOLS: Pool[] = [
  {
    name: 'High Growth Pool',
    address: POOL_ADDRESSES[0],
  },
  {
    name: 'Balanced Growth Pool',
    address: POOL_ADDRESSES[1],
  },
  {
    name: 'Stable Growth Pool',
    address: POOL_ADDRESSES[2],
  },
];
