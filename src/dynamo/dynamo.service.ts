import { Injectable } from '@nestjs/common';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

@Injectable()
export class DynamoService {
  private readonly client: DynamoDBDocumentClient;

  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    this.client = DynamoDBDocumentClient.from(client);
  }

  async storeChunk(item: {
    fileName: string;
    chunkNo: number;
    textChunk: string;
    vector: number[];
    lshHash: string;
  }): Promise<void> {
    const chunkId = String(item.chunkNo).padStart(6, '0');
    const lshPrefix = item.lshHash.slice(0, 12);

    const dynamoItem = {
      PK: `FILE#${item.fileName}`,
      SK: `CHUNK#${chunkId}`,
      GSI1PK: `FILE#${item.fileName}`,
      GSI1SK: `LSH#${lshPrefix}#CHUNK#${chunkId}`,
      textChunk: item.textChunk,
      vector: JSON.stringify(item.vector),
      sourceFile: item.fileName,
      fullLSH: item.lshHash,
    };

    await this.client.send(
      new PutCommand({
        TableName: 'dumyUser',
        Item: dynamoItem,
      }),
    );
  }

  async fetchCandidatesByFileAndLshPrefix(
    fileName: string,
    lshPrefix: string,
  ): Promise<Record<string, any>[]> {
    const params = {
      TableName: 'dumyUser',
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :fp AND begins_with(GSI1SK, :lp)',
      ExpressionAttributeValues: {
        ':fp': `FILE#${fileName}`,
        ':lp': `LSH#${lshPrefix}`,
      },
      ProjectionExpression: 'textChunk,vector,sourceFile',
    };
    const result = await this.client.send(new QueryCommand(params));
    return result.Items ?? [];
  }

  async fetchAllChunksForFile(fileName:string,limit:100):Promise<any[]>{
    const result=await this.client.send(new QueryCommand({
      TableName:'dumyUser',
      KeyConditionExpression:'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues:{
        ':pk':`FILE#${fileName}`,
        ':sk':`CHUNK#`
      },
      ProjectionExpression:'textChunk,vector,sourceFile,SK',
      Limit:limit
    }))
    return result.Items ?? []
  }
}
