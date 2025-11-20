import { Storage } from '@google-cloud/storage';

const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
const publicDir = process.env.PUBLIC_OBJECT_SEARCH_PATHS || 'public';
const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

if (!bucketId) {
  throw new Error('DEFAULT_OBJECT_STORAGE_BUCKET_ID is not set');
}

const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

const bucket = storage.bucket(bucketId);

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
}

export async function uploadProfilePhoto(
  file: Express.Multer.File,
  userId: string
): Promise<UploadResult> {
  const timestamp = Date.now();
  const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `${publicDir}/profile-photos/${userId}_${timestamp}_${sanitizedFilename}`;

  const blob = bucket.file(filename);
  const blobStream = blob.createWriteStream({
    resumable: false,
    metadata: {
      contentType: file.mimetype,
    },
  });

  return new Promise((resolve, reject) => {
    blobStream.on('error', (err) => {
      reject(new Error(`Error uploading file: ${err.message}`));
    });

    blobStream.on('finish', async () => {
      try {
        await blob.makePublic();
        
        const publicUrl = `https://storage.googleapis.com/${bucketId}/${filename}`;

        resolve({
          url: publicUrl,
          filename,
          size: file.size,
        });
      } catch (err: any) {
        reject(new Error(`Error making file public: ${err.message}`));
      }
    });

    blobStream.end(file.buffer);
  });
}

export async function deleteProfilePhoto(filename: string): Promise<void> {
  try {
    await bucket.file(filename).delete();
  } catch (err: any) {
    console.error(`Error deleting file ${filename}:`, err.message);
  }
}
