# MSG_DAMAGE_STEP_START (0x71 / 113) / MSG_DAMAGE_STEP_END (0x72 / 114)

## Description
Marca de manera explícita la entrada y salida de la ventana del **Damage Step** durante la Battle Phase. Esta ventana es drásticamente diferente y restringida en reglas (sólo ciertas cartas que alteran ATK/DEF o contraefectos pueden activarse aquí).

## Payload / Buffer Structure
- Ninguno. Son puros opcodes "bandera".

## Notes
Ambos suelen ir emparejados.
En la interfaz de EDOPro clàsico, la barra del Phase Indicator tiene un pequeño LED o texto parpadeante que dice "Damage Step" mientras estamos entre medio de ambos mensajes, para advertir al usuario visualmente de las restricciones.
