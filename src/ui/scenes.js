/**
 * Scene wiring: title, menus, play, ending and record flows hang off the Game object here
 * so individual scenes don't import each other in cycles.
 */
import { PlayScene, newSession } from './play.js';
import { TitleScene } from './title.js';
import {
  DifficultyScene, StageSelectScene, OptionsScene, RecordsScene, MusicScene, HowtoScene,
  CreditsScene, DemoScene, PrologueScene, NameEntryScene, resetRecordsImpl,
} from './screens.js';
import { EndingScene } from './ending.js';
import { makeBot } from '../game/bot.js';
import { STORE } from '../config.js';
import { save } from '../core/storage.js';

export function bootScenes(game, params) {
  game.goTitle = (opt = {}) => game.setScene(new TitleScene(game, opt));
  game.openDifficulty = () => game.setScene(new DifficultyScene(game));
  game.openStageSelect = () => game.setScene(new StageSelectScene(game));
  game.openOptions = () => game.setScene(new OptionsScene(game));
  game.openRecords = () => game.setScene(new RecordsScene(game));
  game.openMusic = () => game.setScene(new MusicScene(game));
  game.openHowto = () => game.setScene(new HowtoScene(game));
  game.openCredits = () => game.setScene(new CreditsScene(game));
  game.startDemo = () => game.setScene(new DemoScene(game));
  game.startRun = (diff, opt = {}) => {
    game.cfg.diff = diff;
    game.saveCfg();
    const s = newSession(diff, opt);
    game.setScene(new PlayScene(game, s, opt.stage ?? 0, { god: opt.god, checkpoint: opt.checkpoint }));
  };
  /** New game from the menu: prologue first. */
  game.beginRun = (diff) => {
    game.setScene(new PrologueScene(game, () => game.startRun(diff)));
  };
  game.goEnding = (session) => {
    game.markCleared(session.diff);
    game.setScene(new EndingScene(game, session, () => game.finishRun(session, 6, true)));
  };
  game.finishRun = (session, stage, cleared) => {
    if (!session.practice && game.isHighScore(session.diff, session.score)) game.setScene(new NameEntryScene(game, session, stage, cleared));
    else game.goTitle({ skipIntro: true });
  };
  game.resetRecords = () => {
    resetRecordsImpl(game, game.defaultScores);
    game.progress = { reached: [1, 1, 1], cleared: [false, false, false] };
    save(STORE.progress, game.progress);
  };
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
  const scene = params.get('scene');
  if (params.has('stage')) {
    const diff = Number(params.get('diff') ?? 1);
    game.startRun(diff, {
      stage: Number(params.get('stage')) - 1,
      god: params.get('god') === '1',
      checkpoint: Number(params.get('cp') || 0),
      infinite: params.get('inf') === '1',
    });
  } else if (scene === 'ending') game.goEnding(newSession(1));
  else if (scene === 'options') game.openOptions();
  else if (scene === 'music') game.openMusic();
  else if (scene === 'records') game.openRecords();
  else if (scene === 'howto') game.openHowto();
  else if (scene === 'credits') game.openCredits();
  else if (scene === 'stages') game.openStageSelect();
  else if (scene === 'difficulty') game.openDifficulty();
  else if (scene === 'prologue') game.setScene(new PrologueScene(game, () => game.goTitle()));
  else if (scene === 'demo') game.startDemo();
  else if (scene === 'menu') game.goTitle({ skipIntro: true, menu: 0 });
  else game.goTitle();
}
