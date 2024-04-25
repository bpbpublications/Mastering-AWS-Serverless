import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument, ScanCommand } from "@aws-sdk/lib-dynamodb";
export const handler = async (event) => {
  const response = {
    statusCode: 500,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([]),
  };
  try {
    const ddbClient = new DynamoDBClient({ region: 'us-east-1' });
    const ddbDocClient = DynamoDBDocument.from(ddbClient);
    const ddbCommand = new ScanCommand({
      TableName: 'chapters',
    });
    const ddbResponse = await ddbDocClient.send(ddbCommand);
    response.statusCode = 200;
    console.debug('ddbResponse.Items', typeof ddbResponse.Items, ddbResponse.Items);
    response.body = JSON.stringify(ddbResponse.Items);
  } catch (e) {
    console.error(e);
  }
  return response;
};
