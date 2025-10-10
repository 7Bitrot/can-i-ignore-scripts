#!/usr/bin/env node
import fs from "node:fs";
import util from "node:util";
import { createInterface } from "node:readline/promises";

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

const cwdPkg = JSON.parse(fs.readFileSync("package.json"));
const lavamoatPresent = !!cwdPkg.lavamoat?.allowScripts;

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
[  keep  ] '${name}' needs its scripts to run
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

if (lavamoatPresent) {
  console.log(`
${lines.thick}
What now?`);
  if (keep.length > 0) {
    const pending = keep.filter((pkg) => !cwdPkg.lavamoat.allowScripts[pkg]);
    if (pending.length > 0) {
      const answer = await rl.question(
        `
You have ${
          pending.length
        } packages identified as 'keep' that are not yet allowed.
  ${pending.join(",\n  ")}
Would you like to populate your lavamoat allowlist with these packages? (y/n) `
      );
      if (answer.toLowerCase() === "y") {
        console.log("Populating lavamoat allowlist.");
        pending.forEach((pkg) => {
          cwdPkg.lavamoat.allowScripts[pkg] = true;
        });
        fs.writeFileSync(
          "package.json",
          JSON.stringify(cwdPkg, null, 2) + "\n"
        );
        console.log(
          "lavamoat allowlist populated. Remember to review the changes and commit them."
        );
      } else {
        console.log("Skipping lavamoat allowlist population.");
      }
    } else {
      console.log(
        "All 'keep' packages are already allowed in your lavamoat allowlist."
      );
    }
  } else {
    console.log(
      "Review packages marked as 'check' and update your lavamoat allowlist in package.json."
    );
  }
  if (check.length > 0) {
    const pending = check.filter((pkg) => !cwdPkg.lavamoat.allowScripts[pkg]);
    if (pending.length > 0) {
      console.log(`
You have ${
        pending.length
      } packages identified as 'check' that are not yet allowed.
  ${pending.join(",\n  ")}
Please review these packages and update your 
lavamoat allowlist in package.json as needed.
`);
    }
  }
} else {
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

can-i-ignore-scripts will help populate the allow list if you run it again after that.

`);
}

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
