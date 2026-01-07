import clientPromise from './lib/mongodb.js';

export default async function handler(req, res) {
    // Chỉ cho phép phương thức POST hoặc PUT để update
    if (req.method !== 'POST' && req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const data = req.body;
        const { alphaId, startTime, endTime } = data;

        if (!alphaId) {
            return res.status(400).json({ message: 'Missing alphaId' });
        }

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);
        const collection = db.collection('tokens_competition');

        // Thực hiện update dựa trên alphaId
        const result = await collection.updateOne(
            { alphaId: alphaId },
            {
                $set: {
                    startTime: startTime ? new Date(startTime) : null,
                    endTime: endTime ? new Date(endTime) : null,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                code: 'NOT_FOUND',
                message: 'No competition found with the given alphaId'
            });
        }

        res.status(200).json({
            code: '000000',
            message: 'Successfully updated competition token',
            data: {
                alphaId,
                modifiedCount: result.modifiedCount
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
