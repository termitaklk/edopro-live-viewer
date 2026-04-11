# MSG_PAY_LPCOST (0x64)

## Description
Ocurre cuando un jugador paga Puntos de Vida (LP) para costear la activación de un efecto o una carta (ej: Pagar la mitad de puntos para Solemn Judgment).

## Payload / Buffer Structure
- `uint8_t` player (Jugador que va a pagar)
- `uint32_t` cost (Cantidad a descontar / pagar)

## Notes
Se diferencia típicamente de `MSG_LPUPDATE` o `MSG_DAMAGE` en que debe mostrar un log "(Jugador) pagó X LP" y no invocar animaciones de "daño" necesariamente (o cambiar el color de la pérdida de escudo de sangre por texto azul/rojo según el layout clásico de OCG).
