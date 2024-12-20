document.addEventListener("modalRender", renderModal);

function renderModal(event) {
  if (event.detail.modalId === "message-submit" && event.detail.sourceEvent.target.id === "message-submit") {
    turnstile.render(
      "#turnstile-message",
      {
        sitekey: htmx.find("#turnstile-site-key").value,
        theme: "dark",
        callback: messageTurnstileCallback,
        "expired-callback": messageTurnstileExpiredCallback
      }
    );
    htmx.find("#message-submit").showModal();
    htmx.find("#message-submit").focus();
  } else if (event.detail.modalId === "sighting-submit" && event.detail.sourceEvent.target.id === "sighting-submit") {
    turnstile.render(
      "#turnstile-sighting",
      {
        sitekey: htmx.find("#turnstile-site-key").value,
        theme: "dark",
        callback: sightingUpdateSubmit,
        "expired-callback": sightingUpdateSubmit
      }
    );
    const fileInput = document.getElementById("sighting-file-input");
    fileInput.addEventListener("change", sightingFileChange);
    htmx.find("#sighting-submit").showModal();
    htmx.find("#sighting-submit").focus();

    htmx.on("#form", "htmx:xhr:progress", function (evt) {
      //Clicking submit also fires off a GET request to Cloudflare Turnstile
      //Prevent any actions on the progress of that request by checking if it's lengthComputable
      if (evt.detail.lengthComputable) {
        htmx.find("#progress-upload").setAttribute("value", evt.detail.loaded / evt.detail.total * 100);
        if (evt.detail.loaded == evt.detail.total) {
          htmx.remove(htmx.find("#progress-upload"));
          var waitSpan = document.createElement("span");
          waitSpan.classList.add("loading","loading-dots","loading-lg","shrink");
          htmx.find("#submit-progress").appendChild(waitSpan);
          htmx.off("#form", "htmx:xhr:progress", this);
        }
      }
    });
    htmx.on("#form", "htmx:confirm", function (evt) {
      htmx.find("#sighting-send-button").setAttribute("disabled", true);
    });
  } else {
    htmx.find(`#${event.detail.modalId}`).showModal();
    htmx.find(`#${event.detail.modalId}`).focus();
  }
}

function messageTurnstileCallback(token) {
  var button = document.getElementById("message-send-button");
  button.disabled = false;
  button.innerHTML = "Send!";
}

function messageTurnstileExpiredCallback() {
  var button = document.getElementById("message-send-button");
  button.disabled = true;
  button.innerHTML = "Please verify you're not a bot";
}

function sightingFileChange() {
  const fileInput = document.getElementById("sighting-file-input");
  const preview = document.createElement("img");
  preview.src = URL.createObjectURL(fileInput.files[0]);
  preview.classList.add("object-contain", "w-[304px]", "h-56");
  htmx.find("#image-preview").replaceChildren(preview);
  sightingUpdateSubmit();
}

function sightingUpdateSubmit() {
  const button = document.getElementById("sighting-send-button");
  const fileInput = document.getElementById("sighting-file-input");
  const turnstileResponse = document.querySelector("input[name='cf-turnstile-response']");
  if (fileInput.files.length === 0) {
    button.disabled = true;
    button.innerHTML = "Choose a photo first";
  } else if (!turnstileResponse.value) {
    button.disabled = true;
    button.innerHTML = "Please verify you're not a bot";
  } else {
    button.disabled = false;
    button.innerHTML = "Send!";
  }
}