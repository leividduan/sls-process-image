import { PutObjectCommand } from '@aws-sdk/client-s3';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { dynamoClient } from '../../clients/dynamoClient';
import { s3Client } from '../../clients/s3Client';
import { env } from '../../config/env';
import { extractFileInfo } from '../../utils/extractFileInfo';
import { response } from '../../utils/response';


const schema = z.object({
  title: z.string().min(1),
  number: z.number().min(0),
  fileName: z.string().min(0),
})

export async function handler(event: APIGatewayProxyEventV2) {
  const body = JSON.parse(event.body ?? '{}');

  const { success, data, error } = schema.safeParse(body);

  if (!success) {
    return response(400, { error: error.issues });
  }

  const { number, title, fileName } = data;
  const { extension } = extractFileInfo(fileName);

  const liveId = randomUUID();
  const thumbnailKey = `uploads/${randomUUID()}.${extension}`;

  const putItemCommand = new PutCommand({
    TableName: env.LIVES_TABLE,
    Item: {
      id: liveId,
      number,
      title,
      thumbnailKey,
    },
  });

  const putObjectCommand = new PutObjectCommand({
    Bucket: env.LIVES_IMAGES_BUCKET,
    Key: thumbnailKey,
    Metadata: {
      liveid: liveId,
    }
  });

  const uploadURL = await getSignedUrl(s3Client, putObjectCommand, { expiresIn: 600 });

  await dynamoClient.send(putItemCommand)

  return response(201, { liveId, uploadURL });
}
