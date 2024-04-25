import {
  CognitoIdentityProviderClient,
  UpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  SNSClient,
  PublishCommand,
} from "@aws-sdk/client-sns";
export const handler = async (event) => {
  const response = {
    statusCode: 500,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  };
  try {
    if (!event.body) {
      throw new Error('Empty body');
    }
    const bodyObj = JSON.parse(event.body);
    if (!bodyObj.given_name) {
      throw new Error('No given_name');
    }
    const cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION,
    });
    const cognitoCommand = new UpdateUserAttributesCommand({
      AccessToken: event.headers.Authorization,
      UserAttributes: [
        {
          Name: 'given_name',
          Value: bodyObj.given_name,
        },
      ],
    });
    await cognitoClient.send(cognitoCommand);

    const snsClient = new SNSClient({
      region: process.env.AWS_REGION,
    });
    const publishCommand = new PublishCommand({
      TopicArn: 'arn:aws:sns:us-east-1:{accountId}:function-sns-send-email',
      Message: event.headers.Authorization,
    });
    await snsClient.send(publishCommand);

    response.statusCode = 200;
  } catch (e) {
    console.error(e);
  }
  return response;
};