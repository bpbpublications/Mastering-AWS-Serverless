import {
  CognitoIdentityProviderClient,
  GetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  SESv2Client,
  SendEmailCommand,
} from "@aws-sdk/client-sesv2";
export const handler = async (event) => {
  try {
    const cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION,
    });
    const sesClient = new SESv2Client({
      region: process.env.AWS_REGION,
    });
    for (let record of event.Records) {
      console.debug(record);
      if (!record.Sns || record.Sns.Type !== 'Notification') {
        console.warn('Record is not an SNS notification');
        continue;
      }
      const userInfo = await cognitoClient.send(
        new GetUserCommand({
          AccessToken: record.Sns.Message,
        })
      );
      const userEmail = userInfo.UserAttributes.find(
        (x) => x.Name === 'email'
      ).Value;
      const fromEmail = 'Mastering AWS Serverless Book ' + 
        '<no-reply@masteringawsserverlessbook.com>';
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
    };
  } catch (e) {
    console.error(e);
  }
  return;
};