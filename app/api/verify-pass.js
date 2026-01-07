export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const rawEnv = process.env.PRIVATE_PASS;
    const { password } = req.body;

    // Làm sạch chuỗi: Loại bỏ mọi ký tự điều khiển/xuống dòng ẩn (Regex \s+)
    const cleanCorrect = (rawEnv || '').replace(/\s/g, '');
    const cleanInput = (password || '').replace(/\s/g, '');

    console.log("--- SECURE AUTH DEBUG ---");
    console.log("1. Env Length (Raw):", rawEnv ? rawEnv.length : 0);
    console.log("2. Input Length (Raw):", password ? password.length : 0);
    console.log("3. Match after deep clean:", cleanInput === cleanCorrect);

    try {
        if (cleanInput === cleanCorrect && cleanCorrect !== '') {
            return res.status(200).json({
                code: '000000',
                authenticated: true,
                message: 'Access granted'
            });
        } else {
            console.log("Auth Result: Failed mismatch");
            return res.status(401).json({
                code: 'INVALID_PASS',
                authenticated: false,
                message: 'Unauthorized access',
                _debug: {
                    match: cleanInput === cleanCorrect,
                    eLen: cleanCorrect.length,
                    iLen: cleanInput.length
                }
            });
        }
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
}
