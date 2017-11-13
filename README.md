# autodesk-aws-examples - DWG File Conversion workshop
Examples of usage of Autodesk and AWS

## You will need:
- AWS CLI (https://aws.amazon.com/cli)
- Your favorite Code Editor/IDE (ive used Visual Source Code)
- AWS Account ('tis free: https://aws.amazon.com)

Each Example App might have its own config, please read/follow the instructions associatted with example.

In this lab, you will lear how to convert Autodesk DWG file into PDF using AWS Services and Forge API. 
AWS services used are 
Simple Storage Service (S3)
Identity and Access Management (IAM) 
Simple Notification Service (SNS) and 
AWS Lambda (Serverless Functions)

## Requirement:
- AWS Account (its free if you dont have one ) https://aws.amazon.com
- AWS CLI (installed and configured) 
- Autodesk Developer Account

## Here is flow of our application:
1.	Upload .dwg file to S3 bucket. We will use AWS CLI for the demo.
2.	S3 Event Management will trigger AWS Lambda (serverless) function
3.	AWS Lambda will obtain Forge OAuth token
4.	AWS Lambda will submit .dwg for conversion to .pdf
5.	Forge will convert file to PDF and upload back into AWS S3
6.	S3 Event Management will trigger Simple Notification Service (SNS)
7.	AWS SNS will send email to subscribed users

## S3 – Create Bucket and Folders
Login into your AWS Console and create new S3 bucket called autodesk-####. (replace ####)
Bucket names must be unique globally, so you may need to come up with creative replacement for #### in autodesk-#####.
Important: Create S3 bucket in region closest to you. Lambda function will need to reside in same region. 

Once S3 Bucket is created create two folders in that bucket
incoming-dwg
converted-pdf

For this conversion exercise, we will use Autodesk sample DWG file which you can download from here:
https://www.dropbox.com/s/kbpbuwpknuh6ukn/Bottom_plate.dwg?dl=0 

Download file on your local PC/Mac. Later on, we will use AWS CLI to upload the files from local PC to Amazon S3 incoming-dwg folder  

## Lambda Function 
Create Lambda and IAM role
IMPORTANT: Switch to Region in which you created S3 bucket before you create Lambda function

Create Lambda function from scratch

Name: njsConvertDgwToPdf
Role: Create Custom Role , your policy document needs to look like one below
```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::*"
        },
        {
            "Effect": "Allow",
            "Action": "logs:CreateLogGroup",
            "Resource": "arn:aws:logs:us-east-1:01234567891:*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": [
                "arn:aws:logs:us-east-1:01234567891:log-group:/aws/lambda/njsConvertDgwToPdf:*"
            ]
        }
    ]
}
```

Click Create Function. This will create Lambda function, replace code with below
```
'use strict';

const aws = require('aws-sdk');
const https = require('https');
const querystring = require('querystring');

const s3 = new aws.S3({ signatureVersion: 'v4' });

const defaultExpiration = 5;

// Autodesk AUTH Details
const authForm = {
    client_id: process.env.FORGE_CLIENT_ID,
    client_secret: process.env.FORGE_CLIENT_SECRET,
    aws_s3_bucket: process.env.S3_BUCKET_NAME,
    grant_type: 'client_credentials',
    scope: 'bucket:create bucket:read data:write data:read code:all' };
const authFormData = querystring.stringify(authForm);
const authContentLength = authFormData.length;

// An object of options to indicate where to post to
const authReq = {
    host: 'developer.api.autodesk.com',
    port: '443',
    path: '/authentication/v1/authenticate',
    method: 'POST',
    body: authFormData,
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': authContentLength,
    } };

const bb = {
    Arguments: {
        InputArguments: [{
            Resource: `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/incoming-dwg/Bottom_plate.dwg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAIZZYUXUXF3ESMELQ%2F20171009%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20171009T204214Z&X-Amz-Expires=1200&X-Amz-Security-Token=FQoDYXdzEK3%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDK83zzNijB%2FEx39NDyLrAbqwU8UEG0od4LJ65sNOZ9tnO3br8Fnr0yiu3ftFRuPNxkiZq7lI53A22YiAnI75GibMuD5qo5uzFlBWDJ8T0dOTD%2BjT6sXWsRZP4%2Fg4G8XqQk68WvbAMr8v0lJmKKEzH4%2FwmhWcvp7g50Lt7ZV2vN10VZHvyCo4mSQu4rDCOAPpM6Q0fN%2BuS8b4sZrubGHf6pA21MfbHmq%2FjxlOutjK7A37cEgkctValbPlhkpLrcJsow6RcyGJY1otYcHOo3McOph16S2hAV%2FKx6iNaVhTJrKLhI3reMqe2SWod%2FCofGHJWRrZPb0yiLc6Ylso6ZjvzgU%3D&X-Amz-Signature=8a326f559b910467414de6885f372bdcd95a466f09d559e7113e329bf19d906a&X-Amz-SignedHeaders=host`,
            Name: 'HostDwg' }],
	    OutputArguments: [{
            Name: 'Result',
            HttpVerb: 'PUT',
            Resource: `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/converted-pdf/result.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAIZZYUXUXF3ESMELQ%2F20171009%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20171009T204214Z&X-Amz-Expires=1200&X-Amz-Security-Token=FQoDYXdzEK3%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDK83zzNijB%2FEx39NDyLrAbqwU8UEG0od4LJ65sNOZ9tnO3br8Fnr0yiu3ftFRuPNxkiZq7lI53A22YiAnI75GibMuD5qo5uzFlBWDJ8T0dOTD%2BjT6sXWsRZP4%2Fg4G8XqQk68WvbAMr8v0lJmKKEzH4%2FwmhWcvp7g50Lt7ZV2vN10VZHvyCo4mSQu4rDCOAPpM6Q0fN%2BuS8b4sZrubGHf6pA21MfbHmq%2FjxlOutjK7A37cEgkctValbPlhkpLrcJsow6RcyGJY1otYcHOo3McOph16S2hAV%2FKx6iNaVhTJrKLhI3reMqe2SWod%2FCofGHJWRrZPb0yiLc6Ylso6ZjvzgU%3D&X-Amz-Signature=3f36fceefc269673b1a22aead3aade10a881269ca714e42db2ae75edb19565dc&X-Amz-SignedHeaders=host`,
            StorageProvider: 'Generic' } ] },
    ActivityId: 'PlotToPDF',
    Id: '' };


const convertReq = {
    host: 'developer.api.autodesk.com',
    port: '443',
    path: '/autocad.io/us-east/v2/WorkItems',
    method: 'POST',
    json: 'true',
    headers: {
        'Content-Type': 'application/json',
        Authorization: '' } };


/**************************
 *
 * *************************/
function getS3SignedURL(httpMethod, bucketName, pathToFileName, minToExpire) {
    let S3Function = null;
    const options = {
        Bucket: bucketName,
        Key: pathToFileName,
        Expires: minToExpire * 60,
    };

    switch (httpMethod) {
        case 'GET':
            S3Function = 'getObject';
            break;
        case 'PUT':
            S3Function = 'putObject';
            break;
        default:
            // throw error
    }

    const signedURL = s3.getSignedUrl(S3Function, options);
    console.log('Singed URL:', httpMethod, signedURL);
    return signedURL;
}

/*******************
 *
 * ***************/
function postConversion(context, oAuthToken, s3GetUrl, s3PutUrl) {
    convertReq.headers.Authorization = `Bearer ${oAuthToken}`;

    bb.Arguments.InputArguments[0].Resource = s3GetUrl;
    bb.Arguments.OutputArguments[0].Resource = s3PutUrl;
    convertReq.body = JSON.stringify(bb);

    //convertReq.body = querystring.stringify(convertReq_body);

    console.log('convert request event:', JSON.stringify(convertReq, null, 2));


    const postRequest = https.request(convertReq, (res) => {
        console.log(`postConversion::Got response: ${res.statusCode}`);

        let body = '';
        res.on('data', (chunk) => {
            console.log('postConversion::Getting DATA');
            body += chunk;
            //var responseObj = JSON.parse(body);
            console.log(`postConversion::Return: ${body}`);
            context.succeed();
        });
        res.on('end', () => {
            console.log('Getting END');
            context.done(body);
        });
        res.on('error', (e) => {
            context.fail(`error:${e.message}`);
        });
    });


    postRequest.write(JSON.stringify(bb));
    postRequest.end();
}

// this function is triggered when DWG file is uploaded to S3 bucket
exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Get the object from the event and show its content type
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

    const params = {
        Bucket: bucket,
        Key: key,
    };

    // extract file name
    const outFileName = `converted-pdf/${(params.Key.replace(/^.*[\\\/]/, '')).replace(/\.[^/.]+$/, '')}.pdf`;

    console.log(`Triggered by Bucket:${bucket}`);
    console.log(`Triggered By File:${key}`);

    // create S3 preSigned GET URL
    const s3GetUrl = getS3SignedURL('GET', params.Bucket, params.Key, defaultExpiration);
    const s3PutUrl = getS3SignedURL('PUT', params.Bucket, outFileName, defaultExpiration);
    console.log('GET URL:', s3GetUrl);
    console.log('PUT URL:', s3PutUrl);

   // this is for bit of javascript event loop trickery
   // I wanted to keep this Lambda 'plain' no add libraries and  i didnt want to switch to anothre language
    let forgeOAuthToken = null;
    const postRequest = https.request(authReq, (res) => {
        console.log(`Got response: ${res.statusCode}`);
        console.log(res.data);
        let body = '';
        res.on('data', (chunk) => {
            console.log('Getting DATA');
            body += chunk;
            const responseObj = JSON.parse(body);
            console.log(`AccessToken: ${responseObj.access_token}`);
            forgeOAuthToken = responseObj.access_token;

            postConversion(context, forgeOAuthToken, s3GetUrl, s3PutUrl);
        });
        res.on('end', () => {
            console.log('Getting END');
            context.done(body);
        });
        res.on('error', (e) => {
            context.fail(`error:${e.message}`);
        });
    });
    postRequest.write(authFormData);
    postRequest.end();

    console.log('after posted data to auth call');
    console.log(`Toke:${forgeOAuthToken}`);
    callback(null);
};
```

For Your Lambda Function you'll need to create 2 Environment variable.
FORGE_CLIENT_SECRET
FORGE_CLIENT_ID
set the values according to your Forge Application/module values 

Change execution time for Lambda function from 3 sec to 30 secs

## S3 Bucket Lambda Trigger
When DWG file is deposited in S3 bucket we want to trigger a Lambda function to process 
the file 
Using AWS Console navigate to your autodesk-#### bucket. Under Properties tab click on Events block. Click on Add Notification button.
Set values as following:
Name: TriggerLambdaFunction
Even(s): PUT
Prefix: incoming-dwg/
Suffix: .dwg
Send To: Lambda Function
Lambda: one you just created < njsConvertDgwToPdf>

## Create SNS topic & Subscribe to it
In your AWS Console navigate To Simple Notification Service (SNS), click on Create Topic.
Topic Name: PDFConvertTopic
Display Name: ADSK PDF

Click Create Subscription.
From Protocol dropdown select Email and enter your email address in the Endpoint field.
Note: You will receive email to acknowledge subscription, make sure you do so. 

Once Topic is created edit its policy to enable S3 to publish events to it.
Click on Other Topic Actions and select Edit Topic Policy from dropdown. 
Copy Policy from below for your topic.
```
{
  "Version": "2008-10-17",
  "Id": "__default_policy_ID",
  "Statement": [
    {
      "Sid": "__default_statement_ID",
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": [
        "SNS:GetTopicAttributes",
        "SNS:SetTopicAttributes",
        "SNS:AddPermission",
        "SNS:RemovePermission",
        "SNS:DeleteTopic",
        "SNS:Subscribe",
        "SNS:ListSubscriptionsByTopic",
        "SNS:Publish",
        "SNS:Receive"
      ],
      "Resource": "arn:aws:sns:us-east-1:012334567891:PDFConvertTopic",
      "Condition": {
        "ArnLike": {
          "aws:SourceArn": "arn:aws:s3:*:*:autodesk-####"
        }
      }
    }
  ]
}
```

## Create S3 Event Trigger when Forge uploads PDF
Once Forge Design Automation API, formerly known as the “AutoCAD I/O API”, creates PDF it will upload that PDF in the S3 converted-pdf folder 
* Name: SMSWhenPDFIsReady
* Even(s): PUT
* Prefix: converted-pdf/
* Suffix: .pdf
* Send To: SNS Topic
SNS: : one you just created < >

