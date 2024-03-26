function renderMessageModal(event) {
  if (event.target.id==='message-submit') {
    turnstile.render(
      '#turnstile-message',
      {
        sitekey: htmx.find('#turnstile-site-key').value,
        theme: 'dark',
        callback: messageTurnstileCallback,
        'expired-callback': messageTurnstileExpiredCallback
      }
    );
    htmx.find('#message-submit').showModal();
    htmx.find('#message-submit').focus();
  }
}

function messageTurnstileCallback(token) {
  var button = document.getElementById('message-send-button');
  button.disabled = false;
  button.innerHTML = "Send!";
}

function messageTurnstileExpiredCallback() {
  var button = document.getElementById('message-send-button');
  button.disabled = true;
  button.innerHTML = "Please verify you're not a bot";
}

function renderSightingModal(event) {
  if (event.target.id==='sighting-submit') {
    turnstile.render(
      '#turnstile-sighting',
      {
        sitekey: htmx.find('#turnstile-site-key').value,
        theme: 'dark',
        callback: sightingUpdateSubmit,
        'expired-callback': sightingUpdateSubmit
      }
    );
    const fileInput = document.getElementById("sighting-file-input");
    fileInput.addEventListener("change", sightingFileChange);
    htmx.find('#sighting-submit').showModal();
    htmx.find('#sighting-submit').focus();
  }
}

function sightingFileChange() {
  const fileInput = document.getElementById("sighting-file-input");
  const preview = document.createElement("img");
  preview.src = URL.createObjectURL(fileInput.files[0]);
  preview.classList.add("object-contain", "w-[304px]", "h-56");
  htmx.find("#image-preview").replaceChildren(preview);
  updateSubmit();
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