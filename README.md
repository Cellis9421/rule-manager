# Rule Manager (rulem)

A modular AI rules management CLI that allows you to treat your coding standards and instructions as version-controlled dependencies. 

`rulem` lets you subscribe to specific "rule categories" (GitHub repositories) and automatically distributes them to all your favorite AI coding agents (Cursor, Windsurf, Claude Code, GitHub Copilot, and more).

## Features

- **Modular Architecture**: Keep your rules organized in separate GitHub repositories (e.g., `rules-react`, `rules-git`).
- **Agent Agnostic**: Powered by `@intellectronica/ruler`, supporting 30+ AI agents out of the box.
- **Cursor Optimized**: Automatically handles `.mdc` file conversion and maintains a clean `(category)/rule.mdc` directory structure for Cursor.
- **Private Repo Support**: Easily include your own private business logic rules alongside public community rules.
- **Selective Sync**: Choose exactly which rules apply to which project.

## Installation

Currently, `rulem` is available via GitHub. To install it globally:

```bash
git clone https://github.com/Cellis9421/rule-manager.git
cd rule-manager
npm install
npm run build
npm link
```

You can now use either `rule-manager` or the alias `rulem`.

## Commands

### `rulem init`
Initializes the current project for rule management. Creates a `.ruler/` directory and a `.rulesrc.json` configuration file.

### `rulem list`
Lists all available rule categories defined in the central registry.

### `rulem target`
Interactive command to select which AI agents you want to distribute rules to.
- Supported agents include: `cursor`, `windsurf`, `claude`, `copilot`, `aider`, `cline`, `roo`, `trae`, `warp`, `zed`, and more.

### `rulem add <category>`
Adds a rule category to your project.
- **Public**: `rulem add react`
- **Private**: `rulem add my-private-rules --private https://github.com/user/repo.git`

### `rulem sync`
The primary workflow command. It:
1. Performs a `git pull` on all enabled rule categories in `.ruler/`.
2. Distributes rules to agent-specific files (e.g., `CLAUDE.md`, `AGENTS.md`).
3. Post-processes rules for Cursor into `.cursor/rules/(category)/*.mdc`.

## Workflows

### Setting up a New Project
```bash
# 1. Initialize
rulem init

# 2. Select your agents (e.g., Cursor and Claude)
rulem target

# 3. Add the rules you need
rulem add generic
rulem add react
rulem add git

# 4. Rules are now active in .cursor/rules/ and CLAUDE.md!
```

### Updating Rules Globally
If you improve a rule in your `rules-react` repository:
1. Commit and push the change to your GitHub repo.
2. In any project using those rules, run:
   ```bash
   rulem sync
   ```
3. The latest standards are now applied to that project.

### Managing Private Business Logic
For company-specific rules that shouldn't be public:
```bash
rulem add internal-logic --private https://github.com/your-org/private-rules.git
```
`rulem` will handle the cloning and syncing of these rules just like public ones.

## How it Works

`rulem` acts as a management layer on top of the `.ruler` directory. It uses `git` to manage the rule files and `@intellectronica/ruler` to handle the complex concatenation and distribution logic required by different AI agents. For Cursor users, it adds an additional layer of organization by mirroring the category structure into the `.cursor/rules` folder.

---

Created by [Cellis9421](https://github.com/Cellis9421)
