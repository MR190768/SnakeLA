# 🐍 Battlesnake Bot (TypeScript + Fastify)

Un bot competitivo para [Battlesnake](https://docs.battlesnake.com/) desarrollado con TypeScript y Fastify, optimizado para mínima latencia, consumo reducido de memoria y preparado para despliegues continuos en [Railway](https://railway.app/).

---

## ⚡ Características Principales

- **Runtime de Alto Rendimiento**: Desarrollado sobre **Fastify** en lugar de Express, reduciendo significativamente la sobrecarga del ciclo de vida HTTP y la serialización JSON.
- **Tipado Estricto**: Modelado completo de las especificaciones oficiales de la API v1 de Battlesnake (`GameState`, `Battlesnake`, `Coord`, etc.) con TypeScript en modo `strict`.
- **Pipeline de Decisión Multinivel (< 350 ms)**:
  1. **Filtro de Colisiones Inmediatas**: Evita giros de 180° hacia el cuello, paredes del tablero y colisiones contra cuerpos propios o ajenos.
  2. **Detección Head-to-Head**: Detecta amenazas frontales con serpientes rivales. Si el oponente es de igual o mayor tamaño, penaliza o bloquea esas casillas; si somos más largos, aprovecha la oportunidad de eliminarlo.
  3. **Control de Espacio (Flood Fill)**: Evalúa el volumen de casillas conectadas disponibles por cada dirección para evitar entrar en bolsas cerradas o callejones sin salida menores al tamaño de la serpiente.
  4. **Heurística de Supervivencia y Comida (BFS)**:
     - **Salud < 35**: Traza la ruta más corta hacia la comida más cercana mediante búsqueda en anchura (BFS).
     - **Salud ≥ 35**: Mantiene el control espacial hacia el centro del tablero y busca áreas abiertas.
  5. **Guard Timeout**: Monitorea el tiempo de ejecución en milisegundos para garantizar una respuesta válida antes de agotar el límite de la API.
- **Docker Multi-Stage**: Imagen ligera basada en `node:20-alpine` lista para producción.

---

## 📁 Estructura del Proyecto

```text
├── src/
│   ├── types/
│   │   └── index.ts        # Tipos e interfaces de la API de Battlesnake
│   ├── logic/
│   │   ├── rules.ts        # Detección de colisiones y límites
│   │   ├── floodFill.ts    # Medición de espacio disponible por casilla
│   │   ├── pathfinding.ts  # Búsqueda de rutas (BFS) a comida
│   │   └── brain.ts        # Pipeline central de decisión y timeout guard
│   ├── routes.ts           # Endpoints HTTP (/, /start, /move, /end)
│   └── index.ts            # Servidor Fastify y arranque
├── Dockerfile              # Construcción multi-stage para Railway
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Inicio Rápido (Local)

### Requisitos
- [Node.js](https://nodejs.org/) v20+ LTS
- `npm`

### 1. Instalación de dependencias
```bash
npm install
```

### 2. Modo Desarrollo
Inicia el servidor con recarga automática mediante `ts-node`:
```bash
npm run dev
```

El servidor estará escuchando en `http://localhost:8080`.

### 3. Compilación y Ejecución en Producción
```bash
npm run build
npm start
```

---

## 🌐 Endpoints de la API

| Método | Ruta     | Descripción |
|--------|----------|-------------|
| `GET`  | `/`      | Retorna metadatos de personalización (color, cabeza, cola). |
| `POST` | `/start` | Notificación de inicio de partida. Responde HTTP 200. |
| `POST` | `/move`  | Computa y responde con el siguiente movimiento (`up`, `down`, `left`, `right`). |
| `POST` | `/end`   | Notificación de fin de partida. Responde HTTP 200. |

---


