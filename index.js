#!/usr/bin/env node
const fs = require("node:fs");
const util = require("node:util");
const data = require("./data.json");

const scriptNames = ["preinstall", "postinstall", "install"];

console.log(`
█▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█
  ▄▄·  ▄▄▄·  ▐ ▄    ▄     ▪    ▄▄     ▐ ▄       ▄▄▄   ▄▄▄      ▄▄▄▄·
 ▐█ ▌ ▐█ ▀█ ·█▌▐█   ██    ██  ▐█ ▀    █▌▐█      ▐▄ █· █  ▀·  .▀  .█▌
 ██ ▄▄▄█▀▀█ ▐█▐▐▌   ▐█·   ▐█· ▄█ ▀█▄ ▐█▐▐▌ ▄█▀▄ ▐▀▀▄ ▐█▀      ▄█▀▀▀·
 ▐███▌▐█ ▪▐▌██▐█▌   ▐█▌   ▐█▌ ▐█▄ ▐█ ██▐█▌▐█▌.▐▌▐▄ █▌▐█▄▄▄▌   ▀
 ·▀▀▀  ▀  ▀ ▀▀ █▪   ▀▀▀   ▀▀▀ ·▀▀▀▀  ▀▀ █▪ ▀█▄▀▪.▀  ▀ ▀▀▀     ▀
`);

const files = fs.globSync("node_modules/**/package.json");
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
    acc[pkg.name].push(pkg);
    return acc;
  }, {});

if (Object.keys(found).length === 0) {
  console.log("No scripts found");
  process.exit(0);
}

console.log(
  "▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀"
);

console.log(`Found following packages with scripts:`);
const keep = [];
const check = [];
console.log(
  Object.keys(found)
    .map((name) => {
      if (data.ignore[name]) {
        return `[ ignore ] '${name}' has scripts but they can be ignored \n             reason: ${data.ignore[name]}`;
      } else if (data.keep[name]) {
        keep.push(name);
        return `[  keep  ] '${name}' needs its scripts to run \n             reason: ${data.keep[name]}`;
      } else {
        let tip = "";
        if (
          found[name]
            .flatMap((pkg) => Object.values(pkg.scripts))
            .join("")
            .includes("gyp ")
        ) {
          tip = "(it uses gyp, so you probably need it)";
          keep.push(name);
        } else {
          check.push(name);
        }
        return `[ check? ] '${name}' needs reviewing ${tip}\n${util.inspect(
          found[name]
        )}`;
      }
    })
    .sort()
    .reverse()
    .join("\n")
);
console.log(`
▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
What now? Run rebuild after 'npm ci --ignore-scripts' to trigger 
scripts you need to keep. `);
if (keep.length > 0) {
  console.log(`
A suggestion to get you started:
npm rebuild ${keep.join(" ")}
Or run all except the ones you can ignore now:
npm rebuild ${[...keep, ...check].join(" ")}`);
} else {
  console.log(`
Just use something like this: npm rebuild package1 package2`);
}
console.log(
  "█▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█\n"
);
console.log(
  "If you check some packages, consider contributing your findings on github."
);

// Exit with non-zero (fail) if there were packages with scripts we
// couldn't ignore. This lets us easily test for failure in shells.
process.exit(keep.length + check.length > 0 ? 1 : 0);
process.exit(keep.length + check.length > 0 ? 1 : 0);
