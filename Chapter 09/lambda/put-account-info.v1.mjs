import {
  CognitoIdentityProviderClient,
  UpdateUserAttributesCommand,
  /* !!!! START OF CHANGES !!!! */
  GetUserCommand,
  /* !!!! END OF CHANGES !!!! */
} from "@aws-sdk/client-cognito-identity-provider";
/* !!!! START OF CHANGES !!!! */
import {
  SESv2Client,
  SendEmailCommand,
} from "@aws-sdk/client-sesv2";
/* !!!! END OF CHANGES !!!! */
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
    /* !!!! START OF CHANGES !!!! */
    const userInfo = await cognitoClient.send(
      new GetUserCommand({
        AccessToken: event.headers.Authorization,
      })
    );
    const userEmail = userInfo.UserAttributes.find(
      (x) => x.Name === 'email'
    ).Value;
    const fromEmail = 'Mastering AWS Serverless Book ' + 
      '<no-reply@masteringawsserverlessbook.com>';
    const sesClient = new SESv2Client({
      region: process.env.AWS_REGION,
    });
    const sesCommand = new SendEmailCommand({
      FromEmailAddress: fromEmail,
      Destination: {
        ToAddresses: [userEmail],
      },
      ReplyToAddresses: [fromEmail],
      Content: {
        Simple: {
          Subject: {
            Data: 'Name was updated',
          },
          Body: {
            Text: {
              Data: 'You updated your name via the website.',
            },
            Html: {
              Data: 'You updated your name via the website.',
            },
          },
        },
      },
    });
    await sesClient.send(sesCommand);
    /* !!!! END OF CHANGES !!!! */
    response.statusCode = 200;
  } catch (e) {
    console.error(e);
  }
  return response;
};