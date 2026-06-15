export const SKILL_PATH = Object.freeze([
  {
    id: 'serve',
    title: '1 · Serve and Save',
    focus: 'Get the ball moving and return it safely.',
    goal: 'Serve once, then return 3 shots.',
    unlock: 'Basic rally control',
    targets: { serves: 1, saves: 3 },
    tip: 'Click or press Space to serve. Move with the mouse or W/S.'
  },
  {
    id: 'spin',
    title: '2 · Add Spin',
    focus: 'Curve the ball instead of only blocking it.',
    goal: 'Land 4 spin-influenced returns and break 6 blocks.',
    unlock: 'Spin shots and safer angles',
    targets: { spinShots: 4, blocks: 6 },
    tip: 'Hold A or D while hitting to bend the next shot.'
  },
  {
    id: 'dash',
    title: '3 · Dash Recovery',
    focus: 'Use energy to recover from bad positioning.',
    goal: 'Dash twice and keep the rally alive.',
    unlock: 'Shift dash and Focus Burst',
    targets: { dashes: 2, saves: 8 },
    tip: 'Hold Shift when charged. Dash is for emergencies, not every shot.'
  },
  {
    id: 'blocks',
    title: '4 · Read the Field',
    focus: 'Prioritize block types and avoid chaos spirals.',
    goal: 'Break 14 blocks and use 1 heal or charge block.',
    unlock: 'Block priority and resource planning',
    targets: { blocks: 14, resources: 1 },
    tip: 'Green heals HP, cyan charges energy, yellow splits the ball.'
  },
  {
    id: 'mission',
    title: '5 · Contract Play',
    focus: 'Play toward the mission instead of chasing every ball randomly.',
    goal: 'Complete the active mission contract.',
    unlock: 'Mission rewards and draft tempo',
    targets: { missionCompletions: 1 },
    tip: 'The mission panel tells you what matters right now.'
  },
  {
    id: 'draft',
    title: '6 · Build Choice',
    focus: 'Choose upgrades that support your role and mission.',
    goal: 'Clear a level and choose one upgrade.',
    unlock: 'Roguelike build planning',
    targets: { upgrades: 1 },
    tip: 'Pick survival when failing, damage when stable, control when overwhelmed.'
  },
  {
    id: 'team',
    title: '7 · Team Shape',
    focus: 'Understand lanes, bots, co-op, and mirrored versus.',
    goal: 'Launch a 4+ player room or bot-filled run.',
    unlock: 'Full multiplayer readiness',
    targets: { teamLaunches: 1 },
    tip: 'Bots are training partners. Friends can replace them later.'
  }
]);

export function defaultTutorialEnabled(preset = 'quickRaid') {
  // Academy and First Run are explicitly teaching-first. Co-op / versus presets expose this as an opt-in room setting.
  return preset === 'academy' || preset === 'firstRun';
}

export function createSkillState(preset = 'quickRaid', enabled = defaultTutorialEnabled(preset)) {
  if (!enabled) {
    return {
      enabled: false,
      index: 0,
      completed: [],
      progress: {},
      lastUnlocked: '',
      showCoach: false,
      optional: true
    };
  }
  return {
    enabled: true,
    index: 0,
    completed: [],
    progress: {},
    lastUnlocked: SKILL_PATH[0]?.unlock || '',
    showCoach: true,
    optional: !(preset === 'academy' || preset === 'firstRun')
  };
}

export function currentSkill(skillState) {
  if (!skillState || skillState.enabled === false) return null;
  return SKILL_PATH[Math.min(skillState.index || 0, SKILL_PATH.length - 1)] || SKILL_PATH[0];
}

export function skillSummary(skillState) {
  const skill = currentSkill(skillState);
  if (!skill) return 'tutorial off';
  return Object.entries(skill.targets).map(([key, target]) => `${labelFor(key)} ${Math.min(skillState?.progress?.[key] || 0, target)}/${target}`).join(' · ');
}

export function labelFor(key) {
  return ({ serves: 'serves', saves: 'saves', spinShots: 'spin', blocks: 'blocks', dashes: 'dashes', resources: 'resources', missionCompletions: 'missions', upgrades: 'upgrades', teamLaunches: 'team launches' })[key] || key;
}

export function progressSkill(room, key, amount = 1) {
  if (!room?.skill || room.skill.enabled === false) return false;
  const skill = currentSkill(room.skill);
  if (!skill?.targets?.[key]) return false;
  room.skill.progress[key] = Math.max(room.skill.progress[key] || 0, key === 'saves' || key === 'blocks' ? (room.skill.progress[key] || 0) + amount : amount === 1 ? (room.skill.progress[key] || 0) + 1 : amount);
  const complete = Object.entries(skill.targets).every(([targetKey, target]) => (room.skill.progress[targetKey] || 0) >= target);
  if (!complete) return false;
  if (!room.skill.completed.includes(skill.id)) room.skill.completed.push(skill.id);
  room.skill.lastUnlocked = skill.unlock;
  room.lastEvent = `Lesson complete: ${skill.title}.`;
  room.serverMessage = `Lesson complete: ${skill.title}. ${skill.unlock} unlocked.`;
  if (room.skill.index < SKILL_PATH.length - 1) {
    room.skill.index += 1;
    room.skill.progress = {};
  }
  return true;
}

export function serializeSkill(skillState) {
  if (!skillState || skillState.enabled === false) {
    return {
      enabled: false,
      title: 'Optional Tutorial Off',
      focus: 'Free play. Enable Guided Tutorial in the lobby to show skill lessons during co-op or versus.',
      goal: 'Play freely.',
      unlock: 'No lesson gating',
      index: 0,
      total: SKILL_PATH.length,
      completed: skillState?.completed || [],
      progress: {},
      summary: 'tutorial off',
      lastUnlocked: '',
      showCoach: false,
      optional: true
    };
  }
  const skill = currentSkill(skillState);
  return {
    ...skill,
    enabled: true,
    index: skillState?.index || 0,
    total: SKILL_PATH.length,
    completed: skillState?.completed || [],
    progress: skillState?.progress || {},
    summary: skillSummary(skillState),
    lastUnlocked: skillState?.lastUnlocked || '',
    showCoach: skillState?.showCoach !== false,
    optional: !!skillState?.optional
  };
}
