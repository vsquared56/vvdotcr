const fs = require('fs');
const path = require("path");
const handlebars = require("handlebars");

module.exports = async function (context, req) {
  const directoryPath = path.join(context.executionContext.functionDirectory, '..', 'views', 'sample.hbs');

  const templateContent = fs.readFileSync(directoryPath).toString();
  var template = handlebars.compile(templateContent);

  context.res = {
    // status: 200, /* Defaults to 200 */
    body: {
      text: template({ name: "Vlad" }),
      directoryPath: directoryPath
    },
  };
};
