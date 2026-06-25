export const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  s3Bucket: process.env.AWS_S3_BUCKET || '',
  cloudFrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN || '',
};

export function isAwsConfigured(): boolean {
  return Boolean(
    awsConfig.accessKeyId &&
    awsConfig.secretAccessKey &&
    awsConfig.s3Bucket &&
    awsConfig.cloudFrontDomain,
  );
}
