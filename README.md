<p align="center">
  <h1 align="center">AeroTropy Server</h1>
  <p align="center">AI-Powered DeFi Investment Platform</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-20.x-brightgreen" alt="Node" />
  <img src="https://img.shields.io/badge/yarn-1.22.x-blue" alt="Yarn" />
  <img src="https://img.shields.io/badge/nestjs-11.x-red" alt="NestJS" />
  <img src="https://img.shields.io/badge/uniswap-v3-purple" alt="Uniswap" />
  <img src="https://img.shields.io/badge/openai-gpt--4o--mini-darkgreen" alt="OpenAI" />
</p>

## Description

AeroTropy Server is a NestJS-based backend that combines Uniswap V3 DeFi protocols with AI-powered decision making. It provides:

- **Uniswap V3 API**: Analytics, pool discovery, and liquidity position management
- **AI Agent**: Conversational interface for DeFi investments using OpenAI and AgentKit
- **Blockchain Integration**: Direct on-chain interaction with Uniswap contracts

## Features

### Uniswap V3 Integration

- **Pool Analysis**: Get pools with APR calculations, volatility metrics, and performance trends
- **Strategy-based Filtering**: Find the best pools based on predefined strategies (low, medium, high risk)
- **Position Minting**: Create new liquidity positions through a REST API

### AI Agent

- **Conversational DeFi**: Interact with Uniswap through natural language
- **Investment Recommendations**: Get personalized pool recommendations
- **Automated Investments**: Create positions through conversation

## Project Setup

### Prerequisites

- Node.js 20.x
- Yarn 1.22+
- Ethereum wallet with private key (for on-chain transactions)
- Base or Base Sepolia RPC access
- OpenAI API key (for AI agent)

### Installation

```bash
# Install dependencies
$ yarn install

# Configure environment variables
$ cp .env.example .env
# Edit .env with your credentials and keys
```

### Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```
# Required for Uniswap minting
BASE_SEPOLIA_RPC=      # Base testnet RPC URL
BASE_MAINNET_RPC=      # Base mainnet RPC URL (optional)
PRIVATE_KEY=           # Your wallet private key

# Required for AI agent
OPENAI_API_KEY=        # OpenAI API key
CDP_API_KEY_NAME=      # Coinbase Developer Platform key name
CDP_API_KEY_PRIVATE_KEY= # Coinbase Developer Platform private key
```

### Running the Application

```bash
# Development mode
$ yarn run start:dev

# Production mode
$ yarn run build
$ yarn run start:prod
```

### API Documentation

Once running, Swagger API docs are available at:

```
http://localhost:3000/api-docs
```

## API Reference

### Uniswap V3 Endpoints

#### Get Pools with APR

```
GET /uniswap/v3/:network/pools-with-apr
```

Retrieve all Uniswap V3 pools with APR calculations for the given network.

#### Get Best Pools

```
GET /uniswap/v3/:network/best-pools
```

Retrieve the best pools based on customizable metrics including APR, TVL, volatility, and trends.

**Query Parameters:**

- `minTVL` - Minimum TVL filter
- `minAPR` - Minimum APR filter
- `topN` - Number of results to return
- `strategy` - Predefined strategy (low, medium, high)

#### Get Pools by Strategy

```
GET /uniswap/v3/:network/pools/strategy/:strategy
```

Get pools filtered by a predefined investment strategy.

#### Mint Position

```
POST /uniswap/v3/:network/mint-position
```

Mint a new Uniswap V3 liquidity position.

**Request Body:**

```json
{
  "poolData": {
    "id": "0xPOOL_ADDRESS",
    "feeTier": "3000",
    "token0": {
      "id": "0xTOKEN0_ADDRESS",
      "symbol": "TOKEN0",
      "name": "Token 0",
      "decimals": "18"
    },
    "token1": {
      "id": "0xTOKEN1_ADDRESS",
      "symbol": "TOKEN1",
      "name": "Token 1",
      "decimals": "6"
    }
  },
  "amount0": "0.1",
  "amount1": "100",
  "tickLowerOffset": 1000,
  "tickUpperOffset": 1000,
  "network": "base-sepolia",
  "slippageTolerance": 0.5
}
```

**Response:**

```json
{
  "tokenId": "12345"
}
```

#### Remove Position (New!)

```
POST /uniswap/v3/:network/remove-position
```

Remove liquidity from a Uniswap V3 position and optionally burn the NFT.

**Request Body:**

```json
{
  "tokenId": "12345",
  "network": "base-sepolia",
  "burnNFT": false,
  "slippageTolerance": 0.5,
  "recipient": "0xYOUR_ADDRESS" // Optional: defaults to the wallet address
}
```

**Response:**

```json
{
  "transactionHash": "0xTRANSACTION_HASH",
  "amount0Removed": "0.0998",
  "amount1Removed": "99.5",
  "positionBurned": false
}
```

### AI Agent Endpoints

#### Regular Chat

```
POST /ai-agent/chat
```

Interact with the AI agent through natural language. Returns the complete response at once.

**Request Body:**

```json
{
  "prompt": "Show me high APR pools on Base",
  "strategy": "low", // Optional: "low", "medium", "high"
  "maxSteps": 10, // Optional
  "system": "..." // Optional
}
```

**Response:**

```json
{
  "text": "Based on current data, here are some high APR pools on Base..."
}
```

#### Streaming Chat (New!)

```
POST /ai-agent/chat/stream
```

Interact with the AI agent with real-time streaming responses. The response is streamed as it's being generated, improving the user experience for longer responses.

**Request Body:** Same as `/ai-agent/chat`

**Response:** Text/plain streaming response with chunks of text sent as they are generated

## Using the AI Agent

The AI agent is designed to help users interact with Uniswap through natural language conversations. Below are some example prompts that demonstrate the agent's capabilities:

### Prompt Examples

#### Pool Discovery

```
I want to find high APR pools on Base with at least $100,000 TVL
```

#### Investment Strategy Selection

```
What's a good low-risk liquidity investment strategy on Base?
```

#### Position Creation

```
I want to invest 0.1 ETH and 100 USDC in the ETH-USDC pool with 0.3% fee
```

#### Position Removal (New!)

```
Remove all liquidity from my position #12345
```

```
Close my position #6789 and burn the NFT
```

#### Analytics Questions

```
Which pools have shown the best performance over the last week?
```

## Deployment

### Docker

```bash
# Build the Docker image
docker build -t aerotropy-server .

# Run the container
docker run -p 3000:3000 --env-file .env aerotropy-server
```

### Cloud Providers

This application can be deployed to any cloud provider that supports Node.js applications:

- **AWS**: Use Elastic Beanstalk or ECS
- **Google Cloud**: Use Cloud Run or App Engine
- **Azure**: Use App Service

## License

This project is licensed under the MIT License - see the LICENSE file for details.
