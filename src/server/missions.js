import { progressSkill } from './tutorial.js';
export const MISSION_DEFS = Object.freeze({
  academy: { title: 'Academy Contract', objective: 'Learn serve, spin, dash, blocks, mission play, upgrades, and team shape.', targets: { serves: 1, saves: 6, blocks: 8 }, rewardScore: 180, rewardShield: 2 },
  firstRun: { title: 'Training Contract', objective: 'Return 8 shots and break 12 blocks.', targets: { saves: 8, blocks: 12 }, rewardScore: 180, rewardShield: 1 },
  quickRaid: { title: 'Raid Contract', objective: 'Break 24 blocks before the run collapses.', targets: { blocks: 24 }, rewardScore: 260, rewardShield: 1 },
  mirrorDuel: { title: 'Mirror Contract', objective: 'Build a 10-combo rally in mirrored play.', targets: { combo: 10 }, rewardScore: 320, rewardShield: 0 },
  chaosLab: { title: 'Chaos Contract', objective: 'Trigger 18 hits and survive 3 misses.', targets: { shots: 18, missesMax: 3 }, rewardScore: 420, rewardShield: 2 },
  riftSprint: { title: 'Sprint Contract', objective: 'Clear 18 blocks and launch through rift pressure.', targets: { blocks: 18, shots: 6 }, rewardScore: 500, rewardShield: 1 },
  bossRush: { title: 'Boss Contract', objective: 'Crack 2 elite cores and clear 1 level.', targets: { cores: 2, clears: 1 }, rewardScore: 650, rewardShield: 2 },
  custom: { title: 'Open Contract', objective: 'Return 10 shots and break 20 blocks.', targets: { saves: 10, blocks: 20 }, rewardScore: 240, rewardShield: 1 }
});

export function createMission(preset = 'custom') {
  const def = MISSION_DEFS[preset] || MISSION_DEFS.custom;
  return { title: def.title, objective: def.objective, targets: { ...def.targets }, progress: {}, rewardScore: def.rewardScore, rewardShield: def.rewardShield, complete: false };
}

export function missionSummary(mission) {
  if (!mission) return '';
  const label = key => ({ serves: 'serves', saves: 'saves', shots: 'shots', blocks: 'blocks', combo: 'combo', misses: 'misses', cores: 'cores', clears: 'clears' })[key] || key;
  return Object.entries(mission.targets).map(([key, target]) => {
    if (key.endsWith('Max')) return `${label(key.replace('Max',''))} <= ${target}`;
    return `${label(key)} ${Math.min(mission.progress[key] || 0, target)}/${target}`;
  }).join(' · ');
}

export function progressMission(room, key, amount = 1) {
  const mission = room.mission;
  if (!mission || mission.complete) return false;
  if (key === 'combo') mission.progress.combo = Math.max(mission.progress.combo || 0, amount);
  else mission.progress[key] = (mission.progress[key] || 0) + amount;
  const ok = Object.entries(mission.targets).every(([targetKey, target]) => {
    if (targetKey.endsWith('Max')) return (mission.progress[targetKey.replace('Max','')] || 0) <= target;
    return (mission.progress[targetKey] || 0) >= target;
  });
  if (ok) {
    mission.complete = true;
    room.score += mission.rewardScore;
    room.shields += mission.rewardShield + (room.mods?.missionPay || 0);
    room.runStats.missionCompletions = (room.runStats.missionCompletions || 0) + 1;
    progressSkill(room, 'missionCompletions');
    room.lastEvent = `Mission complete: ${mission.title}.`;
    room.serverMessage = `Mission complete: ${mission.title}. Reward applied.`;
    return true;
  }
  return false;
}
