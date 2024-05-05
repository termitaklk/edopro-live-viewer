let isOriginalState = true;

function toggleFunction() {
  console.log("Estado actual:", isOriginalState ? "Original" : "Cover A");
  if (isOriginalState) {
    replacePieceAtA1();
  } else {
    replacePieceWithCoverA();
  }
  // Cambiar el estado para la próxima vez que se presione el botón
  isOriginalState = !isOriginalState;
}

function replacePieceAtA1() {
  const cellA1 = document.getElementById('a1');
  const coverA = document.getElementById('coverA');

  // Conseguir la URL de imagen de fondo de coverA
  const backgroundImage = window.getComputedStyle(coverA).backgroundImage;
  // Conseguir dimensiones y posición de la celda A1
  const rect = cellA1.getBoundingClientRect();

  // Aplicar la URL de imagen de fondo obtenida a A1
  cellA1.style.backgroundImage = backgroundImage;
  cellA1.style.backgroundSize = `${rect.width}px ${rect.height}px`;
  cellA1.style.backgroundRepeat = 'no-repeat';
  cellA1.style.backgroundPosition = 'center';
  //console.log("Función replacePieceAtA1 ejecutada");
}

function replacePieceWithCoverA() {
  const cellA1 = document.getElementById('a1');
  const coverA = document.getElementById('coverA');

  // Eliminar cualquier estilo de fondo aplicado anteriormente
  cellA1.style.backgroundImage = 'none';
  //console.log("Función replacePieceWithCoverA ejecutada, fondo eliminado");
  
  // Conseguir la URL de imagen de fondo de coverA
  const backgroundImage = window.getComputedStyle(coverA).backgroundImage;
  
  // Obtener el ancho y alto de la celda A1
  const cellA1Width = cellA1.clientWidth;
  const cellA1Height = cellA1.clientHeight;
  
  // Aplicar la URL de imagen de fondo obtenida a A1
  cellA1.style.backgroundImage = backgroundImage;
  // Establecer el tamaño de fondo de la imagen al mismo que el de la celda A1
  cellA1.style.backgroundSize = `${cellA1Width}px ${cellA1Height}px`;
  // Asegurarse de que la imagen cubra completamente la celda sin repetirse
  cellA1.style.backgroundRepeat = "no-repeat";
}

document.getElementById('createPieceButton').addEventListener('click', toggleFunction);

// Añadir esto en tu archivo JavaScript existente
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', function() {
    // Acción al hacer clic en una carta, como voltearla
    this.classList.toggle('flipped');
  });
});






  