# MSG_PLAYER_HINT (0xa5)

## Description
Añade descripciones o avisos directamente en el avatar o panel del jugador, no a una carta específica. Útil para indicar restricciones generales del turno ("No puedes invocar especialmente", "Estás bajo los efectos de Maxx C", etc).

## Payload / Buffer Structure
- `uint8_t` player (jugador afectado por el hint)
- `uint8_t` chtype (generalmente `PHINT_DESC_ADD` o `PHINT_DESC_REMOVE`)
- `uint64_t` value (código de texto referenciando el `strings.conf` u otra constante)

## Behaviors
- `PHINT_DESC_ADD (6)`: Incrementa en el frontend un mensaje persistente para el jugador activo. Se mostrará una lista de restricciones activas al poner el ratón sobre su icono/campo.
- `PHINT_DESC_REMOVE (7)`: Disminuye o quita una restricción.
