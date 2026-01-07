export default async function handler(req, res) {
    // Chỉ cho phép POST
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // DEBUG LOGS - Kiểm tra trong tab Logs của Vercel Deployment
    const rawEnv = process.env.PRIVATE_PASS;
    console.log("--- AUTH DEBUG ---");
    console.log("1. Raw Env exist:", !!rawEnv);
    console.log("2. Env length:", rawEnv ? rawEnv.length : 0);
    console.log("3. Request Body keys:", Object.keys(req.body || {}));

    try {
        const { password } = req.body;
        const correctPass = (rawEnv || '').trim();
        const inputPass = (password || '').trim();

        console.log("4. Input provided:", !!inputPass);

        // So sánh
        if (inputPass === correctPass && correctPass !== '') {
            console.log("RESULT: Success");
            return res.status(200).json({
                code: '000000',
                authenticated: true,
                message: 'Access granted'
            });
        } else {
            console.log("RESULT: Failed (Mismatch or Empty Env)");
            return res.status(401).json({
                code: 'INVALID_PASS',
                authenticated: false,
                message: 'Unauthorized access',
                // Chỉ dev mới hiện dòng này để bạn biết nguyên nhân
                _debug: process.env.NODE_ENV === 'development' ? {
                    envSet: !!rawEnv,
                    inputReceived: !!inputPass
                } : undefined
            });
        }
    } catch (e) {
        console.error("Auth Error:", e);
        res.status(500).json({ message: e.message });
    }
}
