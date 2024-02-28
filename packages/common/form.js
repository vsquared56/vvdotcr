export function processFormItems(form, items) {
  var results = {};
  for (const item of items) {
    var formReceivedValue = form.get(item.name);
    if (item.type === "formToggle" && (!formReceivedValue || formReceivedValue.value.toString() !== "on")) {
      results[item.name] = null;
    } else if (item.type === "formToggle") { //Form toggles can include subitems, process those recursively
      results[item.name] = processFormItems(form, item.subItems);
    } else if (item.type === "toggle") { //Toggle values can be missing, check them first
      if (!formReceivedValue) {
        results[item.name] = item.offValue;
      } else if (formReceivedValue.value.toString() === "on") {
        results[item.name] = item.onValue;
      } else {
        throw new Error(`Error in submitted form -- toggle value ${item.name} is set, but the value is not 'on'.`);
      }
    } else if (!formReceivedValue) {
      results[item.name] = null;
      throw new Error(`Error in submitted form -- required value ${item.name} is missing.`);
    } else if (item.type === "select") {
      const validatedValue = formReceivedValue.value.toString();
      if (!item.validValues.includes(validatedValue)) {
        throw new Error(`Error in submitted form -- select value ${item.name} is not one of the allowed options.`);
      } else {
        results[item.name] = validatedValue;
      }
    } else if (item.type === "int") {
      const validatedValue = parseInt(formReceivedValue.value.toString());
      if (validatedValue < item.min || validatedValue > item.max) {
        throw new Error(`Error in submitted form -- int value ${item.name} is out of range.`);
      } else {
        results[item.name] = validatedValue;
      }
    }
  }

  return results;
}