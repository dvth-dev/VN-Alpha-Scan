import clientPromise from './lib/mongodb.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);
        const collection = db.collection('tokens_competition');

        // Lấy tất cả các token đã lưu trong collection tokens_competition
        const tokens = await collection.find({}).toArray();

        res.status(200).json({
            code: '000000',
            message: 'Successfully fetched competition tokens',
            data: tokens
        });
    } catch (e) {
        console.error('API Error:', e);
        res.status(500).json({
            code: 'ERROR',
            message: e.message
        });
    }
}
