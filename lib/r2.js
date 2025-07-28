import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_KEY_ID,
    secretAccessKey: process.env.R2_SECRET,
  },
});
