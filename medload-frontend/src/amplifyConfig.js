import { Amplify } from "aws-amplify";

export function configureAuth() {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: "us-east-1_0wLZk1CLZ",
        userPoolClientId: "1q7844i172ml461onlo8veuj5u",
        region: "us-east-1",
      },
    },
  });
}