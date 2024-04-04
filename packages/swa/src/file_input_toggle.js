document.addEventListener("toggleFileInput", toggleFileInput);

function toggleFileInput(event) {
    var input = document.getElementById("sighting-file-input");
    if (event.target.checked) {
      input.setAttribute("capture", "environment");
    } else {
      input.removeAttribute("capture");
    }
  }