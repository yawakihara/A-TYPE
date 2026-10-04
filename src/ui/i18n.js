/** UI strings (Japanese / English). */
export const STR = {
  pressStart: { en: 'PRESS ANY BUTTON', ja: 'PRESS ANY BUTTON' },
  start: { en: 'START GAME', ja: 'ゲームスタート' },
  stageSelect: { en: 'STAGE SELECT', ja: 'ステージセレクト' },
  options: { en: 'OPTIONS', ja: 'オプション' },
  records: { en: 'RECORDS', ja: 'ハイスコア' },
  music: { en: 'MUSIC ROOM', ja: 'ミュージックルーム' },
  howto: { en: 'HOW TO PLAY', ja: '遊び方' },
  credits: { en: 'CREDITS', ja: 'クレジット' },
  back: { en: 'BACK', ja: 'もどる' },
  difficulty: { en: 'DIFFICULTY', ja: '難易度' },
  diffName: [
    { en: 'CASUAL', ja: 'カジュアル' },
    { en: 'ARCADE', ja: 'アーケード' },
    { en: 'VETERAN', ja: 'ベテラン' },
  ],
  diffDesc: [
    { en: '5 lives · gentler bullets · keep a basic AEGIS after a miss', ja: '残機5・弾が遅い・ミスしてもAEGIS(Lv1)を保持' },
    { en: 'The classic rules: 3 lives, checkpoint restart, lose all power-ups on a miss', ja: '原典どおりのルール。残機3・チェックポイント復帰・ミスで装備を全て失う' },
    { en: 'Faster, denser fire — and the Bloom shoots back when it dies', ja: '弾が速く多い。さらに倒した敵が撃ち返してくる' },
  ],
  hintMenu: { en: '↑↓ SELECT   ←→ CHANGE   ENTER/Z CONFIRM   ESC BACK', ja: '↑↓ 選択   ←→ 変更   ENTER/Z 決定   ESC 戻る' },
  practice: { en: 'PRACTICE (INFINITE LIVES)', ja: '練習モード(残機無限)' },
  locked: { en: 'LOCKED', ja: '未到達' },
  graphics: { en: 'GRAPHICS', ja: 'グラフィック' },
  crt: { en: 'CRT FILTER (ARCADE)', ja: 'CRTフィルター(アーケード時)' },
  quality: { en: 'RENDER QUALITY', ja: '描画品質' },
  sound: { en: 'SOUND SET', ja: '音源' },
  musicVol: { en: 'MUSIC VOLUME', ja: 'BGM音量' },
  sfxVol: { en: 'SFX VOLUME', ja: '効果音音量' },
  language: { en: 'LANGUAGE', ja: '言語' },
  shake: { en: 'SCREEN EFFECTS', ja: '画面エフェクト' },
  fullscreen: { en: 'FULLSCREEN', ja: 'フルスクリーン' },
  resetRecords: { en: 'RESET RECORDS', ja: '記録をリセット' },
  on: { en: 'ON', ja: 'ON' },
  off: { en: 'OFF', ja: 'OFF' },
  full: { en: 'FULL', ja: '標準' },
  reduced: { en: 'REDUCED', ja: '控えめ' },
  confirmReset: { en: 'PRESS AGAIN TO CONFIRM', ja: 'もう一度押すとリセット' },
  demo: { en: 'DEMO PLAY', ja: 'デモプレイ' },
  nowPlaying: { en: 'NOW PLAYING', ja: '再生中' },
  stop: { en: 'STOP', ja: '停止' },
  enterName: { en: 'ENTER YOUR NAME', ja: 'ネームエントリー' },
  newRecord: { en: 'NEW RECORD!', ja: 'ハイスコア更新!' },
  rank: { en: 'RANK', ja: '順位' },
  skip: { en: 'PRESS ENTER TO SKIP', ja: 'ENTERでスキップ' },
};

export const PROLOGUE = {
  en: [
    '2189 A.D.',
    'The deep-space relay network fell silent.',
    'What answered from beyond the heliopause was not a fleet, nor a machine — it was a garden.',
    'We named it THE BLOOM: living architecture that roots in steel and flesh alike, and flowers everything it touches into weapons.',
    'Six relay stations were swallowed in nine days.',
    'Our last hope is a prototype: the A-type fighter HALCYON, carrying the LANCE charge cannon and AEGIS — a seed of the Bloom itself, caged in crystal and taught to obey.',
    'Pilot. Pierce the Bloom. Reach its heart.',
    'Do not let it flower.',
  ],
  ja: [
    '西暦2189年――',
    '深宇宙中継網が、沈黙した。',
    '太陽圏の外から応答してきたのは、艦隊でも機械でもなく、“庭”だった。',
    '人類はそれを〈ブルーム〉と名付けた。鋼にも肉にも根を張り、触れたものすべてを兵器へと咲き変える、生きた建造物。',
    'わずか9日で、6つの中継基地が呑み込まれた。',
    '最後の希望は試作戦闘機――A型〈ハルシオン〉。溜め撃ち砲〈ランス〉と、ブルームの種子を結晶に封じて従えた〈イージス〉を携えて。',
    'パイロット。ブルームを貫け。その心臓へ届け。',
    '決して、花開かせてはならない。',
  ],
};

