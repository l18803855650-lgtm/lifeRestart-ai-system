import { beforeEach, describe, expect, test } from 'vitest';

class LocalStorageMock {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

global.localStorage = new LocalStorageMock();

const { gameEngine, getDeathReasonText } = await import('../public/js/game-engine.js');
const { PRESET_SYSTEMS } = await import('../public/js/system-manager.js');

describe('game engine custom stats integration', () => {
  beforeEach(() => {
    global.localStorage.clear();
    gameEngine.reset();
  });

  test('tracks custom stats, persists them into state, and exposes normalized death text', async () => {
    const system = PRESET_SYSTEMS.find((item) => item.id === 'cultivation');
    gameEngine.setSystem(system);
    gameEngine.drawTalents(10);
    gameEngine.selectTalents(gameEngine.getDrawnTalents().slice(0, 3).map((talent) => talent.id));
    ['CHR', 'INT', 'STR', 'MNY', 'SPR'].forEach((key) => {
      for (let i = 0; i < 4; i += 1) {
        gameEngine.allocateProperty(key, 1);
      }
    });
    gameEngine.confirmAllocation();
    gameEngine.startLife();

    const applied = gameEngine.applyExternalEffects({ spirit_power: 35, lifespan: 20, INT: 2 }, { source: '测试' });
    const state = gameEngine.getState();
    const customStats = state.customStats;

    expect(applied.spirit_power).toBe(35);
    expect(customStats.find((stat) => stat.id === 'spirit_power')?.current).toBe(35);
    expect(customStats.find((stat) => stat.id === 'lifespan')?.current).toBe(100);
    expect(getDeathReasonText('madness')).toContain('理智');

    const summary = await gameEngine.generateSummary();
    expect(summary.biography).toContain('系统成长');
    expect(summary.lifeData.system?.name).toBe(system.name);
  });
});
