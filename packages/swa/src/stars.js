document.addEventListener("starToggle", toggleStarColor)

function toggleStarColor(event) {
  const stars = document.getElementsByClassName("mask-star");
  if (event.target.checked) {
    for (const star of stars) {
      star.classList.add("bg-blue-700");
      star.classList.remove("bg-yellow-300");
    }
  } else {
    for (const star of stars) {
      star.classList.add("bg-yellow-300");
      star.classList.remove("bg-blue-700");
    }
  }
}