# MSG_WIN (0x5)

## Description
Marca el final del duelo y comunica explícitamente quién ha ganado y por qué motivo.

## Payload / Buffer Structure
- `uint8_t` player (0, 1 o en su defecto 2 si es Draw/Empate)
- `uint8_t` type (Código del motivo de victoria: Por LP, Exodia, Destino Final, Deck Out, Renderse, etc. Referencia al `strings.conf` en offsets `0x10`, etc.)

## Notes
El core envía este flag cerrando las colas. Muestra una pantalla sobrepuesta de FINAL.
