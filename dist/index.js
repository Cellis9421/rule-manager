#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';
import simpleGit from 'simple-git';
import chalk from 'chalk';
import { execSync } from 'child_process';
import os from 'os';
import { createRequire } from 'module';
import inquirer from 'inquirer';
const require = createRequire(import.meta.url);
const rulerPath = require.resolve('@intellectronica/ruler/dist/cli/index.js');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const program = new Command();
const git = simpleGit();
const AVAILABLE_AGENTS = [
    'cursor',
    'windsurf',
    'claude',
    'copilot',
    'aider',
    'cline',
    'roo',
    'trae',
    'warp',
    'zed',
    'amazonqcli',
    'firebase'
];
/**
 * Helper to get cross-platform exec options
 */
function getExecOptions(options = {}) {
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
async function runRulerApply() {
    const config = await getProjectConfig();
    const agents = config.agents || [];
    if (agents.length === 0) {
        console.log(chalk.yellow('No agents configured. Run "rule-manager target" to select agents.'));
        return;
    }
    console.log(chalk.blue(`Applying rules with @intellectronica/ruler for agents: ${agents.join(', ')}...`));
    try {
        // Run the ruler CLI script directly using node with --agents flag
        const agentsFlag = `--agents ${agents.join(',')}`;
        execSync(`node "${rulerPath}" apply ${agentsFlag}`, getExecOptions());
        // Post-process for Cursor .mdc support if cursor is in agents
        if (agents.includes('cursor')) {
            await postProcessCursorRules();
        }
    }
    catch (e) {
        console.error(chalk.red('Error: Failed to apply rules with @intellectronica/ruler.'));
    }
}
/**
 * Post-processes rules to support Cursor's .mdc format and directory structure
 */
async function postProcessCursorRules() {
    const cursorRulesDir = '.cursor/rules';
    await fs.ensureDir(cursorRulesDir);
    const categories = await fs.readdir(RULER_DIR);
    for (const category of categories) {
        const categoryPath = path.join(RULER_DIR, category);
        if (!(await fs.stat(categoryPath)).isDirectory())
            continue;
        const targetCategoryDir = path.join(cursorRulesDir, `(${category})`);
        await fs.ensureDir(targetCategoryDir);
        const files = await fs.readdir(categoryPath);
        for (const file of files) {
            if (file.endsWith('.mdc') || file.endsWith('.md')) {
                const srcPath = path.join(categoryPath, file);
                const destFile = file.endsWith('.md') ? file.replace('.md', '.mdc') : file;
                const destPath = path.join(targetCategoryDir, destFile);
                await fs.copy(srcPath, destPath);
            }
        }
    }
    console.log(chalk.green('Post-processed rules for Cursor (.mdc structure).'));
}
const REGISTRY_PATH = path.join(__dirname, '../registry.json');
const CONFIG_FILE = '.rulesrc.json';
const RULER_DIR = '.ruler';
async function getRegistry() {
    return fs.readJSON(REGISTRY_PATH);
}
async function getProjectConfig() {
    if (await fs.pathExists(CONFIG_FILE)) {
        return fs.readJSON(CONFIG_FILE);
    }
    return { categories: [] };
}
async function saveProjectConfig(config) {
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
        await saveProjectConfig({ categories: [], agents: ['cursor'] });
        console.log(chalk.green('Initialized .rulesrc.json with default agent: cursor'));
    }
    else {
        console.log(chalk.yellow('Project already initialized.'));
    }
    if (!(await fs.pathExists(RULER_DIR))) {
        await fs.ensureDir(RULER_DIR);
        console.log(chalk.green('Created .ruler directory'));
    }
});
program
    .command('target')
    .description('Configure target AI agents for rule distribution')
    .action(async () => {
    const config = await getProjectConfig();
    const { agents } = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'agents',
            message: 'Select AI agents to target:',
            choices: AVAILABLE_AGENTS.map(agent => ({
                name: agent,
                checked: (config.agents || []).includes(agent)
            }))
        }
    ]);
    config.agents = agents;
    await saveProjectConfig(config);
    console.log(chalk.green(`Target agents updated: ${agents.join(', ')}`));
    if (agents.length > 0) {
        await runRulerApply();
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
    }
    else if (registry.categories[category]) {
        url = registry.categories[category].url;
    }
    else {
        console.error(chalk.red(`Category "${category}" not found in registry.`));
        return;
    }
    const targetDir = path.join(RULER_DIR, category);
    try {
        if (await fs.pathExists(targetDir)) {
            console.log(chalk.yellow(`Category "${category}" already exists. Updating...`));
            const categoryGit = simpleGit(targetDir);
            await categoryGit.pull();
        }
        else {
            console.log(chalk.blue(`Cloning ${category} from ${url}...`));
            await git.clone(url, targetDir);
        }
        const config = await getProjectConfig();
        if (!config.categories.find((c) => c.name === category)) {
            config.categories.push({ name: category, url });
            await saveProjectConfig(config);
        }
        console.log(chalk.green(`Successfully added ${category}.`));
        await runRulerApply();
    }
    catch (error) {
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
        }
        else {
            await git.clone(cat.url, targetDir);
        }
    }
    console.log(chalk.green('All categories synced.'));
    await runRulerApply();
});
program.parse(process.argv);
