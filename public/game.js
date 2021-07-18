const cards = document.querySelectorAll(".card");
const placeholders = document.querySelectorAll(".place");

placeholders.forEach((place) => {
  place.addEventListener("dragover", dragover);
  place.addEventListener("dragenter", dragenter);
  place.addEventListener("dragleave", dragleave);
  place.addEventListener("drop", dragdrop);
});

let pickedCard;
cards.forEach((card) => {
  card.addEventListener("dragstart", (e) => {
    setTimeout(() => e.target.classList.add("hide-card", "hold-card"), 0);
    pickCard = card;
  });
  card.addEventListener("dragend", dragend);
});

function dragend(e) {
  e.target.classList.remove("hold-card", "hide-card");
}

function dragover(e) {
  e.preventDefault();
}

function dragenter(e) {
  e.target.classList.add("hovered");
}

function dragleave(e) {
  e.target.classList.remove("hovered");
}

function dragdrop(e) {
  console.log(e.target);
  e.target.children[0].remove();
  e.target.style.padding = "0";
  e.target.append(pickCard);
  pickCard.style.margin = "0";
}
