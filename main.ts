// Two Lines to Your Past Self — make.fun micro-text entry.
// Writes the chosen two-line warning to /output/entry.txt.
// Pass 1: 7 candidates, scored 0-2 on each judge criterion (RULES.txt order),
// weights 5/4/3/2/1, max 30. Pass 2: 3 challenger candidates added after
// re-reading pass 1. Winner = top score, ties broken by fewer bytes,
// then earliest. No dependencies; run with: node main.ts

const fs = require("fs");
const path = require("path");

// Judge criteria, in the order RULES.txt weighs them (most important first):
// 1. Line 1 warns a past self about ONE specific moment; line 2 says why it
//    mattered and what changed because of it. (weight 5)
// 2. The moment is concrete enough to picture: a time, a place, a decision,
//    or a sentence said out loud. (weight 4)
// 3. Line 2 shows real cause and effect, tracing what changed, not restating
//    line 1. (weight 3)
// 4. The two lines work as one, no wasted words. (weight 2)
// 5. Voice written to one specific person, plain and vivid, not clever for
//    its own sake. (weight 1)
const WEIGHTS = [5, 4, 3, 2, 1];

// scores: [c1, c2, c3, c4, c5] — 0..2 each. Scored honestly per candidate.
const CANDIDATES = [
  {
    id: "c1",
    title: "The Migration",
    lines: [
      "Don't run the migration at 2:14 a.m. with the staging flag still off.",
      "One keystroke erased the clinic's morning list, and forty patients sat in a bleach-smelling hallway with nowhere to be seen.",
    ],
    // c4=1: "with nowhere to be seen" restates the loss; one clause of waste.
    scores: [2, 2, 2, 1, 2],
  },
  {
    id: "c2",
    title: "Final-Final",
    lines: [
      "Don't type rm -rf on the folder called final-final at 11 p.m.",
      "Inside it were your grandmother's only copies of the wedding tapes, and no cloud ever held them.",
    ],
    // c3=1: line 2 names the loss but traces no chain of change beyond it.
    scores: [2, 2, 1, 2, 2],
  },
  {
    id: "c3",
    title: "The Diff",
    lines: [
      "Don't approve the pull request at 4:47 p.m. without opening the diff.",
      "The one-line change swapped two account numbers, and the rent money landed in a stranger's account that night.",
    ],
    // c5=1: line 2 reads like an incident report, slightly detached from "you".
    scores: [2, 2, 2, 2, 1],
  },
  {
    id: "c4",
    title: "Backed Up",
    lines: [
      "Don't tell her the photos are backed up before the upload bar finishes.",
      "The laptop died at 3 a.m., and the only pictures of her son's first steps went with it.",
    ],
    scores: [2, 2, 2, 2, 2],
  },
  {
    id: "c5",
    title: "Force-Push",
    lines: [
      "Don't force-push to main on Friday at 5:58 p.m. to fix it before the weekend.",
      "The team's whole week of work vanished from the branch, and Monday started with an empty repo and a full inbox.",
    ],
    // c5=1: the "fix it before the weekend" framing is a touch staged.
    scores: [2, 2, 2, 2, 1],
  },
  {
    id: "c6",
    title: "The Red Test",
    lines: [
      "Don't ship the build with the one red test you called flaky.",
      "That test was the payment guard, and by morning three customers had paid twice for rooms that were never theirs.",
    ],
    scores: [2, 2, 2, 2, 2],
  },
  {
    id: "c7",
    title: "Amber",
    lines: [
      "Don't answer yes, it's safe to delete while the backup job is still amber.",
      "The amber turned red at midnight, and the archive your father kept for forty years became a single empty folder.",
    ],
    // c4=1: "single" is redundant against "empty folder".
    scores: [2, 2, 2, 1, 2],
  },
  // --- Pass 2 challengers (added after re-reading pass 1: pass 1's leaders
  // are all agent-work accidents; these three test different stakes) ---
  {
    id: "c8",
    title: "The Key",
    lines: [
      "Don't paste the API key into the public chat at 9:03 a.m. to show the error faster.",
      "By lunch a bot had drained the account, and the demo your team rehearsed for a month opened on a dead screen.",
    ],
    // c5=1: "to show the error faster" stages the motive a touch too neatly.
    scores: [2, 2, 2, 2, 1],
  },
  {
    id: "c9",
    title: "The Lid",
    lines: [
      "Don't close the laptop lid at 1 a.m. in the middle of the export.",
      "The file was ninety percent written when the disk slept, and the only recording of her last recital ended in static.",
    ],
    scores: [2, 2, 2, 2, 2],
  },
  {
    id: "c10",
    title: "Update All",
    lines: [
      "Don't click update all on the server the night before the launch.",
      "The update renamed every table at 3 a.m., and the launch page woke up to a database that answered in a language nobody spoke.",
    ],
    // c2=1: "the night before the launch" has no clock time; c4/c5=1: the
    // closing image is clever for its own sake, not plain.
    scores: [2, 1, 2, 1, 1],
  },
];