export const HOWTO = [
  {
    title: { en: 'CONTROLS', ja: '操作方法' },
    lines: {
      en: ['MOVE ........ ARROWS / WASD / LEFT STICK', 'SHOT ........ Z / SPACE  (A)', 'CHARGE BEAM . HOLD Z, RELEASE TO FIRE', 'AEGIS ....... X  (B) — LAUNCH / RECALL', 'RAPID FIRE .. C  (X) — AUTO SHOT, NO CHARGE', 'SPEED ....... SHIFT  (Y / RB) — CHANGE GEAR', 'PAUSE ....... ESC / P / ENTER  (START)', 'TAB: HD ⇄ ARCADE GRAPHICS    B: SOUND SET    F: FULLSCREEN'],
      ja: ['移動 ........ 矢印キー / WASD / 左スティック', 'ショット .... Z / スペース (A)', '溜め撃ち .... Zを押し続けて離す', 'イージス .... X (B) 発射 / 回収', '連射 ........ C (X) 押している間 自動連射', 'スピード .... SHIFT (Y/RB) ギア切替', 'ポーズ ...... ESC / P / ENTER (START)', 'TAB: HD⇄アーケード表示   B: 音源切替   F: 全画面'],
    },
  },
  {
    title: { en: 'THE LANCE', ja: '溜め撃ち〈ランス〉' },
    lines: {
      en: ['Tap to fire. Hold to fill the BEAM meter at the bottom of the screen.', 'Release to loose the LANCE — a piercing beam that grows with the charge.', 'A full meter (5th level) flashes white: it cuts through whole formations.', 'Killing several enemies with one LANCE scores a CHAIN bonus.'],
      ja: ['短く押すと通常弾。押し続けると画面下のBEAMメーターが溜まる。', '離すと〈ランス〉発射。溜めるほど太く長く、敵を貫通する。', 'メーター満タン(白く点滅)で最大威力。編隊ごと貫ける。', '1発のランスで複数撃破するとCHAINボーナス。'],
    },
  },
  {
    title: { en: 'AEGIS', ja: '制御体〈イージス〉' },
    lines: {
      en: ['Shoot an item carrier and grab the crystal to summon AEGIS.', 'AEGIS is indestructible. It absorbs ordinary bullets and grinds enemies it touches.', 'Touch it with your nose to dock in front, with your tail to dock behind.', 'Press X to launch it as a battering ram; press again to call it back.', 'While detached it fires on its own and follows your altitude.'],
      ja: ['アイテムキャリアを倒し、クリスタルを取るとイージスが飛来する。', 'イージスは無敵。通常弾を吸収し、触れた敵を削り倒す。', '機首で触れると前方、尾部で触れると後方に装着。', 'Xで前方(後方)へ射出、もう一度押すと手元へ戻る。', '分離中は自律射撃し、自機の高さに追従する。'],
    },
  },
  {
    title: { en: 'CRYSTALS & ITEMS', ja: 'クリスタルとアイテム' },
    lines: {
      en: ['Crystals cycle RED → BLUE → YELLOW. The colour you grab sets the laser:', 'RED — HELIX: twin spiralling beams straight ahead, piercing.', 'BLUE — PRISM: diagonal beams that ricochet off walls.', 'YELLOW — CRAWLER: shots that run along floors and ceilings.', 'More crystals grow AEGIS to level 3.   S: speed up   M: homing missiles   B: satellite bit'],
      ja: ['クリスタルは 赤→青→黄 と色が変わる。取った色でレーザーが決まる。', '赤 HELIX:前方へ螺旋状の貫通レーザー。', '青 PRISM:斜めに撃ち、壁で反射するレーザー。', '黄 CRAWLER:床や天井を這って進むレーザー。', '重ねて取るとLv3まで成長。 S:スピード  M:追尾ミサイル  B:ビット'],
    },
  },
  {
    title: { en: 'RULES', ja: 'ルール' },
    lines: {
      en: ['One hit is fatal — bullets, enemies, and walls alike.', 'After a miss you restart from the last checkpoint without your power-ups.', 'The A-01 is small: only the cockpit core is vulnerable to bullets, but its whole hull scrapes terrain.', 'Extra fighter at 50,000 and 150,000, then every 150,000 points.', 'Six stages. Pierce the Bloom.'],
      ja: ['被弾・敵との接触・地形への衝突は即ミス。', 'ミスすると直前のチェックポイントから、装備を失って再開。', '弾の当たり判定はコクピット付近のみ。地形には機体全体が当たる。', '50,000点・150,000点、以降150,000点ごとに1機増える。', '全6ステージ。ブルームを貫け。'],
    },
  },
];

export const CREDITS = [
  ['AEGIS LANCE', ''],
  ['GAME DESIGN · PROGRAMMING', 'Claude (Anthropic)'],
  ['PIXEL & HD ART (PROCEDURAL)', 'Claude (Anthropic)'],
  ['MUSIC & SOUND (SYNTHESISED)', 'Claude (Anthropic)'],
  ['PRODUCER', 'yawakihara'],
  ['', ''],
  ['TECHNOLOGY', 'HTML5 Canvas · WebGL · Web Audio'],
  ['', 'No external assets: every image and note is generated in code.'],
  ['', ''],
  ['INSPIRED BY', 'the arcade side-scrolling shooters of the late 1980s'],
  ['', 'All characters, stages, names and music are original works.'],
];
