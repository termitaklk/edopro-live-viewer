document.getElementById('playCardButton').addEventListener('click', playCardMT);

function playCardMT() {
    const player1Hand = document.getElementById('player1Row1');
    if (player1Hand.children.length === 0) {
        alert("No hay más cartas en la mano.");
        return;
    }
    const player1FirstCard = player1Hand.children[0]; // Obtener la primera carta de la mano del jugador 1

    // Obtener solo las celdas A1 a A5 si están disponibles
    const availableCells = Array.from(document.querySelectorAll('#a1, #a2, #a3, #a4, #a5')).filter(cell => !cell.hasChildNodes());

    if (availableCells.length === 0) {
        alert("No hay más espacio en el tablero");
        return;
    }

    // Obtener una celda aleatoria de las disponibles
    const randomIndex = Math.floor(Math.random() * availableCells.length);
    const boardCell = availableCells[randomIndex];

    console.log("Celda seleccionada:", boardCell.id); // Imprimir el id de la celda seleccionada

    // Ajustar el tamaño de la carta a la celda del tablero usando la conversión de REM a PX
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const cellWidth = parseFloat(getComputedStyle(boardCell).width);
    const cellHeight = parseFloat(getComputedStyle(boardCell).height);

    player1FirstCard.style.width = `${cellWidth}px`;
    player1FirstCard.style.height = `${cellHeight}px`;

    // Mover la carta a la celda seleccionada
    const boardCellRect = boardCell.getBoundingClientRect();
    const cardRect = player1FirstCard.getBoundingClientRect();

    player1FirstCard.style.transition = 'transform 0.5s ease-in-out';
    player1FirstCard.style.transform = `translate(${boardCellRect.left - cardRect.left}px, ${boardCellRect.top - cardRect.top}px)`;

    setTimeout(() => {
        // Añadir la carta a la celda
        boardCell.appendChild(player1FirstCard);
        // Restablecer la transformación para fijar la carta en su nueva posición
        player1FirstCard.style.position = 'absolute';
        player1FirstCard.style.transform = '';
        player1FirstCard.style.transition = '';
    }, 500);
}

document.getElementById('playCardMonstersButton').addEventListener('click', playCardMonsters);

function playCardMonsters() {
    const player1Hand = document.getElementById('player1Row1');
    if (player1Hand.children.length === 0) {
        alert("No hay más cartas en la mano.");
        return;
    }
    const player1FirstCard = player1Hand.children[0]; // Obtener la primera carta de la mano del jugador 1

    // Obtener solo las celdas B1 a B5 si están disponibles
    const availableCells = Array.from(document.querySelectorAll('#b1, #b2, #b3, #b4, #b5')).filter(cell => !cell.hasChildNodes());

    if (availableCells.length === 0) {
        alert("No hay más espacio en el tablero");
        return;
    }

    // Obtener una celda aleatoria de las disponibles
    const randomIndex = Math.floor(Math.random() * availableCells.length);
    const boardCell = availableCells[randomIndex];

    console.log("Celda seleccionada:", boardCell.id); // Imprimir el id de la celda seleccionada

    // Ajustar el tamaño de la carta a la celda del tablero usando la conversión de REM a PX
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const cellWidth = parseFloat(getComputedStyle(boardCell).width);
    const cellHeight = parseFloat(getComputedStyle(boardCell).height);

    player1FirstCard.style.width = `${cellWidth}px`;
    player1FirstCard.style.height = `${cellHeight}px`;

    // Mover la carta a la celda seleccionada
    const boardCellRect = boardCell.getBoundingClientRect();
    const cardRect = player1FirstCard.getBoundingClientRect();

    player1FirstCard.style.transition = 'transform 0.5s ease-in-out';
    player1FirstCard.style.transform = `translate(${boardCellRect.left - cardRect.left}px, ${boardCellRect.top - cardRect.top}px)`;

    setTimeout(() => {
        // Añadir la carta a la celda
        boardCell.appendChild(player1FirstCard);
        // Restablecer la transformación para fijar la carta en su nueva posición
        player1FirstCard.style.position = 'absolute';
        player1FirstCard.style.transform = '';
        player1FirstCard.style.transition = '';
    }, 500);
}

document.getElementById('playCardMonstersHorizontalButton').addEventListener('click', playCardMonstersHorizontal);

