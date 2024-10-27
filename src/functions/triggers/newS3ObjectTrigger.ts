import { SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import type { S3Event } from "aws-lambda";
import { randomUUID } from "crypto";
import { sqsClient } from "../../clients/sqsClient";
import { env } from "../../config/env";

export async function handler(event: S3Event) {
  const sendMessageBatchCommand = new SendMessageBatchCommand({
    QueueUrl: env.IMAGE_PROCESSING_QUEUE_URL,
    Entries: event.Records.map(record => ({
      Id: randomUUID(),
      MessageBody: JSON.stringify({
        bucket: record.s3.bucket.name,
        key: record.s3.object.key,
      })
    }))
  });

  await sqsClient.send(sendMessageBatchCommand);
}
