# MSG_CARD_SELECTED (0x50 / 80)

## Description
Este mensaje es emitido por el servidor para notificar que un jugador ha completado la selección obligatoria de cartas (por ejemplo, eligiendo qué materiales usar de su cementerio, o qué carta desterrar). Aunque el `MSG_SELECT_CARD` original era privado para el jugador, el resultado a veces se emite como `MSG_CARD_SELECTED` públicamente para animar/iluminar temporalmente qué cartas exactas fueron elegidas por el oponente antes de que se muevan.

## Payload / Buffer Structure
- `uint8_t` player (Jugador que hizo la selección)
- `uint8_t` count (Número de cartas seleccionadas)
- Loop de `count` repeticiones:
  - `loc_info` info (Estructura de ubicación: controler, location, sequence, position) de la carta.

## Notes
A nivel de UI, se puede usar para parpadear o hacer un pequeño brillo ("highlight") sobre las cartas designadas justo antes de que se resuelva el eslabón de cadena que causó la selección.
