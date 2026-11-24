import { MONSTERS } from '../data/loreData';
import { FloorId, MonsterInstance, RiftType, TileType } from '../types/game';

const GRID_W = 15;
const GRID_H = 11;

let mapUidCounter = 1;
function nextMonUid(): string {
  mapUidCounter += 1;
  return `m_${Date.now()}_${mapUidCounter}`;
}

export function spawnMonsterInstance(templateId: string, x: number, y: number): MonsterInstance {
  const t = MONSTERS[templateId];
  return {
    uid: nextMonUid(),
    templateId: t.id,
    name: t.name,
    rank: t.rank,
    hp: t.maxHp,
    maxHp: t.maxHp,
    attack: t.attack,
    defense: t.defense,
    flexibility: t.flexibility,
    x,
    y,
    isBoss: t.isBoss,
    symbol: t.symbol,
  };
}

function isWalkable(tile: TileType): boolean {
  return tile !== 'wall' && tile !== 'crystal';
}

function areAllTargetsReachable(
  grid: TileType[][],
  startX: number,
  startY: number,
  targets: [number, number][]
): boolean {
  const visited = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(false));
  const queue: [number, number][] = [[startX, startY]];
  visited[startY][startX] = true;

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    const dirs: [number, number][] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
      if (visited[ny][nx]) continue;
      if (!isWalkable(grid[ny][nx])) continue;
      visited[ny][nx] = true;
      queue.push([nx, ny]);
    }
  }

  return targets.every(([tx, ty]) => visited[ty]?.[tx]);
}

function carveCorridor(grid: TileType[][], x0: number, y0: number, x1: number, y1: number) {
  let x = x0;
  let y = y0;
  while (x !== x1) {
    grid[y][x] = 'floor';
    x += x < x1 ? 1 : -1;
  }
  while (y !== y1) {
    grid[y][x] = 'floor';
    y += y < y1 ? 1 : -1;
  }
  grid[y1][x1] = 'floor';
}

function carveClearing(grid: TileType[][], cx: number, cy: number) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx > 0 && nx < GRID_W - 1 && ny > 0 && ny < GRID_H - 1) {
        grid[ny][nx] = 'floor';
      }
    }
  }
}

export function getRiftTypeForFloor(floor: FloorId): RiftType | null {
  if (floor === 1) return 'vampire_rift';
  if (floor === 2) return 'glacial_cave';
  if (floor === 3) return 'witch_forest';
  return null;
}

