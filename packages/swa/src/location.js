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

function addLocationPermissionParam(event) {
  event.preventDefault();
  navigator.permissions.query({ name: "geolocation" }).then(function (result) { finishPermissionsQuery(event, result) });
}

function finishPermissionsQuery(event, result) {
  locationPermission = result.state;
  htmx.on(event.target, "htmx:configRequest", (e) => {
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
  event.detail.issueRequest();
}

function addLocationParams(event, targetId, toggleId) {
  // Optionally filter events by their target
  if (!targetId || event.target.id === targetId) {
    // Optionally enable or disable location sending with a checkbox ID
    if (!toggleId || htmx.find(`#${toggleId}`).checked) {
      event.preventDefault();
      locationRequestInFlight = true;
      navigator.geolocation.getCurrentPosition(
        function (position) {locationSuccess(event, position);},
        function (err) {locationError(event, err);}
      );
    }
  }
}

function locationError(event, err) {
  console.log(err);
  locationRequestInFlight = false;
  event.detail.issueRequest();
}

function locationSuccess(event, position) {
  currentLocation = position;
  locationRequestInFlight = false;
  htmx.on(event.target, "htmx:configRequest", (e)=> {
    e.detail.parameters["latitude"] = position.coords.latitude;
    e.detail.parameters["longitude"] = position.coords.longitude;
    e.detail.parameters["accuracy"] = position.coords.accuracy;
    e.detail.parameters["timestamp"] = position.timestamp;
  })
  event.detail.issueRequest();
}