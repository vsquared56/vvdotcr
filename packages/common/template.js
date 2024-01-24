import * as fs from "fs";
import * as path from "path";
import handlebars from "handlebars";

export function renderTemplate(templateName, input, context) {
    const directoryPath = path.join(context.executionContext.functionDirectory, '..', 'views', `${templateName}.hbs`);
    const templateContent = fs.readFileSync(directoryPath).toString();
    const template = handlebars.compile(templateContent);
    return template(input);
}