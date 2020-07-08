const AWS = require("aws-sdk");

function NodeDynoToCsv(configuration) {
  let dynoInstance;
  let s3Instance;
  let bucketName;
  let output = [];
  let outputArray;
  let attributesToGet;
  let limitCounter = 0;
  let bucketVerified = false;

  const verifyBucket = async () => {
    //lets configure storage
    if (configuration.hasOwnProperty("storage")) {
      // we're going to store with AWS S3
      if (configuration.storage.hasOwnProperty("s3")) {
        if (configuration.storage.s3.hasOwnProperty("instance")) {
          //we've been supplied with an s3 instance
          if (configuration.storage.s3.instance instanceof AWS.S3) {
            s3Instance = configuration.storage.s3.instance;
          } else {
            throw new Error("Instance is not of type AWS.S3");
          }
        }

        //bucket where this should be created
        if (configuration.storage.s3.hasOwnProperty("bucket")) {
          const params = {
            Bucket: configuration.storage.s3.bucket,
          };

          try {
            await s3Instance.headBucket(params).promise();

            bucketName = configuration.storage.s3.bucket;
            bucketVerified = true;
          } catch (err) {
            // if the bucket doesn't exist we need to create it
            const paramsNewBucket = {
              Bucket: configuration.storage.s3.bucket,
              ACL: "authenticated-read",
            };

            try {
              const dataS3Instance = await s3Instance
                .createBucket(paramsNewBucket)
                .promise();

              if (dataS3Instance) {
                bucketName = configuration.storage.s3.bucket;
                bucketVerified = true;
              }
            } catch (err) {
              console.log("Create Bucket error", err);
            }
          }
        }
      }
    }
  };

  const init = async () => {
    if (configuration.hasOwnProperty("credentials")) {
      AWS.config.update(configuration.credentials);

      dynoInstance = new AWS.DynamoDB();
      s3Instance = new AWS.S3();

      // if a dyno instance is used instead of us setting it up
    } else if (configuration.hasOwnProperty("dynamodbInstance")) {
      if (configuration.dynamodbInstance instanceof AWS.DynamoDB) {
        dynoInstance = configuration.dynamodbInstance;
      } else {
        throw new Error("Instance is not of type AWS.DynamoDB");
      }
    } else {
      throw new Error("Unable to configure with valid DynamoDB Instance");
    }

    await verifyBucket();
  };

  init();

  const query = async (params) => {
    try {
      const data = await dynoInstance.scan(params).promise();

      if (typeof data.Items !== "undefined") {
        output = output.concat(data.Items);
      }

      if (data.Count !== 0 && typeof data.LastEvaluatedKey !== "undefined") {
        limitCounter += data.Count;

        // if there is more data we need to keep fetching
        if (
          typeof params.Limit !== "undefined" &&
          limitCounter >= params.Limit
        ) {
          return;
        } else {
          params.ExclusiveStartKey = data.LastEvaluatedKey;

          await query(params);
        }
      } else {
        return;
      }
    } catch (err) {
      console.log("Query Scan Error", err);
    }
  };

  const toCSV = () =>
    new Promise((resolve) => {
      let csvArray = [];

      output.forEach(function (row) {
        const rowArray = [];

        attributesToGet.forEach(function (key) {
          let theType;
          let value;
          try {
            theType = Object.keys(row[key]).join();
            value = row[key][Object.keys(row[key])[0]];
          } catch (exception) {
            theType = "S";
            value = "";
          }

          if (theType === "N") {
            value = Number(value);
          } else {
            value = '"' + value + '"';
          }

          rowArray.push(value);
        });
        const joined = rowArray.join();

        //process the row array and put it into the CSV array
        csvArray.push(joined);
      });

      resolve(csvArray);
    });

  const writeToStorage = async () => {
    outputArray.unshift(attributesToGet.join());
    const fileName = new Date().toUTCString() + ".csv";
    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: outputArray.join("\r\n"),
      ContentType: "text/csv",
      ContentDisposition: 'attachment;filename="' + fileName + '"',
    };

    try {
      await s3Instance.putObject(params).promise();
      const nParams = { Bucket: params.Bucket, Key: params.Key };
      const response = await s3Instance.getSignedUrl("getObject", nParams);

      return response;
    } catch (err) {
      return err;
    }
  };

  this.describe = function (tableName, callback) {
    const params = {
      TableName: tableName,
    };

    dynoInstance.describeTable(params, function (err, data) {
      callback(err, data);
    });
  };

  this.exportData = async (params, callback) => {
    output = [];
    outputArray = [];

    attributesToGet = params.AttributesToGet.sort();

    if (bucketVerified) {
      try {
        await query(params);
        const data = await toCSV();
        outputArray = data;
        const response = await writeToStorage();

        return response;
      } catch (err) {
        return err;
      }
    } else {
      await verifyBucket();
      const response = await this.exportData(params);
      return response;
    }
  };

  this.prettyPrint = function () {
    outputArray.unshift(attributesToGet.join());
    outputArray.forEach(function (row) {
      console.log(row);
    });
  };
}

module.exports = NodeDynoToCsv;
