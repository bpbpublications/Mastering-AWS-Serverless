import {
  SSMClient,
  GetParametersByPathCommand,
  PutParameterCommand,
} from '@aws-sdk/client-ssm';
import {
  DynamoDBClient,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
export const handler = async (event) => {
  /* get ssm parameters */
  const ssmClient = new SSMClient({
    region: process.env.AWS_REGION,
  });
  const ssmGetCmd = new GetParametersByPathCommand({
    Path: '/function-rule-analytics-auth-callback/',
    Recursive: true,
    WithDecryption: false,
  });
  const ssmGetResp = await ssmClient.send(ssmGetCmd);
  console.debug('ssmGetResp:', ssmGetResp);
  if (!ssmGetResp.Parameters) {
    throw new Error('No ssm parameters found');
  }
  const startIsoTimestampParam = ssmGetResp.Parameters.find(
    (x) => x.Name === '/function-rule-analytics-auth-callback/next-start-iso-timestamp'
  );
  console.debug('startIsoTimestampParam:', startIsoTimestampParam);
  if (!startIsoTimestampParam) {
    throw new Error('Empty startIsoTimestampParam');
  }
  const startIsoTimestamp = startIsoTimestampParam.Value;
  console.debug('startIsoTimestamp:', startIsoTimestamp);
  const intervalParam = ssmGetResp.Parameters.find(
    (x) => x.Name === '/function-rule-analytics-auth-callback/interval-milliseconds'
  );
  console.debug('intervalParam:', intervalParam);
  if (!intervalParam) {
    throw new Error('Empty intervalParam');
  }
  const intervalMilliseconds = Number(intervalParam.Value);
  console.debug('intervalMilliseconds:', intervalMilliseconds);
  /* time check */
  const now = new Date().valueOf();
  const start = new Date(startIsoTimestamp).valueOf();
  const end = new Date(start + intervalMilliseconds - 1).valueOf();
  if (now < end) {
    console.warn('Too early');
    return;
  }
  /* query dynamodb table */
  const ddbClient = new DynamoDBClient({
    region: process.env.AWS_REGION,
  });
  let count = 0;
  const queryInput = {
    TableName: 'analytics',
    ExpressionAttributeNames: {
      '#PK': 'dataType',
      '#SK': 'timestamp',
    },
    ExpressionAttributeValues: {
      ':pk': {
        S: 'auth-callback',
      },
      ':sk1': {
        N: `${start}`,
      },
      ':sk2': {
        N: `${end}`,
      },
    },
    KeyConditionExpression: '#PK = :pk AND #SK BETWEEN :sk1 and :sk2',
    Select: 'COUNT',
    ExclusiveStartKey: undefined,
  };
  const queryCmd = new QueryCommand(queryInput);
  console.debug('queryCmd:', queryCmd);
  do {
    const queryResp = await ddbClient.send(queryCmd);
    console.debug('queryResp:', queryResp);
    queryInput.ExclusiveStartKey = queryResp.LastEvaluatedKey;
    count += queryResp.Count;
    console.debug('count:', count);
  } while (queryInput.ExclusiveStartKey);
  /* get s3 object data */
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
  });
  let objectBody = 'timestamp,value';
  try {
    const getObjCmd = new GetObjectCommand({
      Bucket: 'masteringawsserverlessbook-data',
      Key: 'analytics/auth-callback.csv',
    });
    const getObjectResp = await s3Client.send(getObjCmd);
    if (getObjectResp.Body) {
      objectBody = await getObjectResp.Body.transformToString();
    }
  } catch (e) {
    console.warn('Object does not exist');
  }
  /* write s3 object data */
  console.debug('objectBody:', objectBody);
  const objectStartTimestamp = startIsoTimestamp
    .replace('T', ' ').replace('.000Z', '');
  if (objectBody.search(objectStartTimestamp) === -1) {
    console.info('Data already exists in the S3 object.');
    objectBody += `\n${objectStartTimestamp},${count}`;
  }
  console.debug('objectBody:', objectBody);
  const putObjCmd = new PutObjectCommand({
      Bucket: 'masteringawsserverlessbook-data',
      Key: 'analytics/auth-callback.csv',
      Body: objectBody,
    });
  await s3Client.send(putObjCmd);
  /* update ssm parameter */
  const putParamCmd = new PutParameterCommand({
    Name: '/function-rule-analytics-auth-callback/next-start-iso-timestamp',
    Value: new Date(end + 1).toISOString(),
    Overwrite: true,
  });
  await ssmClient.send(putParamCmd);
};
