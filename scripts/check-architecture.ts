import { fileURLToPath } from 'node:url';
import { ArchitectureCheck } from './ArchitectureCheck.js';

const checker = new ArchitectureCheck();
const errors = checker.checkProject(fileURLToPath(new URL('../', import.meta.url)));
if (errors.length) {
  for (const error of errors) console.error('architecture error: ' + error);
  process.exitCode = 1;
} else {
  console.log('Architecture checks passed (' + checker.analyzedFiles + ' source files).');
}
