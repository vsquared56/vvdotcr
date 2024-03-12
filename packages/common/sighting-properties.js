import { dateTimeOptions, dateTimeLocale } from "./time.js"

export function renderSightingProperty(name, value) {
    var result;
    if (name.match(/.*Date/) && value) {
        result = (new Date(value)).toLocaleString(dateTimeLocale, dateTimeOptions);
    } else if (typeof value === 'string' || value instanceof String) {
        result = value;
    } else {
        result = JSON.stringify(value);
    }

    return result;
}