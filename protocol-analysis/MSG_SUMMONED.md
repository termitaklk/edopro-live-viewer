# MSG_SUMMONED (0x3d)

## Description
Indica al cliente que la ventana de invocación iniciada por `MSG_SUMMONING` concluyó exitosamente sin intervención/negación o de que se resolvió y la carta está oficialmente en el campo de manera estable. 

## Payload / Buffer Structure
- Ninguno (Normalmente va vacío y sólo sirve como "banderazo" del final).

## Notes
Suele usarse para gatillar y limpiar animaciones temporales y comprobar efectos de Trigger como "Cuando esta carta es invocada de manera Normal...".
