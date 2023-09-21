#!/usr/bin/env node
import { Command } from "commander";
import inquirer from "inquirer";
import Watcher from "watcher";
import chalk from "chalk";
import path from "path";
import Table from "cli-table3";
import {
  readFile,
  access,
  constants,
  writeFile,
  readdir,
} from "node:fs/promises";

import { URL } from "node:url";
const { default: pkg } = await import("./package.json", {
  assert: { type: "json" },
});

process.removeAllListeners("warning");

const defaultConfigName = "./protopie-watcher.json";

const program = new Command();

program.name("protopie-watcher");
program.version(pkg.version);
program.description(pkg.description);

program.option("-c, --config <file>", "config file to use", defaultConfigName);
program.option(
  "-d, --debounce <debounce>",
  "(in ms) how long do we wait until a change gets uploaded again?",
  2000
);
program.option("-u, --upload-on-start", "upload all pies when starting");

program.parse();

const configpath = program.opts().config;

try {
  await access(configpath, constants.R_OK);
} catch (err) {
  console.error(chalk.red(`Could not open config file at ${configpath}`));
  const { shouldCreateExample, shouldScan } = await inquirer.prompt([
    {
      type: "confirm",
      name: "shouldCreateExample",
      message: "Should we create an example file with that file name?",
    },
    {
      type: "confirm",
      name: "shouldScan",
      message: "Should we scan for pie files in the current folder?",
      when(answers) {
        return answers.shouldCreateExample;
      },
    },
  ]);
  if (shouldCreateExample) {
    const example = JSON.parse(await readFile("./example.json", "utf8"));

    if (shouldScan) {
      const files = await readdir(process.cwd());
      const pieFiles = files.filter((el) => path.extname(el) === ".pie");
      example.pies = pieFiles.map((filepath) => ({ filepath, pieId: "" }));
    }
    await writeFile(defaultConfigName, JSON.stringify(example, null, 4));

    console.log(`Created new file ${chalk.green(defaultConfigName)}`);
  }
  process.exit();
}

const config = JSON.parse(await readFile(configpath, "utf8"));

// show overview
//
console.log(chalk.bgBlue.bold("  Watching:  "));
var table = new Table({
  head: ["Pie ID", "Path"],
  colWidths: [10, 80],
});
config.pies.forEach(({ pieId, filepath }) =>
  table.push([pieId, path.basename(filepath)])
);
console.log(table.toString() + "\n");

// upload pies on start?
//

if (program.opts().uploadOnStart) {
  config.pies.forEach(uploadPie);
}

// start watchers
//
const paths = config.pies.map(({ filepath }) => filepath);
const watcher = new Watcher(paths, { debounce: 2000 });
watcher.on("change", detectedChange);

async function uploadPie({ filepath, pieId }) {
  try {
    const filename = path.basename(filepath);
    console.log(chalk.dim("Building form data..."));
    const body = new FormData();
    const blob = new Blob([await readFile(filepath)]);

    body.set("pieId", parseInt(pieId));
    body.set("file", blob, filename);
    body.set("filepath", filename);

    const protocol = "http://";
    const url = new URL(protocol + config.hostname);

    url.port = config.port;
    url.pathname = config.basepath;

    console.log(chalk.dim("POSTing to " + url.toString()));

    const resp = await fetch(url, {
      method: "POST",
      body,
    });

    if (resp.status == 200) {
      process.stdout.write("\u0007");
    } else {
      process.stdout.write("\u0007\u0007\u0007");
    }
    const response = await resp.json();
    console.log(chalk.green(response.message));

    const responseId = response.data.pieId;
    if (responseId !== pieId) {
      console.log(
        chalk.bgYellow(`  Detected new pieId ${responseId} (old: ${pieId})  `)
      );
      console.log(`Updating config and saving...`);
      config.pies = pies.map((p) => {
        if (p.filepath == filepath) {
          p.pieId = responseId;
        }
        return p;
      });
      await writeFile(program.opts().config, config);
      console.log(`Saved`);
    }
  } catch (err) {
    console.error(chalk.red(err.message));
    return;
  }
}

async function detectedChange(filepath) {
  console.log(
    chalk.bgWhite(
      "  " +
        new Date()
          .toISOString()
          .replace(/T/, " ") // replace T with a space
          .replace(/\..+/, "") +
        "  "
    )
  );
  const pie = pies.find((current) => current.filepath == filepath);
  const filename = path.basename(pie.filepath);
  console.log(
    chalk.dim("Detected changes in ") +
      filename +
      chalk.dim(" with id ") +
      pie.pieId
  );

  uploadPie(pie);

  console.log("\n");
}
