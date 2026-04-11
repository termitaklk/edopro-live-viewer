# MSG_SUMMONING (0x3c)

## Description
Inicia la ventana/animación de comprobación para una **Invocación Normal (Normal Summon)** o **Normal Set**. Permite al frontend animar a la carta bajando al campo, incluso si luego alguien decide negarla usando "Solemn Judgment".

## Payload / Buffer Structure
- `uint32_t` code (ID o código base de la carta)
- `loc_info` info (estructura de `controler`, `location`, `sequence`, `position`)

## Notes
Suele ir seguido de `MSG_SUMMONED` temporalmente después de dar a los jugadores oportunidad de responder a la "ventana de invocación".
