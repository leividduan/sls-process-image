import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../clients/s3Client";

interface IGetS3ObjectMetadataParams {
  bucketName: string;
  key: string;
}

export async function getS3ObjectMetadata({ bucketName, key }: IGetS3ObjectMetadataParams) {
  const headObjectCommand = new HeadObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const { Metadata } = await s3Client.send(headObjectCommand);

  return Metadata ?? {};
}
