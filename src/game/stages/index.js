/** Stage registry. Each entry is a factory returning a fresh stage definition. */
import '../enemies/common.js';
import '../enemies/stage1.js';
import '../bosses/iris.js';
import { stage1 } from './stage1.js';

export const STAGES = [stage1];
