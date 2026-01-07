export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { password } = req.body;
        const correctPass = process.env.PRIVATE_PASS;

        if (password === correctPass) {
            return res.status(200).json({
                code: '000000',
                authenticated: true,
                message: 'Access granted'
            });
        } else {
            return res.status(401).json({
                code: 'INVALID_PASS',
                authenticated: false,
                message: 'Incorrect password'
            });
        }
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
}
