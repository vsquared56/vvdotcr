const fs = require('fs');

module.exports = async function (context, req) {
  //joining path of directory 
  const directoryPath = context.executionContext.functionDirectory;

  var allFiles;
  //passsing directoryPath and callback function
  fs.readdir(directoryPath, function (err, files) {
    //handling error
    if (err) {
      allFiles = ('Unable to scan directory: ' + err);
    }
    else {
      allFiles = files;
    }
  });
  context.res = {
    // status: 200, /* Defaults to 200 */
    body: {
      text: "This data is returned from the API!",
      request: req,
      allFiles: allFiles,
      directoryPath: directoryPath
    },
  };
};