function playCardMonstersHorizontal() {
    const player1Hand = document.getElementById('player1Row1');
    if (player1Hand.children.length === 0) {
        alert("No hay más cartas en la mano.");
        return;
    }
    const player1FirstCard = player1Hand.children[0]; // Obtener la primera carta de la mano del jugador 1

    // Obtener solo las celdas B1 a B5 si están disponibles
    const availableCells = Array.from(document.querySelectorAll('#b1, #b2, #b3, #b4, #b5')).filter(cell => !cell.hasChildNodes());

    if (availableCells.length === 0) {
        alert("No hay más espacio en el tablero");
        return;
    }

    // Obtener una celda aleatoria de las disponibles
    const randomIndex = Math.floor(Math.random() * availableCells.length);
    const boardCell = availableCells[randomIndex];

    // Obtener el ancho de la celda en píxeles y convertirlo a rem
    const cellWidthPx = parseFloat(getComputedStyle(boardCell).width);

    // Ajustar la altura y el ancho de la carta a los de la celda
    player1FirstCard.style.height = `${cellWidthPx}px`;  // Ajustar la altura anteriormente ajustada al ancho de la celda

    // Mover la carta a la celda seleccionada y girarla
    boardCell.appendChild(player1FirstCard);
    player1FirstCard.style.position = 'absolute';

    const cellRect = boardCell.getBoundingClientRect();
    const cardRect = player1FirstCard.getBoundingClientRect();

    // Calcular el desplazamiento para centrar la carta
    const leftOffset = (cellRect.width - cardRect.height) / 3; // Nota: cardRect.height se usa porque la carta está girada
    const topOffset = (cellRect.height - cardRect.width) / 3; // Nota: cardRect.width se usa por la misma razón

    // Esperar a que el DOM actualice tras la rotación
    setTimeout(() => {
        player1FirstCard.style.left = `${leftOffset}px`;
        player1FirstCard.style.top = `${topOffset}px`;
        player1FirstCard.style.transition = 'transform 0.5s ease-in-out';
        player1FirstCard.style.transform = 'rotate(90deg)';
    }, 10);
}
// Esta función asume que cada carta se añade a un div con la clase "card-holder-player1"
function addCardToPlayer1() {
  const player1Hand = document.getElementById('player1Row1');
  const cards = player1Hand.getElementsByClassName('card');
  const maxCards = 100; // Asumimos un máximo de 10 cartas en la mano

  if (cards.length < maxCards) {
      const newCard = document.createElement('div');
      newCard.className = 'card';
      newCard.style.backgroundImage = "url('./Carta/Carta1.png')"; // Usa la ruta correcta para la imagen de tu carta nueva
      player1Hand.appendChild(newCard);
      console.log(`Card added. Total cards: ${cards.length + 1}`);
  } else {
      console.log("Maximum number of cards reached.");
  }
}

// Esta función asume que cada carta se añade a un div con la clase "card-holder-player1"
function addCardToPlayer2() {
  const player1Hand = document.getElementById('player2Row1');
  const cards = player1Hand.getElementsByClassName('card');
  const maxCards = 100; // Asumimos un máximo de 10 cartas en la mano

  if (cards.length < maxCards) {
      const newCard = document.createElement('div');
      newCard.className = 'card';
      newCard.style.backgroundImage = "url('./Carta/Carta1.png')"; // Usa la ruta correcta para la imagen de tu carta nueva
      player1Hand.appendChild(newCard);
      console.log(`Card added. Total cards: ${cards.length + 1}`);
  } else {
      console.log("Maximum number of cards reached.");
  }
}

var maxLP = 8000; // Establecer el máximo de puntos de vida
var player1LP = 8000; // Establecer los puntos de vida iniciales del jugador 1


// Obtener el botón de incrementar LP y agregar un event listener
document.getElementById('increaseLPButton').addEventListener('click', function() {
  increaseLP(100); // Aumentar los LP en 100
});

// Obtener el botón de decrementar LP y agregar un event listener
document.getElementById('decreaseLPButton').addEventListener('click', function() {
  decreaseLP(100); // Disminuir los LP en 100
});

// Función para aumentar los LP y actualizar la barra de LP
function increaseLP(amount) {
  player1LP += amount; // Aumentar los LP por la cantidad especificada
  updateLPBar(); // Actualizar la barra de LP
}

// Función para disminuir los LP y actualizar la barra de LP
function decreaseLP(amount) {
  player1LP -= amount; // Disminuir los LP por la cantidad especificada
  if (player1LP < 0) {
      player1LP = 0; // Asegurar que los LP no sean negativos
  }
  updateLPBar(); // Actualizar la barra de LP
}

// Función para actualizar la barra de LP
function updateLPBar() {
  var lpBarFill = document.getElementById('player1LPFill');
  var lpPercentage = (player1LP / maxLP) * 100; // Calcular el porcentaje de LP restantes
  lpBarFill.style.width = lpPercentage + '%'; // Actualizar el ancho de la barra de LP
}


// Posicionar la mano del jugador 1
const player1Hand = document.getElementById('player1Row1');
player1Hand.style.position = 'absolute';
player1Hand.style.top = '-162px'; // Ajustar la posición vertical según sea necesario
player1Hand.style.left = '-125px'; // Ajustar la posición horizontal según sea necesario

// Posicionar la mano del jugador 2
const player2Hand = document.getElementById('player2Row1');
player2Hand.style.position = 'absolute';
player2Hand.style.bottom = '-253px'; // Ajustar la posición vertical según sea necesario
player2Hand.style.right = '-173px'; // Ajustar la posición horizontal según sea necesario







