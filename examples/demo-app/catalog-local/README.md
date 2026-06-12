# Prueba local de carga desde catálogo

Este directorio simula el catálogo de MapsAnalytics sin depender de S3.

## Ejecutar

Terminal 1:

```bash
cd examples/demo-app
yarn start:local
```

Terminal 2:

```bash
cd examples/demo-app
yarn catalog:mock
```

Abrir:

```text
http://localhost:9090
```

El mock carga `http://localhost:8080` en un iframe, espera el mensaje `FRAME` y envía:

```js
{
  type: 'dynamicURL',
  url: 'http://localhost:9090/maps/kepler2.gl.json',
  uId: 'local-catalog-kepler2'
}
```

## Resultado esperado

- MapsAnalytics muestra `Cargando mapa del catálogo`.
- La barra de progreso avanza.
- El mapa local se renderiza en Kepler.
- Si `processKeplerglJSON` no puede procesarlo, se intenta cargar con `loadFiles`.