function scoreOf(c) {
  return c.scores.reduce((s, v, i) => s + v * WEIGHTS[i], 0);
}

function bytesOf(c) {
  return Buffer.byteLength(c.lines.join("\n"), "utf8");
}

// Gate from RULES.txt: /output/entry.txt is UTF-8 text of 1 to 280
// characters, not only white space. Plus the brief: exactly two lines,
// one sentence each.
function validate(text) {
  const errors = [];
  if (typeof text !== "string" || text.length === 0) errors.push("empty");
  if (text.length > 280) errors.push(`too long: ${text.length} chars (max 280)`);
  if (text.trim().length === 0) errors.push("only whitespace");
  const lines = text.replace(/\n$/, "").split("\n");
  if (lines.length !== 2) errors.push(`expected exactly 2 lines, got ${lines.length}`);
  for (const [i, line] of lines.entries()) {
    if (line.trim().length === 0) errors.push(`line ${i + 1} is empty`);
    // One sentence per line: exactly one sentence-terminating mark, at the end.
    // Abbreviations with periods (a.m./p.m.) are not sentence ends.
    const scrubbed = line.replace(/\b[ap]\.m\./gi, "AM");
    const terms = (scrubbed.match(/[.!?]/g) || []).length;
    if (terms !== 1 || !/[.!?]$/.test(line.trim())) {
      errors.push(`line ${i + 1} is not exactly one sentence`);
    }
  }
  return errors;
}

function main() {
  const ranked = CANDIDATES.map((c) => ({
    ...c,
    total: scoreOf(c),
    bytes: bytesOf(c),
    chars: c.lines.join("\n").length,
  })).sort((a, b) => b.total - a.total || a.bytes - b.bytes);

  console.log("id  title         score  bytes  chars  scores(c1..c5)");
  for (const c of ranked) {
    console.log(
      `${c.id}  ${c.title.padEnd(12)} ${String(c.total).padStart(2)}/30  ${String(c.bytes).padStart(4)}  ${String(c.chars).padStart(4)}  [${c.scores.join(",")}]`
    );
  }

  const winner = ranked[0];
  console.log(`\nWinner: ${winner.id} "${winner.title}" — ${winner.total}/30, ${winner.bytes} bytes, ${winner.chars} chars`);

  const text = winner.lines.join("\n") + "\n";
  const errors = validate(text);
  if (errors.length > 0) {
    console.error("GATE FAILED: " + errors.join("; "));
    process.exit(1);
  }

  const outDir = "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "entry.txt");
  fs.writeFileSync(outPath, text, "utf8");

  // Re-read and verify byte-identical to the chosen entry.
  const back = fs.readFileSync(outPath, "utf8");
  if (back !== text) {
    console.error("GATE FAILED: re-read entry.txt differs from chosen entry");
    process.exit(1);
  }
  const reErrors = validate(back);
  if (reErrors.length > 0) {
    console.error("GATE FAILED on re-read: " + reErrors.join("; "));
    process.exit(1);
  }
  console.log(`Wrote ${outPath} (${text.length} chars incl. trailing newline) — gate passed.`);
  console.log("--- entry ---");
  process.stdout.write(text);
}

main();
