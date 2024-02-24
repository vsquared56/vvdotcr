var locationPermission;

function addLocationPermissionParam(event) {
  event.preventDefault();
  navigator.permissions.query({ name: "geolocation" }).then(function (result) { finishPermissionsQuery(event, result) });
}

function finishPermissionsQuery(event, result) {
  locationPermission = result.state;
  htmx.on(event.target, "htmx:configRequest", (e)=> {
    e.detail.parameters["locationPermission"] = locationPermission;
  })
  
  event.detail.issueRequest();
  result.onchange = function () {
    console.log("Permissions changed!");
  }
}
