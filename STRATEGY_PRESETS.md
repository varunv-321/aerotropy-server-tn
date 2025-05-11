# Strategy Presets for Uniswap V3 AI Agent

This document outlines the investment strategies available to the onchain AI agent. Each strategy is designed to match a different risk profile and leverages Uniswap V3 analytics.

---

## Low Risk Strategy

- **Approach:** Invest in established pools with the highest APR.
- **Logic:**
  - Query all Uniswap V3 pools.
  - Filter for pools with high APR (e.g., top 10% or above a set threshold).
  - Invest in these pools.
- **Rationale:**
  - Focuses on stable, mature pools with proven yield, minimizing exposure to volatility or new, untested pools.

**Example System Prompt:**

> You are an investment agent. Your strategy is to find pools with the highest APR and invest in them.

---

## Medium Risk Strategy

- **Approach:** Invest in pools with positive growth signals and moderate to high APR.
- **Logic:**
  - Filter for pools with a **positive TVL trend** (TVL is increasing over the last N days).
  - Require a **moderate to high APR** (e.g., >10%).
  - Exclude pools that are brand new or have high volatility.
  - Optionally, prefer pools with recent volume spikes or diversified allocation across several pools.
- **Rationale:**
  - Pools with growing TVL and good APR indicate both opportunity and some market confidence.
  - Avoids the risk of new/unproven pools but seeks more upside than just the safest options.

**Example System Prompt:**

> You are an investment agent. Your strategy is to find Uniswap V3 pools with a positive TVL trend and moderate to high APR, avoiding new or highly volatile pools. Prefer pools with growing liquidity and recent volume spikes.

---

## High Risk Strategy

- **Approach:** Invest in new pools as soon as they are created.
- **Logic:**
  - Listen for new pool creation events on Uniswap V3 (via The Graph or WebSocket).
  - When a new pool is detected, invest in it immediately.
- **Rationale:**
  - New pools can offer high rewards but come with significant risk due to lack of history and potential for high volatility.

**Example System Prompt:**

> You are an investment agent. Your strategy is to monitor for new pools on Uniswap V3 and invest in them as soon as they appear.

---

## Notes

- These strategies can be selected by users, passed as system prompts, or used as presets for automated flows.
- All strategies can be further refined with additional analytics (e.g., volatility, age, volume, token types).
