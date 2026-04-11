# MSG_BECOME_TARGET (0x53)

## Description
Ocurre cuando una o varias cartas en el campo/cementerio/etc. son seleccionadas como "Objetivo" o "Target" ("Target 1 card..."). Sirve para animar unas miras o líneas cruzadas que indicarán al usuario qué cartas están a punto de ser afectadas.

## Payload / Buffer Structure
- `uint8_t` count (Número de cartas objetivo)
- Loop de `count` repeticiones:
  - `loc_info` info (Controler, Location, Sequence, Position u opciones similares de 4 bytes) de cada carta.

## Notes
Al lanzar cadenas `MSG_CHAINING`, casi a continuación viene un `MSG_BECOME_TARGET` si el efecto requiere objetivos obligatorios desde activación. Muestra visuales y líneas dibujadas.
