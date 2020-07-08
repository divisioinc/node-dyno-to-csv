const DynoToCsv = require("./index");

const ACCESS_KEY = "Your Access Key";
const SECRET_KEY = "Your Secret Key";
const AWS_REGION = "sa-east-1";
const DYNAMO_TABLE = "The table name";
const DYNAMO_TABLE_COLUMNS = ["column_1", "column_2", "column_3"];
const AWS_S3_BUCKET = "AWS Bucket";

async function test() {
  const exportToCsv = new DynoToCsv({
    credentials: {
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET_KEY,
      region: AWS_REGION,
    },
    storage: {
      s3: {
        bucket: AWS_S3_BUCKET,
      },
    },
  });

  try {
    const response = await exportToCsv.exportData({
      TableName: DYNAMO_TABLE,
      AttributesToGet: DYNAMO_TABLE_COLUMNS,
    });

    console.log("test response ", response);
  } catch (err) {
    console.log("test error", err);
  }
}

test();
