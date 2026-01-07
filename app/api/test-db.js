import clientPromise from './lib/mongodb.js';

export default async function handler(req, res) {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);

        // Test the connection by listing collections
        const collections = await db.listCollections().toArray();

        res.status(200).json({
            status: 'Connected',
            database: process.env.MONGODB_DB,
            collections: collections.map(c => c.name)
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ status: 'Error', message: e.message });
    }
}
