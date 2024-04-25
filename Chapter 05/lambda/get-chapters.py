import json

def lambda_handler(event, context):
  return {
    "statusCode": 200,
    "headers": {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    "body": json.dumps([
      {
        "id": 1,
        "title": "Chapter 1",
        "description": "The description for chapter 1."
      },
      {
        "id": 2,
        "title": "Chapter 2",
        "description": "The description for chapter 2."
      },
      {
        "id": 3,
        "title": "Chapter 3",
        "description": "The description for chapter 3."
      }
    ])
  }
