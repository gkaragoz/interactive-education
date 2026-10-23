import type { ModuleInfo } from '../moduleTypes';
import { dnaProtein } from './dna-protein';
import { energy } from './energy';
import { genetics } from './genetics';
import { membraneTransport } from './membrane-transport';
import { mitosisMeiosis } from './mitosis-meiosis';
import { muscle } from './muscle';
import { nervous } from './nervous';

/** Content of every module that has data. The shell registry (src/modules) decides which are released. */
export const modules: ModuleInfo[] = [mitosisMeiosis, membraneTransport, muscle, nervous, genetics, dnaProtein, energy];

export const getModule = (id: string): ModuleInfo | undefined => modules.find((m) => m.id === id);
