import * as fs from 'fs';

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

import { awsConfig } from '../config/aws';

const s3Client = new S3Client({
  region: awsConfig.region,
  credentials: {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
  },
});

export async function uploadToS3(
  localPath: string,
  key: string,
  contentType: string,
): Promise<string> {
  const fileStream = fs.createReadStream(localPath);
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: awsConfig.s3Bucket,
      Key: key,
      Body: fileStream,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    },
  });

  await upload.done();
  return `https://${awsConfig.cloudFrontDomain}/${key}`;
}

export async function uploadBufferToS3(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: awsConfig.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    }),
  );
  return `https://${awsConfig.cloudFrontDomain}/${key}`;
}

export async function deleteFromS3(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: awsConfig.s3Bucket,
      Key: key,
    }),
  );
}

export function generateS3Key(videoId: string, fileName: string): string {
  return `videos/${videoId}/${fileName}`;
}
