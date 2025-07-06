const { MongoClient, GridFSBucket } = require('mongodb');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const stream = require('stream');
const cors = require('cors');

const storage = multer.memoryStorage();
const upload = multer({ storage });

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
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    await connectMongo();

    upload.single('file')(req, res, async (err) => {
      if (err) {
        res.status(500).json({ error: 'Error uploading file' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      try {
        const filename = crypto.randomBytes(16).toString('hex') + path.extname(req.file.originalname);
        const readableStream = new stream.Readable();
        readableStream.push(req.file.buffer);
        readableStream.push(null);

        const uploadStream = bucket.openUploadStream(filename, {
          contentType: req.file.mimetype,
        });

        readableStream.pipe(uploadStream)
          .on('error', (error) => {
            console.error('Upload error:', error);
            res.status(500).json({ error: 'Error uploading file' });
          })
          .on('finish', () => {
            console.log('File uploaded:', filename);
            res.status(200).json({ filename: filename });
          });
      } catch (error) {
        console.error('Upload exception:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  });
};
