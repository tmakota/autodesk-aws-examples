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
