import { describe, expect, test } from 'vitest';

const { ShareSystem } = await import('../public/js/share-system.js');

const shareSystem = new ShareSystem();

describe('share system normalization', () => {
  test('calculates score for numeric talent grades instead of dropping them to zero', () => {
    const score = shareSystem.calculateScore({
      age: 42,
      properties: { CHR: 8, INT: 9, STR: 7, MNY: 6, SPR: 8 },
      talents: [
        { name: '先天道体', grade: 4 },
        { name: '倾国倾城', grade: 3 },
      ],
      milestones: ['筑基成功'],
      customStats: [{ name: '灵力', current: 320, max: 999 }],
    });

    expect(score).toBeGreaterThan(380);
  });

  test('generates share text from normalized system object and death reason text', () => {
    const text = shareSystem.generateShareText({
      age: 88,
      system: { name: '修仙逆袭系统', emoji: '⚔️' },
      deathReason: 'oldAge',
      properties: { CHR: 7, INT: 9, STR: 8, MNY: 6, SPR: 7 },
      talents: [{ name: '先天道体', grade: 4 }],
      customStats: [{ name: '灵力', icon: '🔮', current: 666, max: 999 }],
      score: 123,
      judge: { text: '传奇人生', emoji: '👑' },
      highlights: ['80岁：你在山巅得道，名震天下'],
    });

    expect(text).toContain('⚔️ 修仙逆袭系统');
    expect(text).toContain('寿终正寝');
    expect(text).toContain('🔮灵力666');
  });
});
