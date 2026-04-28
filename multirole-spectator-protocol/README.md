# multirole-spectator-protocol

Librería TypeScript para decodificar paquetes TCP de un servidor Multirole en modo espectador.

## Instalación

Coloca esta carpeta dentro de tu proyecto:

```txt
visor/
└─ multirole-spectator-protocol/
```

Luego ejecuta desde `visor`:

```powershell
cd .\multirole-spectator-protocol
npm install
npm run build
cd ..
npm install .\multirole-spectator-protocol
```

## Uso

```ts
import { MultiroleSpectatorDecoder, SpectatorState } from "multirole-spectator-protocol";

const decoder = new MultiroleSpectatorDecoder();
const state = new SpectatorState();

socket.on("data", (chunk: Buffer) => {
  const events = decoder.push(chunk);

  for (const event of events) {
    state.apply(event);
    console.log(event);
  }

  console.log(state.snapshot());
});
```
