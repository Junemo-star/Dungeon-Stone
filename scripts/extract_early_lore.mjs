import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'd:\\gamemakewith_ai\\babarian';
const STORY_DIR = path.join(ROOT, 'เนื้อเรื่อง');
const LORE_DIR = path.join(ROOT, 'lore');
const RAW_EARLY_DIR = path.join(LORE_DIR, '_raw_early');

fs.mkdirSync(RAW_EARLY_DIR, { recursive: true });

const allFiles = fs
  .readdirSync(STORY_DIR)
  .filter((f) => f.endsWith('.txt'))
  .sort((a, b) => {
    const na = parseInt(a.match(/Chapter_(\d+)/i)?.[1] ?? '0', 10);
    const nb = parseInt(b.match(/Chapter_(\d+)/i)?.[1] ?? '0', 10);
    return na - nb;
  });

const earlyFiles = allFiles.filter((f) => {
  const n = parseInt(f.match(/Chapter_(\d+)/i)?.[1] ?? '0', 10);
  return n >= 1 && n <= 247;
});

const bracketCounts = new Map();
const bracketFirstChap = new Map();
const earlyRecords = [];
const allChapterNums = allFiles.map((f) => parseInt(f.match(/Chapter_(\d+)/i)?.[1] ?? '0', 10));

const essenceSnippets = [];
const raceSnippets = [];
const floorSnippets = [];

const MAX_SNIPPETS = 200;

const essenceRe = /(แก่นแท้|เอสเซนส์|Essence|ดูดซับ.*แก่น|สกิลติดตัว|สกิลใช้งาน)/i;
const raceRe = /(เผ่า|คนเถื่อน|บาร์บาเรียน|มนุษย์สัตว์|คนแคระ|เอลฟ์|นางฟ้า|เผ่ามังกร|นัมเบอร์ไอเทม|หินเวท|ค่าสถานะ|กายภาพ|จิตวิญญาณ)/i;
const floorRe = /(ชั้นที่\s*\d+|เขาวงกต|ลอร์ดประจำชั้น|บอสประจำชั้น|มอนสเตอร์ระดับ|แรงค์\s*\d+|ระดับ\s*[1-9]|ราฟโดเนีย|โนอาร์ค|ถ้ำคริสตัล)/i;

for (const file of earlyFiles) {
  const chapNum = parseInt(file.match(/Chapter_(\d+)/i)?.[1] ?? '0', 10);
  const fullPath = path.join(STORY_DIR, file);
  const content = fs.readFileSync(fullPath, 'utf8');

  earlyRecords.push({
    chapter: chapNum,
    filename: file,
    bytes: Buffer.byteLength(content, 'utf8'),
  });

  const matches = content.matchAll(/\[([^\]\r\n]{2,90})\]/g);
  for (const m of matches) {
    const text = m[1].trim();
    if (!text) continue;
    bracketCounts.set(text, (bracketCounts.get(text) ?? 0) + 1);
    if (!bracketFirstChap.has(text)) {
      bracketFirstChap.set(text, chapNum);
    }
  }

  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 18 && l.length <= 320);

  let eCount = 0;
  let rCount = 0;
  let fCount = 0;

  for (const line of lines) {
    if (essenceSnippets.length < MAX_SNIPPETS && eCount < 2 && essenceRe.test(line)) {
      essenceSnippets.push(`[Ch.${chapNum}] ${line}`);
      eCount++;
    }
    if (raceSnippets.length < MAX_SNIPPETS && rCount < 2 && raceRe.test(line)) {
      raceSnippets.push(`[Ch.${chapNum}] ${line}`);
      rCount++;
    }
    if (floorSnippets.length < MAX_SNIPPETS && fCount < 2 && floorRe.test(line)) {
      floorSnippets.push(`[Ch.${chapNum}] ${line}`);
      fCount++;
    }
    if (eCount >= 2 && rCount >= 2 && fCount >= 2) break;
  }
}

const topBrackets = [...bracketCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 300)
  .map(([text, count]) => `[${text}] (x${count}, first Ch.${bracketFirstChap.get(text)})`);

const namedChapters = earlyRecords
  .filter((c) => !/^Chapter_\d+_th\.txt$/i.test(c.filename))
  .map((c) => `Ch.${c.chapter}: ${c.filename.replace(/\.txt$/i, '')}`);

fs.writeFileSync(
  path.join(LORE_DIR, 'processed_chapters.json'),
  JSON.stringify(
    {
      updatedAt: new Date().toISOString(),
      totalFiles: allFiles.length,
      minChapter: allChapterNums[0] ?? null,
      maxChapter: allChapterNums[allChapterNums.length - 1] ?? null,
      chapters: allChapterNums,
    },
    null,
    2
  ),
  'utf8'
);

fs.writeFileSync(path.join(RAW_EARLY_DIR, 'brackets_early.txt'), topBrackets.join('\n'), 'utf8');
fs.writeFileSync(path.join(RAW_EARLY_DIR, 'timeline_titles_early.txt'), namedChapters.join('\n'), 'utf8');
fs.writeFileSync(path.join(RAW_EARLY_DIR, 'essences_early.txt'), essenceSnippets.join('\n'), 'utf8');
fs.writeFileSync(path.join(RAW_EARLY_DIR, 'races_systems_early.txt'), raceSnippets.join('\n'), 'utf8');
fs.writeFileSync(path.join(RAW_EARLY_DIR, 'floors_monsters_early.txt'), floorSnippets.join('\n'), 'utf8');

console.log(
  JSON.stringify(
    {
      earlyFilesProcessed: earlyRecords.length,
      totalAllFiles: allFiles.length,
      allRange: `${allChapterNums[0]}-${allChapterNums[allChapterNums.length - 1]}`,
      uniqueEarlyBrackets: bracketCounts.size,
      topBracketsSaved: topBrackets.length,
      namedEarlyChapters: namedChapters.length,
      essenceSnippets: essenceSnippets.length,
      raceSnippets: raceSnippets.length,
      floorSnippets: floorSnippets.length,
    },
    null,
    2
  )
);
