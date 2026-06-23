export function stripComments(code: string): string {
  const lines = code.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    let inSingle = false;
    let inDouble = false;
    let inBacktick = false;
    let commentIndex = -1;
    let i = 0;

    while (i < line.length) {
      const ch = line[i];
      const next = i + 1 < line.length ? line[i + 1] : null;

      if (ch === '\\' && next !== null) {
        i += 2;
        continue;
      }

      if (ch === "'" && !inDouble && !inBacktick) { inSingle = !inSingle; }
      else if (ch === '"' && !inSingle && !inBacktick) { inDouble = !inDouble; }
      else if (ch === '`' && !inSingle && !inDouble) { inBacktick = !inBacktick; }

      if (ch === '/' && next === '/' && !inSingle && !inDouble && !inBacktick) {
        commentIndex = i;
        break;
      }

      i++;
    }

    if (commentIndex === -1) {
      result.push(line);
    } else {
      const beforeComment = line.slice(0, commentIndex);
      if (beforeComment.trim() !== '') {
        result.push(beforeComment.replace(/\s+$/, ''));
      }
    }
  }

  return result.join('\n');
}
