/** Stage registry. Each entry is a factory returning a fresh stage definition. */
import '../enemies/common.js';
import '../enemies/stage1.js';
import '../enemies/stage2.js';
import '../enemies/stage3.js';
import '../enemies/stage4.js';
import '../enemies/stage5.js';
import '../enemies/stage6.js';
import '../bosses/iris.js';
import '../bosses/brood.js';
import '../bosses/leviathan.js';
import '../bosses/anvil.js';
import '../bosses/wyrm.js';
import '../bosses/mother.js';
import { stage1 } from './stage1.js';
import { stage2 } from './stage2.js';
import { stage3 } from './stage3.js';
import { stage4 } from './stage4.js';
import { stage5 } from './stage5.js';
import { stage6 } from './stage6.js';

export const STAGES = [stage1, stage2, stage3, stage4, stage5, stage6];