export function generateProceduralFloor(
  floor: FloorId,
  riftType: RiftType | null
): {
  grid: TileType[][];
  monsters: MonsterInstance[];
  spawnX: number;
  spawnY: number;
  hasRiftPortal: boolean;
} {
  const spawnX = 1;
  const spawnY = 2 + Math.floor(Math.random() * 7);
  const bossX = 13;
  const bossY = 2 + Math.floor(Math.random() * 7);
  const portalDownX = 12;
  const portalDownY = bossY <= 5 ? 8 : 2;
  const shouldSpawnRift =
    !riftType && Boolean(getRiftTypeForFloor(floor)) && Math.random() < 0.35;
  const riftX = 10;
  const riftY = bossY <= 5 ? 2 : 8;

  let grid: TileType[][] = [];
  for (let attempt = 0; attempt < 12; attempt++) {
    grid = Array.from({ length: GRID_H }, (_, y) =>
      Array.from({ length: GRID_W }, (_, x) => {
        if (x === 0 || x === GRID_W - 1 || y === 0 || y === GRID_H - 1) return 'wall';
        return Math.random() < 0.22 ? 'crystal' : 'floor';
      })
    );

    for (let r = 0; r < 4; r++) {
      const rx = 2 + Math.floor(Math.random() * 10);
      const ry = 1 + Math.floor(Math.random() * 7);
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          if (ry + dy < GRID_H - 1 && rx + dx < GRID_W - 1) {
            grid[ry + dy][rx + dx] = 'floor';
          }
        }
      }
    }

    carveClearing(grid, spawnX, spawnY);
    carveClearing(grid, bossX, bossY);
    carveCorridor(grid, spawnX, spawnY, bossX, bossY);

    const requiredTargets: [number, number][] = [[bossX, bossY]];
    if (!riftType && floor < 7) {
      carveClearing(grid, portalDownX, portalDownY);
      carveCorridor(grid, spawnX, spawnY, portalDownX, portalDownY);
      requiredTargets.push([portalDownX, portalDownY]);
    }
    if (shouldSpawnRift) {
      carveClearing(grid, riftX, riftY);
      carveCorridor(grid, spawnX, spawnY, riftX, riftY);
      requiredTargets.push([riftX, riftY]);
    }

    if (areAllTargetsReachable(grid, spawnX, spawnY, requiredTargets)) {
      break;
    }
  }

  grid[spawnY][spawnX] = 'exit';
  grid[bossY][bossX] = 'boss_altar';

  if (!riftType && floor < 7) {
    grid[portalDownY][portalDownX] = 'portal_down';
  }
  if (shouldSpawnRift) {
    grid[riftY][riftX] = 'rift_portal';
  }

  const freeTiles: [number, number][] = [];
  for (let y = 1; y < GRID_H - 1; y++) {
    for (let x = 3; x < GRID_W - 1; x++) {
      if (grid[y][x] === 'floor' && Math.abs(x - spawnX) + Math.abs(y - spawnY) >= 3) {
        freeTiles.push([x, y]);
      }
    }
  }
  for (let i = freeTiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [freeTiles[i], freeTiles[j]] = [freeTiles[j], freeTiles[i]];
  }

  const takeTile = (): [number, number] => freeTiles.pop() ?? [7, 5];
  const monsters: MonsterInstance[] = [];

  if (riftType === 'vampire_rift') {
    const [x1, y1] = takeTile();
    const [x2, y2] = takeTile();
    const [x3, y3] = takeTile();
    monsters.push(
      spawnMonsterInstance('mimic', x1, y1),
      spawnMonsterInstance('stone_golem', x2, y2),
      spawnMonsterInstance('corpse_golem', x3, y3),
      spawnMonsterInstance('vampire_guardian', bossX, bossY)
    );
    return { grid, monsters, spawnX, spawnY, hasRiftPortal: false };
  }

  if (riftType === 'glacial_cave') {
    const [x1, y1] = takeTile();
    const [x2, y2] = takeTile();
    const [x3, y3] = takeTile();
    const [x4, y4] = takeTile();
    monsters.push(
      spawnMonsterInstance('frost_wolf', x1, y1),
      spawnMonsterInstance('frost_wolf', x2, y2),
      spawnMonsterInstance('yeti', x3, y3),
      spawnMonsterInstance('yeti', x4, y4),
      spawnMonsterInstance('lycanthrope_guardian', bossX, bossY)
    );
    return { grid, monsters, spawnX, spawnY, hasRiftPortal: false };
  }

  if (riftType === 'witch_forest') {
    const [x1, y1] = takeTile();
    const [x2, y2] = takeTile();
    const [x3, y3] = takeTile();
    const [x4, y4] = takeTile();
    monsters.push(
      spawnMonsterInstance('witch_lantern', x1, y1),
      spawnMonsterInstance('witch_lantern', x2, y2),
      spawnMonsterInstance('half_troll', x3, y3),
      spawnMonsterInstance('half_troll', x4, y4),
      spawnMonsterInstance('cannibalo', bossX, bossY)
    );
    return { grid, monsters, spawnX, spawnY, hasRiftPortal: false };
  }

  const rosters: Record<FloorId, { mobs: string[]; boss: string }> = {
    1: {
      mobs: ['gnome', 'cave_bat', 'goblin_swordsman', 'goblin_archer', 'gnome', 'corpse_golem'],
      boss: 'dreadfear',
    },
    2: {
      mobs: ['goblin_swordsman', 'goblin_archer', 'goblin_archer', 'blade_wolf', 'blade_wolf', 'krungbee'],
      boss: 'alpha_blade_wolf',
    },
    3: {
      mobs: ['bone_knight', 'orc_warrior', 'orc_shaman', 'orc_shaman', 'stone_golem'],
      boss: 'orc_hero',
    },
    4: {
      mobs: ['doppel_clone', 'doppel_clone', 'death_knight', 'doppel_clone', 'death_knight'],
      boss: 'doppelganger_boss',
    },
    5: {
      mobs: ['soul_eater', 'drake', 'troll', 'soul_eater', 'drake'],
      boss: 'flameless_spirit',
    },
    6: {
      mobs: ['lanemut_warrior', 'lanemut_shaman', 'lanemut_shaman', 'deep_sea_giant', 'lanemut_warrior'],
      boss: 'grabnich',
    },
    7: {
      mobs: ['metcrow', 'vampire_lord', 'manticore', 'ogre'],
      boss: 'dikol_king',
    },
  };

  const spec = rosters[floor];
  for (const mobId of spec.mobs) {
    const [mx, my] = takeTile();
    monsters.push(spawnMonsterInstance(mobId, mx, my));
  }
  monsters.push(spawnMonsterInstance(spec.boss, bossX, bossY));

  return { grid, monsters, spawnX, spawnY, hasRiftPortal: shouldSpawnRift };
}
