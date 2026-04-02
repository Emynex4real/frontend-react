import { readFileSync } from 'fs';
const j = JSON.parse(readFileSync('eslint_final.json', 'utf8'));
j.forEach(f => {
  const errs = f.messages.filter(m => m.severity >= 2);
  if (errs.length > 0) {
    const short = f.filePath.replace(/.*\\src\\/, '');
    errs.forEach(e => {
      console.log(`${short}:${e.line}: [${e.ruleId}] ${e.message}`);
    });
  }
});
