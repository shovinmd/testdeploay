const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');
const cors = require('cors');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  }
});

let bucket;

async function connectMongo() {
  if (!bucket) {
    await client.connect();
    const db = client.db('fileuploads');
    bucket = new GridFSBucket(db, { bucketName: 'uploads' });
  }
}

module.exports = async function (req, res) {
  cors()(req, res, async () => {
    await connectMongo();

    const filename = req.query.filename;
    if (!filename) {
      res.status(400).json({ error: 'Filename is required' });
      return;
    }

    if (req.method === 'GET') {
      try {
        const files = await client.db('fileuploads').collection('uploads.files').find({ filename }).toArray();
        if (!files || files.length === 0) {
          res.status(404).json({ error: 'No file exists' });
          return;
        }
        const file = files[0];
        res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);

        const downloadStream = bucket.openDownloadStreamByName(filename);

        downloadStream.on('error', (error) => {
          console.error('Download error:', error);
          res.status(500).end();
        });

        downloadStream.pipe(res);
      } catch (error) {
        console.error('Download exception:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    } else if (req.method === 'DELETE') {
      try {
        const files = await client.db('fileuploads').collection('uploads.files').find({ filename }).toArray();
        if (!files || files.length === 0) {
          res.status(404).json({ error: 'No file exists' });
          return;
        }
        const fileId = files[0]._id;
        await bucket.delete(fileId);
        res.status(200).json({ message: `File ${filename} deleted successfully` });
      } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  });
};
