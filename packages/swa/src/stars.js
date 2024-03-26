function toggleStarColor(event) {
  var stars = document.getElementsByClassName("mask-star");
  if (event.target.checked) {
    for (star of stars) {
      star.classList.add("bg-blue-700");
      star.classList.remove("bg-yellow-300");
    }
  } else {
    for (star of stars) {
      star.classList.add("bg-yellow-300");
      star.classList.remove("bg-blue-700");
    }
  }
}