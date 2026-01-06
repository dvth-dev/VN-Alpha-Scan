Token List
Endpoint: /bapi/defi/v1/public/wallet-direct/buw/wallet/cex/alpha/all/token/list
Full URL
https://www.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/cex/alpha/all/token/list

Description
Retrieves a list of all available ALPHA tokens, including their IDs and symbols. Use this to find the token ID for constructing symbols in other endpoints.

Parameters
None

Response Structure
code: String (e.g., 000000 for success)
message: String (e.g., "success")
data: Array of objects, each representing a token with fields like:
alphaId: Integer (alpha ID, e.g., ALPHA_175)
symbol: String (token symbol, e.g., "USDT")
name: String (full name, e.g., "USDT")
chainId: String (chain id)
contractAddress: String (contract address)
Other fields: May include decimals, network info, etc.
Example Usage
Call this first to map symbol names to ALPHA token IDs.