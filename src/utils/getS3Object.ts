import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { s3Client } from "../clients/s3Client";

interface IGetS3ObjectParams {
  bucketName: string;
  key: string;
}

export async function getS3Object({ bucketName, key }: IGetS3ObjectParams) {
  const getObjectCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const { Body } = await s3Client.send(getObjectCommand);

  if (!Body || !(Body instanceof Readable)) {
    throw new Error(`Cannot find file: ${bucketName}/${key}`);
  }

  const chunks = [];
  for await (const chunk of Body) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}
