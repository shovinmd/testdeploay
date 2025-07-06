require('dotenv').config();
const express = require('express');
const { MongoClient, GridFSBucket } = require('mongodb');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const cors = require('cors');
const stream = require('stream');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// MongoDB connection URI with username and password
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
  try {
    await client.connect();
    const db = client.db('fileuploads');
    bucket = new GridFSBucket(db, { bucketName: 'uploads' });
    console.log("Connected to MongoDB and GridFSBucket initialized");
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}
connectMongo();

// Multer storage engine using memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ err: 'No file uploaded' });
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
        res.status(500).json({ err: 'Error uploading file' });
      })
      .on('finish', () => {
        console.log('File uploaded:', filename);
        res.json({ filename: filename });
      });
  } catch (error) {
    console.error('Upload exception:', error);
    res.status(500).json({ err: 'Internal server error' });
  }
});

// Get file by filename
app.get('/file/:filename', async (req, res) => {
  try {
    const files = await client.db('fileuploads').collection('uploads.files').find({ filename: req.params.filename }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ err: 'No file exists' });
    }
    const file = files[0];
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${file.filename}"`);

    const downloadStream = bucket.openDownloadStreamByName(req.params.filename);

    downloadStream.on('error', (error) => {
      console.error('Download error:', error);
      res.status(500).end();
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error('Download exception:', error);
    res.status(500).json({ err: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ err: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
