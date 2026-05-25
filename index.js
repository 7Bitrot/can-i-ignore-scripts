#!/usr/bin/env node
import fs from "node:fs";
import util from "node:util";
import { createInterface } from "node:readline/promises";
import { readdir, stat, realpath } from "node:fs/promises";
import { join } from "path";

/**
 * Recursively finds files, following symlinks and returning virtual paths.
 * @param {string} dirPath - The current VIRTUAL path being searched.
 * @param {string} fileNameToFind - The name of the file to find.
 * @param {Set<string>} visitedPaths - A set of visited CANONICAL paths to prevent cycles.
 * @returns {Promise<string[]>} A promise that resolves to an array of virtual file paths.
 */
async function findFilesRecursively(
  dirPath,
  fileNameToFind,
  visitedPaths = new Set()
) {
  let results = [];

  try {
    // 1. Get the CANONICAL path for cycle detection ONLY.
    const p = await realpath(dirPath);

    // 2. Check if the canonical path has been visited to prevent infinite loops.
    if (visitedPaths.has(p)) {
      return []; // Stop this branch to prevent a cycle.
    }
    visitedPaths.add(p);

    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      // 3. Construct the next VIRTUAL path for traversal and results.
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (entry.name[0] === ".") {
          // Skip hidden directories like .git, .svn, .hg, .cache, etc.
          continue;
        }
        // Recurse using the virtual path.
        results.push(
          ...(await findFilesRecursively(
            fullPath,
            fileNameToFind,
            visitedPaths
          ))
        );
      } else if (entry.isSymbolicLink()) {
        // ⛓️ For a symlink, check what it points to.
        const linkStats = await stat(fullPath); // stat() follows the link.
        if (linkStats.isDirectory()) {
          // If it points to a directory, recurse using the virtual path.
          results.push(
            ...(await findFilesRecursively(
              fullPath,
              fileNameToFind,
              visitedPaths
            ))
          );
        }
      } else if (entry.isFile() && entry.name === fileNameToFind) {
        // 4. If we find a match, add the complete virtual path to our results.
        results.push(fullPath);
      }
    }
  } catch (err) {
    // Silently ignore errors like broken symlinks or permission denied.
    if (err.code !== "ENOENT" && err.code !== "EACCES") {
      console.error(`Error processing path ${dirPath}:`, err);
    }
  }

  return results;
}

const data = JSON.parse(
  fs.readFileSync(new URL("./data.json", import.meta.url))
);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const scriptNames = ["preinstall", "postinstall", "install"];

const width = 70;

const lines = {
  thick: "▀".repeat(width),
  thin: "_".repeat(width),
};

console.log(`
█▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█
  ▄▄·  ▄▄▄·  ▐ ▄    ▄     ▪    ▄▄     ▐ ▄       ▄▄▄   ▄▄▄      ▄▄▄▄·
 ▐█ ▌ ▐█ ▀█ ·█▌▐█   ██    ██  ▐█ ▀    █▌▐█      ▐▄ █· █  ▀·  .▀  .█▌
 ██ ▄▄▄█▀▀█ ▐█▐▐▌   ▐█·   ▐█· ▄█ ▀█▄ ▐█▐▐▌ ▄█▀▄ ▐▀▀▄ ▐█▀      ▄█▀▀▀·
 ▐███▌▐█ ▪▐▌██▐█▌   ▐█▌   ▐█▌ ▐█▄ ▐█ ██▐█▌▐█▌.▐▌▐▄ █▌▐█▄▄▄▌   ▀
 ·▀▀▀  ▀  ▀ ▀▀ █▪   ▀▀▀   ▀▀▀ ·▀▀▀▀  ▀▀ █▪ ▀█▄▀▪.▀  ▀ ▀▀▀     ▀
`);

const locations = fs.globSync(["node_modules", "**/node_modules"]);
console.log(`Looking in the following locations: 
  ${locations.join('\n  ')}
`);
const files = (
  await Promise.all(
    locations.map((loc) => findFilesRecursively(loc, "package.json"))
  )
).flat();
const found = files
  .map((file) => {
    let json;
    try {
      json = JSON.parse(fs.readFileSync(file));
    } catch (e) {
      console.error(`Oops, ${file} doesn't seem to be a valid JSON`);
      return null;
    }
    const { name, scripts = {}, version } = json;
    return {
      name,
      version,
      scripts: Object.fromEntries(
        Object.entries(scripts).filter(([key]) => scriptNames.includes(key))
      ),
      path: file.substr(0, file.length - 12),
    };
  })
  .filter((pkg) => pkg && Object.keys(pkg.scripts).length > 0)
  .reduce((acc, pkg) => {
    if (!acc[pkg.name]) {
      acc[pkg.name] = [];
    }
    pkg.info = `https://socket.dev/npm/package/${pkg.name}/files/${pkg.version}/package.json`;
    acc[pkg.name].push(pkg);
    return acc;
  }, {});

if (Object.keys(found).length === 0) {
  console.log("No scripts found");
  process.exit(0);
}
const keep = [];
const check = [];

console.log(`${lines.thick}
Found following packages with scripts:
${lines.thin} ${Object.keys(found)
  .map((name) => {
    const lookup = `look it up: https://socket.dev/npm/package/${name}/`;
    if (data.ignore[name]) {
      return `
[ ignore ] '${name}' has scripts but they can be ignored
           ${lookup}
           reason: ${data.ignore[name]}`;
    } else if (data.keep[name]) {
      keep.push(name);
      return `
[  keep  ] '${name}' may need its scripts to run
           ${lookup}
           reason: ${data.keep[name]} `;
    } else {
      let tip = "";
      if (
        found[name]
          .flatMap((pkg) => Object.values(pkg.scripts))
          .join("")
          .includes("node-gyp")
      ) {
        tip = "(it seems to use gyp for building, so you might need it)";
        keep.push(name);
      } else {
        check.push(name);
      }
      return `
[ check? ] '${name}' needs reviewing ${tip}
${util.inspect(found[name])}`;
    }
  })
  .sort()
  .reverse()
  .join(`\n${lines.thin}`)}`);


console.log(`
${lines.thick}
What now?

Install @lavamoat/allow-scripts and use the info above to populate your allowlist.

${lines.thin}
npm i -g @lavamoat/allow-scripts
allow-scripts setup
allow-scripts auto
npm pkg set scripts.setup='npm ci && allow-scripts'
${lines.thin}

`);


console.log(
  "█▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█\n"
);
console.log(
  `If you check some packages, contribute your findings on github.
  https://github.com/naugtur/can-i-ignore-scripts/blob/main/data.json
`
);

// Exit with non-zero (fail) if there were packages with scripts we
// couldn't ignore. This lets us easily test for failure in shells.
process.exit(keep.length + check.length > 0 ? 1 : 0);
