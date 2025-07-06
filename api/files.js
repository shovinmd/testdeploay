const { MongoClient } = require('mongodb');
const cors = require('cors');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  }
});

async function connectMongo() {
  if (!client.isConnected()) {
    await client.connect();
  }
}

module.exports = async function (req, res) {
  cors()(req, res, async () => {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    await connectMongo();

    try {
      const files = await client.db('fileuploads').collection('uploads.files').find({}).toArray();
      res.status(200).json(files);
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
