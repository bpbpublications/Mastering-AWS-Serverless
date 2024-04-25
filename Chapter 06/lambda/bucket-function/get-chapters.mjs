import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
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
    const s3Client = new S3Client({ region: 'us-east-1' });
    const s3Command = new GetObjectCommand({
      Bucket: 'masteringawsserverlessbook-data',
      Key: 'chapters.json',
    });
    const s3Response = await s3Client.send(s3Command);
    const objectData = await s3Response.Body.transformToString();
    response.statusCode = 200;
    response.body = objectData;
  } catch (e) {
    console.error(e);
  }
  return response;
};
