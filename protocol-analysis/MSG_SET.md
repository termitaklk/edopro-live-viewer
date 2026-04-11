# MSG_SET (0x36)

## Description
Indica que un jugador ubicó una carta boca abajo (como Setear una magia/trampa, o colcoar boca abajo pero con un efecto diferente al Normal Set que usa SUMMONING). A menudo se usa explícitamente para magias y trampas.

## Payload / Buffer Structure
- `uint32_t` code (el ID de la carta)
- `loc_info` info (estructura `controler`, `location`, `sequence`, `position`)

## Notes
Añade animación de colocar carta en los S/T Zones desde la perspectiva del cliente, o en la MZone en Face-Down Defense.
