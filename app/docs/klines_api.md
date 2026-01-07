Klines (Candlestick Data)
Endpoint: /bapi/defi/v1/public/alpha-trade/klines
Full URL Example
https://www.binance.com/bapi/defi/v1/public/alpha-trade/klines?interval=1h&limit=2&symbol=ALPHA_175USDT

Description
Fetches Kline/candlestick bars for a symbol, which include open/high/low/close prices and volume over intervals. Useful for charting and analysis.

Parameters
Name	Type	Mandatory	Description
symbol	STRING	YES	e.g., "ALPHA_175USDT" – use token ID from Token List
interval	STRING	YES	e.g., "1h" – supported intervals: 1s, 15s, 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M
limit	INT	NO	default 500, max 1500 – number of klines to return
startTime	LONG	NO	start timestamp in milliseconds
endTime	LONG	NO	end timestamp in milliseconds
Response Structure
code: String, response status code, "000000" indicates success.
message: String, typically used for optional messages or errors; empty here.
messageDetail: String, further details about the message; empty here.
success: Boolean, indicates whether the request was successful; here true.
data: Array of arrays, each inner array contains multiple string entries representing candlestick data:
Open time (timestamp in milliseconds as string), e.g., "1752642000000"
Open price (string), e.g., "0.00171473"
High price (string), e.g., "0.00172515"
Low price (string), e.g., "0.00171473"
Close price (string), e.g., "0.00172515"
Volume (string), e.g., "1771.86000000"
Close time (timestamp in milliseconds as string), e.g., "1752645599999"
Quote asset volume (string), e.g., "3.05093481"
Number of trades (integer as string), e.g., "2"
Taker buy base asset volume (string), e.g., "1771.86000000"
Taker buy quote asset volume (string), e.g., "3.05093481"
0 (static, please ignore)