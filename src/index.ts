#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';
import simpleGit from 'simple-git';
import chalk from 'chalk';
import { execSync, ExecSyncOptions } from 'child_process';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const rulerPath = require.resolve('@intellectronica/ruler/dist/cli/index.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();
const git = simpleGit();

/**
 * Helper to get cross-platform exec options
 */
function getExecOptions(options: ExecSyncOptions = {}): ExecSyncOptions {
  const isWindows = os.platform() === 'win32';
  return {
    stdio: 'inherit',
    shell: isWindows ? 'powershell.exe' : '/bin/sh',
    ...options
  };
}

/**
 * Helper to run ruler apply using the bundled dependency
 */
function runRulerApply() {
  console.log(chalk.blue('Applying rules with @intellectronica/ruler...'));
  try {
    // Run the ruler CLI script directly using node
    execSync(`node "${rulerPath}" apply`, getExecOptions());
  } catch (e) {
    console.error(chalk.red('Error: Failed to apply rules with @intellectronica/ruler.'));
  }
}

const REGISTRY_PATH = path.join(__dirname, '../registry.json');
const CONFIG_FILE = '.rulesrc.json';
const RULER_DIR = '.ruler';

interface Registry {
  categories: {
    [key: string]: {
      url: string;
      description: string;
    };
  };
}

async function getRegistry(): Promise<Registry> {
  return fs.readJSON(REGISTRY_PATH);
}

async function getProjectConfig() {
  if (await fs.pathExists(CONFIG_FILE)) {
    return fs.readJSON(CONFIG_FILE);
  }
  return { categories: [] };
}

async function saveProjectConfig(config: any) {
  await fs.writeJSON(CONFIG_FILE, config, { spaces: 2 });
}

program
  .name('rule-manager')
  .description('Modular AI Rules Management CLI')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize rule-manager in the current project')
  .action(async () => {
    if (!(await fs.pathExists(CONFIG_FILE))) {
      await saveProjectConfig({ categories: [] });
      console.log(chalk.green('Initialized .rulesrc.json'));
    } else {
      console.log(chalk.yellow('Project already initialized.'));
    }
    
    if (!(await fs.pathExists(RULER_DIR))) {
      await fs.ensureDir(RULER_DIR);
      console.log(chalk.green('Created .ruler directory'));
    }
  });

program
  .command('list')
  .description('List available rule categories')
  .action(async () => {
    const registry = await getRegistry();
    console.log(chalk.blue('\nAvailable Categories:'));
    for (const [name, info] of Object.entries(registry.categories)) {
      console.log(`${chalk.bold(name)}: ${info.description}`);
    }
    console.log(chalk.gray('\nUse "rule-manager add <category>" to include a category.'));
  });

program
  .command('add <category>')
  .description('Add a rule category to the project')
  .option('-p, --private <url>', 'Add a private repository URL')
  .action(async (category, options) => {
    const registry = await getRegistry();
    let url = '';
    
    if (options.private) {
      url = options.private;
    } else if (registry.categories[category]) {
      url = registry.categories[category].url;
    } else {
      console.error(chalk.red(`Category "${category}" not found in registry.`));
      return;
    }

    const targetDir = path.join(RULER_DIR, category);
    
    try {
      if (await fs.pathExists(targetDir)) {
        console.log(chalk.yellow(`Category "${category}" already exists. Updating...`));
        const categoryGit = simpleGit(targetDir);
        await categoryGit.pull();
      } else {
        console.log(chalk.blue(`Cloning ${category} from ${url}...`));
        await git.clone(url, targetDir);
      }

      const config = await getProjectConfig();
      if (!config.categories.find((c: any) => c.name === category)) {
        config.categories.push({ name: category, url });
        await saveProjectConfig(config);
      }

      console.log(chalk.green(`Successfully added ${category}.`));
      
      runRulerApply();
      
    } catch (error) {
      console.error(chalk.red(`Error adding category: ${error}`));
    }
  });

program
  .command('sync')
  .description('Sync all enabled rule categories')
  .action(async () => {
    const config = await getProjectConfig();
    if (config.categories.length === 0) {
      console.log(chalk.yellow('No categories added yet. Use "rule-manager add <category>".'));
      return;
    }

    for (const cat of config.categories) {
      console.log(chalk.blue(`Syncing ${cat.name}...`));
      const targetDir = path.join(RULER_DIR, cat.name);
      if (await fs.pathExists(targetDir)) {
        const categoryGit = simpleGit(targetDir);
        await categoryGit.pull();
      } else {
        await git.clone(cat.url, targetDir);
      }
    }

    console.log(chalk.green('All categories synced.'));
    runRulerApply();
  });

program.parse(process.argv);
