"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const simple_git_1 = __importDefault(require("simple-git"));
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
const program = new commander_1.Command();
const git = (0, simple_git_1.default)();
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
        await saveProjectConfig({ categories: [] });
        console.log(chalk_1.default.green('Initialized .rulesrc.json'));
    }
    else {
        console.log(chalk_1.default.yellow('Project already initialized.'));
    }
    if (!(await fs.pathExists(RULER_DIR))) {
        await fs.ensureDir(RULER_DIR);
        console.log(chalk_1.default.green('Created .ruler directory'));
    }
});
program
    .command('list')
    .description('List available rule categories')
    .action(async () => {
    const registry = await getRegistry();
    console.log(chalk_1.default.blue('\nAvailable Categories:'));
    for (const [name, info] of Object.entries(registry.categories)) {
        console.log(`${chalk_1.default.bold(name)}: ${info.description}`);
    }
    console.log(chalk_1.default.gray('\nUse "rule-manager add <category>" to include a category.'));
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
        console.error(chalk_1.default.red(`Category "${category}" not found in registry.`));
        return;
    }
    const targetDir = path.join(RULER_DIR, category);
    try {
        if (await fs.pathExists(targetDir)) {
            console.log(chalk_1.default.yellow(`Category "${category}" already exists. Updating...`));
            const categoryGit = (0, simple_git_1.default)(targetDir);
            await categoryGit.pull();
        }
        else {
            console.log(chalk_1.default.blue(`Cloning ${category} from ${url}...`));
            await git.clone(url, targetDir);
        }
        const config = await getProjectConfig();
        if (!config.categories.find((c) => c.name === category)) {
            config.categories.push({ name: category, url });
            await saveProjectConfig(config);
        }
        console.log(chalk_1.default.green(`Successfully added ${category}.`));
        // Run ruler apply
        console.log(chalk_1.default.blue('Applying rules with @intellectronica/ruler...'));
        try {
            (0, child_process_1.execSync)('npx @intellectronica/ruler apply', { stdio: 'inherit' });
        }
        catch (e) {
            console.warn(chalk_1.default.yellow('Note: ruler apply failed. Make sure @intellectronica/ruler is installed or run it manually.'));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red(`Error adding category: ${error}`));
    }
});
program
    .command('sync')
    .description('Sync all enabled rule categories')
    .action(async () => {
    const config = await getProjectConfig();
    if (config.categories.length === 0) {
        console.log(chalk_1.default.yellow('No categories added yet. Use "rule-manager add <category>".'));
        return;
    }
    for (const cat of config.categories) {
        console.log(chalk_1.default.blue(`Syncing ${cat.name}...`));
        const targetDir = path.join(RULER_DIR, cat.name);
        if (await fs.pathExists(targetDir)) {
            const categoryGit = (0, simple_git_1.default)(targetDir);
            await categoryGit.pull();
        }
        else {
            await git.clone(cat.url, targetDir);
        }
    }
    console.log(chalk_1.default.green('All categories synced.'));
    console.log(chalk_1.default.blue('Applying rules with @intellectronica/ruler...'));
    try {
        (0, child_process_1.execSync)('npx @intellectronica/ruler apply', { stdio: 'inherit' });
    }
    catch (e) {
        console.warn(chalk_1.default.yellow('Note: ruler apply failed.'));
    }
});
program.parse(process.argv);
//# sourceMappingURL=index.js.map