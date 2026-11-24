import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'd:\\gamemakewith_ai\\babarian';
const STORY_DIR = path.join(ROOT, 'เนื้อเรื่อง');
const LORE_DIR = path.join(ROOT, 'lore');
const RAW_DIR = path.join(LORE_DIR, '_raw');

fs.mkdirSync(RAW_DIR, { recursive: true });

const files = fs
  .readdirSync(STORY_DIR)
  .filter((f) => f.endsWith('.txt'))
  .sort((a, b) => {
    const na = parseInt(a.match(/Chapter_(\d+)/i)?.[1] ?? '0', 10);
    const nb = parseInt(b.match(/Chapter_(\d+)/i)?.[1] ?? '0', 10);
    return na - nb;
  });

const bracketCounts = new Map();
const bracketFirstChap = new Map();
const chapterRecords = [];

const essenceSnippets = [];
const raceSnippets = [];
const floorSnippets = [];

const MAX_SNIPPETS = 220;

const essenceRe = /(แก่นแท้|เอสเซนส์|Essence|ดูดซับ.*แก่น|สกิลติดตัว|สกิลใช้งาน)/i;
const raceRe = /(เผ่า|คนเถื่อน|บาร์บาเรียน|มนุษย์สัตว์|คนแคระ|เอลฟ์|นางฟ้า|เผ่ามังกร|นัมเบอร์ไอเทม|หินเวท|ค่าสถานะ|กายภาพ|จิตวิญญาณ)/i;
const floorRe = /(ชั้นที่\s*\d+|เขาวงกต|ลอร์ดประจำชั้น|บอสประจำชั้น|มอนสเตอร์ระดับ|แรงค์\s*\d+|ระดับ\s*[1-9]|ราฟโดเนีย|โนอาร์ค)/i;

for (const file of files) {
  const chapNum = parseInt(file.match(/Chapter_(\d+)/i)?.[1] ?? '0', 10);
  const fullPath = path.join(STORY_DIR, file);
  const content = fs.readFileSync(fullPath, 'utf8');

  chapterRecords.push({
    chapter: chapNum,
    filename: file,
    bytes: Buffer.byteLength(content, 'utf8'),
  });

  // Extract [System Brackets]
  const matches = content.matchAll(/\[([^\]\r\n]{2,90})\]/g);
  for (const m of matches) {
    const text = m[1].trim();
    if (!text) continue;
    bracketCounts.set(text, (bracketCounts.get(text) ?? 0) + 1);
    if (!bracketFirstChap.has(text)) {
      bracketFirstChap.set(text, chapNum);
    }
  }

  // Sample lines for each category (spread across chapters, avoiding flooding)
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length >= 18 && l.length <= 320);

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

// Sort brackets by frequency descending, keep top 350
const topBrackets = [...bracketCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 350)
  .map(([text, count]) => `[${text}] (x${count}, first Ch.${bracketFirstChap.get(text)})`);

// Chapter titles that have descriptive Thai names
const namedChapters = chapterRecords
  .filter((c) => !/^Chapter_\d+_th\.txt$/i.test(c.filename))
  .map((c) => `Ch.${c.chapter}: ${c.filename.replace(/\.txt$/i, '')}`);

fs.writeFileSync(
  path.join(LORE_DIR, 'processed_chapters.json'),
  JSON.stringify(
    {
      updatedAt: new Date().toISOString(),
      totalFiles: chapterRecords.length,
      minChapter: chapterRecords[0]?.chapter ?? null,
      maxChapter: chapterRecords[chapterRecords.length - 1]?.chapter ?? null,
      chapters: chapterRecords.map((c) => c.chapter),
    },
    null,
    2
  ),
  'utf8'
);

fs.writeFileSync(path.join(RAW_DIR, 'brackets_system.txt'), topBrackets.join('\n'), 'utf8');
fs.writeFileSync(path.join(RAW_DIR, 'timeline_titles.txt'), namedChapters.join('\n'), 'utf8');
fs.writeFileSync(path.join(RAW_DIR, 'essences_snippets.txt'), essenceSnippets.join('\n'), 'utf8');
fs.writeFileSync(path.join(RAW_DIR, 'races_systems_snippets.txt'), raceSnippets.join('\n'), 'utf8');
fs.writeFileSync(path.join(RAW_DIR, 'floors_monsters_snippets.txt'), floorSnippets.join('\n'), 'utf8');

console.log(
  JSON.stringify(
    {
      totalFiles: chapterRecords.length,
      range: `${chapterRecords[0]?.chapter}-${chapterRecords[chapterRecords.length - 1]?.chapter}`,
      uniqueBrackets: bracketCounts.size,
      topBracketsSaved: topBrackets.length,
      namedChapters: namedChapters.length,
      essenceSnippets: essenceSnippets.length,
      raceSnippets: raceSnippets.length,
      floorSnippets: floorSnippets.length,
    },
    null,
    2
  )
);
