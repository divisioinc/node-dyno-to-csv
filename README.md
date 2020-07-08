# node-dyno-to-csv

A NodeJS Module that exports AWS DynamoDB query results to CSV, presently only stores to S3.
Module will return an S3 signedURL pointing to the saved data.

#### //TODO:

- Save locally
- Configure AWS to be more flexible
- Alias Column Headers
- Reduce query complexity

## Usage

```
npm install dyno-to-csv
```

```
const DynoToCsv = require('dyno-to-csv');
```

##### Configure with AWS Credentials

```

const exportToCsv = new DynoToCsv({
    credentials: {
      accessKeyId: 'ACCESS_KEY',
      secretAccessKey: 'SECRET_KEY',
      region: 'AWS_REGION',
    },
    storage: {
      s3: {
        bucket: 'AWS_S3_BUCKET',
        // If bucket doesn't exist, it will be created with ACL: authenticated-read
      },
    },
  });

const response = await exportToCsv.exportData({
    TableName: 'DYNAMO_TABLE',
    AttributesToGet: ['column_1', 'column_2'],
});

```

### Just pass in a legitimate DynamoDB query and you're done.

### At the moment, your query must contain the property: AttributesToGet: []

```
/**
 * Converts dynamodb query result to csv format, response with an s3 signedURL
 * @param {DynamoDB query} query
 * @return {String} S3 signed URL
 */
await exportToCsv.exportData(query);
```

### Run test

Put your credentials at the file `test.js` and run the command bellow

```
node test
```
