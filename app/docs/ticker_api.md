Ticker (24hr Price Statistics)
Endpoint: /bapi/defi/v1/public/alpha-trade/ticker
Full URL Example
https://www.binance.com/bapi/defi/v1/public/alpha-trade/ticker?symbol=ALPHA_175USDT

Description
Gets the 24-hour rolling window price change statistics for a symbol, including volume and price changes.

Parameters
Name	Type	Mandatory	Description
symbol	STRING	YES	e.g., "ALPHA_175USDT" – use token ID from Token List
Response Structure
code: String, Response status code; "000000" indicates success.
message: String, Optional message or error detail; none here.
messageDetail: String, Additional message details; none here.
success: Boolean, Indicates request success; here true.
data: Object containing ticker information for a trading symbol, with fields:
symbol: String, trading pair symbol, e.g., "ALPHA_175USDT"
priceChange: String, absolute price change during the period, e.g., "-0.00025072"
priceChangePercent: String, percentage price change during the period, e.g., "-12.742" (%)
weightedAvgPrice: String, weighted average price over the period, e.g., "0.00174014"
lastPrice: String, latest traded price, e.g., "0.00171695"
lastQty: String, quantity of the last trade, e.g., "11587.95000000"
openPrice: String, opening price of the period, e.g., "0.00196767"
highPrice: String, highest price during the period, e.g., "0.00197493"
lowPrice: String, lowest price during the period, e.g., "0.00166000"
volume: String, trading volume (base asset) during the period, e.g., "4664046.98000000"
quoteVolume: String, trading volume in quote asset during the period, e.g., "8116.07360317"
openTime: Integer (timestamp in milliseconds), period start time, e.g., 1752568680000
closeTime: Integer (timestamp in milliseconds), period end time, e.g., 1752654774140
firstId: Integer, trade ID of the first trade in the period, e.g., 58470
lastId: Integer, trade ID of the last trade in the period, e.g., 58665
count: Integer, total number of trades during the period, e.g., 258