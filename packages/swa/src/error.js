htmx.on("htmx:responseError", function(evt){ console.log(evt);displayError(evt.detail.error); });
htmx.on("htmx:sendError", function(evt){ console.log(evt);displayError("Error talking to vv.cr"); });
function displayError(err) {
  var errDiv = document.createElement("div");
  errDiv.classList.add("alert");
  errDiv.classList.add("alert-error");
  errDiv.innerHTML = `<img class="shrink-0 h-6 w-6" src="/images/error.svg" alt="Error icon"><span class="text-sm">${err}</span><button class="btn btn-sm bg-error-content" onclick="this.parentNode.outerHTML='';">Close</button>`;
  htmx.find("#error-toast").appendChild(errDiv);
}