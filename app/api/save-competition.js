import clientPromise from './lib/mongodb.js';

export default async function handler(req, res) {
    // Chỉ cho phép phương thức POST
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const data = req.body;

        // Phân tích từ frontend (Competitions.jsx):
        // Dữ liệu cần thiết gồm: alphaId, symbol, name, iconUrl, startTime, endTime
        const { alphaId, symbol, name, iconUrl, startTime, endTime } = data;

        if (!alphaId) {
            return res.status(400).json({ message: 'Missing alphaId' });
        }

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);

        // Sử dụng collection: tokens_competition
        const collection = db.collection('tokens_competition');

        // Thực hiện update nếu đã tồn tại alphaId, hoặc thêm mới nếu chưa có (Upsert)
        const result = await collection.updateOne(
            { alphaId: alphaId },
            {
                $set: {
                    alphaId,
                    symbol,
                    name,
                    iconUrl,
                    startTime: startTime ? new Date(startTime) : null,
                    endTime: endTime ? new Date(endTime) : null,
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );

        res.status(200).json({
            code: '000000',
            message: 'Successfully saved competition token',
            data: {
                alphaId,
                upsertedId: result.upsertedId
            }
        });
    } catch (e) {
        console.error('API Error:', e);
        res.status(500).json({
            code: 'ERROR',
            message: e.message
        });
    }
}
