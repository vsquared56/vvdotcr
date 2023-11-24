const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  newPipeline
} = require("@azure/storage-blob");

const streamifier = require('streamifier');
const multipart = require('parse-multipart');

const STORAGE_ACCOUNT = process.env.STORAGE_ACCOUNT;
const STORAGE_KEY = process.env.STORAGE_KEY;
const STORAGE_CONTAINER = process.env.STORAGE_CONTAINER;
const STORAGE_URL = `https://${STORAGE_ACCOUNT}.blob.core.windows.net`;

module.exports = async function (context, req) {
  // Get the image data from the request
  const bodyBuffer = Buffer.from(req.body);

  // use the parse-multipart library to parse the multipart form data
  const boundary = multipart.getBoundary(req.headers["content-type"]);
  const parts = multipart.Parse(bodyBuffer, boundary);

  const fileData = parts[0].data;
  // Append a date string to the front to make every file name unique
  const fileName = Date.now() + parts[0].filename;
  const contentType = parts[0].type;

  // Set auth credentials for upload
  const sharedKeyCredential = new StorageSharedKeyCredential(
    STORAGE_ACCOUNT,
    STORAGE_KEY
  );
  const pipeline = newPipeline(sharedKeyCredential);

  // Upload the file
  const blobServiceClient = new BlobServiceClient(STORAGE_URL, pipeline);
  const containerClient =
    blobServiceClient.getContainerClient(STORAGE_CONTAINER);
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);
  const uploadBlobResponse = await blockBlobClient.uploadStream(
    streamifier.createReadStream(new Buffer(fileData)),
    fileData.length,
    5,
    {
      blobHTTPHeaders: {
        blobContentType: contentType
      }
    }
  );

  context.bindings.cosmos = {
    id: fileName,
    imageUrl: `${STORAGE_URL}/${STORAGE_CONTAINER}/${fileName}`
  }

  context.res = {
    body: { imageUrl: `${STORAGE_URL}/${STORAGE_CONTAINER}/${fileName}` }
  };
};