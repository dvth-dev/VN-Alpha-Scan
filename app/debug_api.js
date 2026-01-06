import axios from 'axios';

const TOKEN_LIST_URL = 'https://www.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/cex/alpha/all/token/list';

async function checkTokenStructure() {
    try {
        console.log("Fetching token list...");
        const response = await axios.get(TOKEN_LIST_URL);
        if (response.data && response.data.data && response.data.data.length > 0) {
            console.log("Success! Found tokens.");
            const firstToken = response.data.data[0];
            console.log("First Token JSON Structure:");
            console.log(JSON.stringify(firstToken, null, 2));

            // Check a few more just in case
            console.log("\nChecking headers of first 5 tokens for image fields:");
            response.data.data.slice(0, 5).forEach(t => {
                console.log(`Symbol: ${t.symbol}, IconFields:`, {
                    icon: t.icon,
                    logo: t.logo,
                    imageUrl: t.imageUrl,
                    img: t.img,
                    iconUrl: t.iconUrl
                });
            });
        } else {
            console.log("No data found.");
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
}

checkTokenStructure();
