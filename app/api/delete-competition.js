import clientPromise from './lib/mongodb.js';

export default async function handler(req, res) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { alphaId } = req.query;

        if (!alphaId) {
            return res.status(400).json({
                code: 'MISSING_PARAM',
                message: 'Missing alphaId parameter'
            });
        }

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);
        const collection = db.collection('tokens_competition');

        // Thực hiện xóa record dựa trên alphaId
        const result = await collection.deleteOne({ alphaId: alphaId });

        if (result.deletedCount === 1) {
            res.status(200).json({
                code: '000000',
                message: 'Successfully deleted competition'
            });
        } else {
            res.status(404).json({
                code: 'NOT_FOUND',
                message: 'No competition found with the given alphaId'
            });
        }
    } catch (e) {
        console.error('Delete API Error:', e);
        res.status(500).json({
            code: 'SERVER_ERROR',
            message: e.message
        });
    }
}
