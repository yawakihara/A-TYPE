/**
 * Scene wiring: title, play, ending and record flows hang off the Game object here
 * so individual scenes don't import each other in cycles.
 */
import { PlayScene, newSession } from './play.js';
import { TitleScene } from './title.js';
import { makeBot } from '../game/bot.js';

export function bootScenes(game, params) {
  game.goTitle = () => game.setScene(new TitleScene(game));
  game.startRun = (diff, opt = {}) => {
    game.cfg.diff = diff;
    game.saveCfg();
    const s = newSession(diff, opt);
    game.setScene(new PlayScene(game, s, opt.stage ?? 0, { god: opt.god, checkpoint: opt.checkpoint }));
  };
  game.goEnding = () => game.goTitle();
  game.finishRun = () => game.goTitle();
  game.report = () => {
    const sc = game.scene;
    const w = sc && sc.world;
    if (!w) return { scene: sc && sc.constructor.name };
    return {
      scene: sc.constructor.name,
      mode: sc.mode,
      stage: w.stage.index + 1,
      camX: Math.round(w.camX),
      phase: w.phase,
      boss: w.bossState,
      enemies: w.enemies.length,
      bullets: w.bullets.list.length,
      score: w.session.score,
      lives: w.session.lives,
      deaths: w.stats.deaths,
      kills: w.stats.kills,
      pod: w.pod ? `${w.pod.color}${w.pod.level}` : null,
    };
  };
  if (params.get('bot') === '1') game.input.bot = makeBot(() => game.scene && game.scene.world);
  game.testStop = () => {
    const until = params.get('until');
    const sc = game.scene;
    if (!until || !sc || !sc.world) return false;
    if (until === 'clear') return sc.mode === 'tally' || sc.world.phase === 'tally';
    if (until === 'boss') return sc.world.bossState === 'fight';
    return false;
  };
  if (params.has('stage')) {
    const diff = Number(params.get('diff') ?? 1);
    game.startRun(diff, {
      stage: Number(params.get('stage')) - 1,
      god: params.get('god') === '1',
      checkpoint: Number(params.get('cp') || 0),
      infinite: params.get('inf') === '1',
    });
  } else game.goTitle();
}
