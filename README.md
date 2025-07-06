# MongoDB File Upload with Node.js

This project demonstrates how to upload PDF, audio, and video files to MongoDB using Node.js, Express, Multer, and GridFS.

## Setup

1. Make sure you have MongoDB installed and running on your machine.
2. Clone this project or copy the files.
3. Run `npm install` to install dependencies.
4. Update the MongoDB connection string in `server.js` if needed.
5. Start the server with `npm start`.

## Usage

- Upload a file (PDF, audio, video) via POST request to `/upload` with form-data key `file`.
- Access uploaded files via GET request to `/file/:filename`.

Example using curl to upload a file:

```bash
curl -F "file=@/path/to/your/file.pdf" http://localhost:3000/upload
```

Example to get a file:

```bash
curl http://localhost:3000/file/<filename>
```

Replace `<filename>` with the filename returned from the upload response.

## Notes

- Files are stored in MongoDB using GridFS.
- Only PDF, audio, and video files are supported for retrieval.
