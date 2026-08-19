import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Repo-wide guard for the two Radix Select misuses that reached production.
 *
 * A component test only covers the component it renders; this walks every
 * source file, so a new Select written the old way fails CI wherever it lives.
 */
function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (/\.tsx$/.test(full) && !/\.(test|spec)\.tsx$/.test(full)) acc.push(full);
  }
  return acc;
}

/** Drop comments so documentation about these patterns is not itself flagged. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Remove complete Select primitive blocks, leaving only the direct children of
 * SelectContent. String.raw keeps the escapes intact — a plain template literal
 * turns \b into a backspace character and \s into a literal 's'.
 */
function stripPrimitives(body: string): string {
  let prev = '';
  let out = body;
  while (prev !== out) {
    prev = out;
    for (const tag of ['SelectItem', 'SelectGroup', 'SelectLabel', 'SelectSeparator']) {
      out = out.replace(new RegExp(String.raw`<${tag}\b[\s\S]*?</${tag}>`, 'g'), '');
      out = out.replace(new RegExp(String.raw`<${tag}\b[^>]*/>`, 'g'), '');
    }
  }
  return out;
}

const files = sourceFiles('src');

describe('Radix Select usage', () => {
  it('finds Select usages to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('renders no raw HTML element as a direct child of SelectContent', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const src = stripComments(readFileSync(file, 'utf8'));
      for (const match of src.matchAll(/<SelectContent[^>]*>([\s\S]*?)<\/SelectContent>/g)) {
        const rest = stripPrimitives(match[1]);
        const raw = rest.match(/<(div|p|span|em|small|li|ul|section)\b/);
        if (raw) {
          const line = src.slice(0, match.index).split('\n').length;
          offenders.push(`${file}:${line} -> <${raw[1]}>`);
        }
      }
    }

    expect(
      offenders,
      "A raw element inside SelectContent causes: NotFoundError: Failed to execute " +
        "'removeChild' on 'Node'. Use <SelectGroup><SelectLabel> for empty states. " +
        "Elements nested inside a SelectItem are fine.\n" + offenders.join('\n'),
    ).toEqual([]);
  });

  it('uses no empty string as a SelectItem value', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const src = stripComments(readFileSync(file, 'utf8'));
      src.split('\n').forEach((line, i) => {
        if (/<SelectItem[^>]*\svalue=(""|'')/.test(line)) {
          offenders.push(`${file}:${i + 1}`);
        }
      });
    }

    expect(
      offenders,
      'Radix reserves "" for clearing a selection and throws on it. Use a ' +
        'sentinel such as NONE_VALUE and map it back to "" on change.\n' + offenders.join('\n'),
    ).toEqual([]);
  });
});
