const fs = require('fs');

module.exports = async function (context, req) {
  //joining path of directory 
  const directoryPath = context.executionContext.functionDirectory;

  const fileContent = fs.readFileSync(context.executionContext.functionDirectory + '/sample.dat')
  context.res = {
    // status: 200, /* Defaults to 200 */
    body: {
      text: "This data is returned from the API!",
      request: req,
      fileContent: fileContent,
      directoryPath: directoryPath
    },
  };
};
