import { PutObjectCommand } from "@aws-sdk/client-s3";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { SQSEvent } from "aws-lambda";
import sharp from "sharp";
import { dynamoClient } from "../../clients/dynamoClient";
import { s3Client } from "../../clients/s3Client";
import { extractFileInfo } from "../../utils/extractFileInfo";
import { getS3Object } from "../../utils/getS3Object";
import { getS3ObjectMetadata } from "../../utils/getS3ObjectMetadata";

export async function handler(event: SQSEvent) {
  await Promise.all(
    event.Records.map(async (record) => {
      const { bucket, key } = JSON.parse(record.body);

      const [file, metadata] = await Promise.all([
        getS3Object({ bucketName: bucket, key: key }),
        getS3ObjectMetadata({ bucketName: bucket, key: key })
      ])

      const liveId = metadata.liveid;

      if (!liveId) {
        return;
      }

      const [hdImage, sdImage, placeholderImage] = await Promise.all([
        sharp (file)
        .resize({
          width: 1280,
          height: 720,
          background: '#000',
          fit: 'contain',
        })
        .toFormat('webp', { quality: 80 })
        .toBuffer(),
        sharp (file)
        .resize({
          width: 640,
          height: 360,
          background: '#000',
          fit: 'contain',
        })
        .toFormat('webp', { quality: 80 })
        .toBuffer(),
        sharp (file)
        .resize({
          width: 124,
          height: 70,
          background: '#000',
          fit: 'contain',
        })
        .toFormat('webp', { quality: 80 })
        .blur(5)
        .toBuffer(),
      ])

      const { fileName } = extractFileInfo(key);

      const hdThumbnailKey = `processed/${fileName}-hd.webp`;
      const sdThumbnailKey = `processed/${fileName}-sd.webp`;
      const placeholderThumbnailKey = `processed/${fileName}-placeholder.webp`;

      const hdPutObjectCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: hdThumbnailKey,
        Body: hdImage,
        ContentType: 'image/webp',
        Metadata: { liveid: liveId }
      });

      const sdPutObjectCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: sdThumbnailKey,
        Body: sdImage,
        ContentType: 'image/webp',
        Metadata: { liveid: liveId }
      });

      const placeholderPutObjectCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: placeholderThumbnailKey,
        Body: placeholderImage,
        ContentType: 'image/webp',
        Metadata: { liveid: liveId }
      });

      const updateCommand = new UpdateCommand({
        TableName: process.env.LIVES_TABLE,
        Key: { id: liveId },
        UpdateExpression: 'SET #hdThumbnailKey = :hdThumbnailKey, #sdThumbnailKey = :sdThumbnailKey, #placeholderThumbnailKey = :placeholderThumbnailKey',
        ExpressionAttributeNames: {
          '#hdThumbnailKey': 'hdThumbnailKey',
          '#sdThumbnailKey': 'sdThumbnailKey',
          '#placeholderThumbnailKey': 'placeholderThumbnailKey',
        },
        ExpressionAttributeValues: {
          ':hdThumbnailKey': hdThumbnailKey,
          ':sdThumbnailKey': sdThumbnailKey,
          ':placeholderThumbnailKey': placeholderThumbnailKey,
        },
      });

      await Promise.all([
        dynamoClient.send(updateCommand),
        s3Client.send(hdPutObjectCommand),
        s3Client.send(sdPutObjectCommand),
        s3Client.send(placeholderPutObjectCommand),
      ]);
    })
  );
}
