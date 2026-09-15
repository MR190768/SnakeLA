export interface Coord {
  x: number;
  y: number;
}

export interface Battlesnake {
  id: string;
  name: string;
  health: number;
  body: Coord[];
  latency: string;
  head: Coord;
  length: number;
  shout: string;
  squad: string;
  customizations: {
    color: string;
    head: string;
    tail: string;
  };
}

export interface Board {
  height: number;
  width: number;
  food: Coord[];
  hazards: Coord[];
  snakes: Battlesnake[];
}

export interface Game {
  id: string;
  ruleset: {
    name: string;
    version: string;
    settings: any;
  };
  map: string;
  source: string;
  timeout: number;
}

export interface GameState {
  game: Game;
  turn: number;
  board: Board;
  you: Battlesnake;
}

export interface MoveResponse {
  move: 'up' | 'down' | 'left' | 'right';
  shout?: string;
}

export interface InfoResponse {
  apiversion: string;
  author?: string;
  color?: string;
  head?: string;
  tail?: string;
  version?: string;
}
