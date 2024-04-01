/* The permissions and location JS APIs are async, but HTMX is fairly limited in making async
 * calls on an outbound request.  The only HTMX events we can delay are htmx:confirm, but the only
 * events that support adding request parameters are htmx:configRequest.  So we do something like this:
 * 1. Prevent htmx:confirm from completing
 * 2. Call the async API
 * 3. Save the async results in a global variable
 * 4. Add a handler to htmx:configRequest
 * 5. Complete htmx:confirm when the async promise completes
 * 6. Read the global variable inside htmx:configRequest and add it to the outbound request params
 * See https://htmx.org/examples/async-auth/ for details on this pattern
 */

var locationPermission;
var currentLocation;
/* Since we add a handler to location permissions changing which will refresh the location toggle,
 * we don't want the handler to actually do anything while we're actively requesting locations.
 * Otherwise, permissions going from prompt to granted or denied would refresh the toggle.
 */
var locationRequestInFlight = false;

document.addEventListener("addLocationPermissionParam", addLocationPermissionParam);
function addLocationPermissionParam(customEvent) {
  console.log("addLocationPermissionParam");
  console.log(customEvent);
  customEvent.detail.sourceEvent.preventDefault();
  navigator.permissions.query({ name: "geolocation" }).then(function (result) { finishPermissionsQuery(customEvent.detail.sourceEvent, result) });
}

function finishPermissionsQuery(htmxEvent, result) {
  locationPermission = result.state;
  htmx.on(htmxEvent.target, "htmx:configRequest", (e) => {
    if (e.detail.triggeringEvent && e.detail.triggeringEvent.type === "locationPermissionsChange" && locationPermission != "denied") {
      e.detail.parameters["locationEnable"] = "on";
    }
    e.detail.parameters["locationPermission"] = locationPermission;
  })
  result.onchange = function () {
    if (!locationRequestInFlight) {
      document.body.dispatchEvent(new Event('locationPermissionsChange'));
    }
  }
  htmxEvent.detail.issueRequest();
}

document.addEventListener("addLocationParams", addLocationParams);
function addLocationParams(customEvent) {
  console.log("addLocationParams");
  console.log(customEvent);
  // Optionally filter events by their target
  // Targets are checked against the original HTMX event
  if (!customEvent.detail.targetId || customEvent.detail.sourceEvent.target.id === customEvent.detail.targetId) {
    // Optionally enable or disable location sending with a checkbox ID
    if (!customEvent.detail.toggleId || htmx.find(`#${customEvent.detail.toggleId}`).checked) {
      customEvent.detail.sourceEvent.preventDefault();
      locationRequestInFlight = true;
      navigator.geolocation.getCurrentPosition(
        function (position) {locationSuccess(customEvent.detail.sourceEvent, position);},
        function (err) {locationError(customEvent.detail.sourceEvent, err);}
      );
    }
  }
}

function locationError(htmxEvent, err) {
  console.log(err);
  locationRequestInFlight = false;
  htmxEvent.detail.issueRequest();
}

function locationSuccess(htmxEvent, position) {
  currentLocation = position;
  locationRequestInFlight = false;
  htmx.on(htmxEvent.target, "htmx:configRequest", (e)=> {
    e.detail.parameters["latitude"] = position.coords.latitude;
    e.detail.parameters["longitude"] = position.coords.longitude;
    e.detail.parameters["accuracy"] = position.coords.accuracy;
    e.detail.parameters["timestamp"] = position.timestamp;
  })
  htmxEvent.detail.issueRequest();
}