# dx-lambda-slack-handler

A basic AWS Lambda function to be triggered by Cloudwatch Log events for posting to our Slack channel. Update and deployment steps are as follows;

- Execute `deploy` with a new version number and the DX S3 Bucket for hosting the code. This will reinstall the node modules, zip the necessary code, and copy the zip to the S3 Bucket.

      $ ./deploy 1.2.3 THE-BUCKET-NAME-HERE

* Find the `osu-dx-AppErrorSlackNotifier` lambda, and update it to point at the deployed zip file using the `Upload a file from Amazon S3` selection in the `Code entry type` configuration (or deploy with AWS CLI).

* Profit.

_Thanks to https://github.com/firstandthird/lambda-slack-handler for the starting point to hack and personalize for our needs._
~
