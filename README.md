# Backlog Intelligence

**Transform meetings into high-quality Product Backlogs with AI**

## 🎯 Vision
An intelligent system that transforms Scrum meetings into structured, high-quality Product Backlog Items with built-in quality assurance, context enrichment, and stakeholder intelligence.

## 🚀 Key Differentiators
1. **Domain-Specific** - Built for Agile/Scrum workflows
2. **Quality Built-In** - Confidence scoring prevents incomplete requirements
3. **Actionable** - Generates questions, proposals, finds similar work
4. **Integrated** - Works with Fireflies, Jira, DevOps, Confluence
5. **Learning System** - Gets smarter with your history

## 📁 Project Structure
```
backlog-intelligence/
├── docs/               # Complete functional documentation
│   ├── proof-of-concept.md    # Full POC walkthrough
│   ├── features/              # Core + real-time features
│   ├── business/              # Market + GTM strategy
│   └── technical/             # Tech stack + architecture
├── config/             # Example configurations
│   ├── workflows/      # Event workflows
│   ├── adapters/       # Output adapters
│   └── stakeholders.yaml
└── examples/           # Sample outputs
```

## 🎭 See It In Action
Check out [docs/proof-of-concept.md](docs/proof-of-concept.md) for a complete walkthrough of a fictional refinement meeting being processed through the entire system.

## 💰 Business Model
- **Starter**: €49/mo (1 team, 50 meetings)
- **Pro**: €149/mo (3 teams, 200 meetings)
- **Business**: €499/mo (unlimited)
- **Enterprise**: Custom (on-prem, SSO)

## 🛠️ Tech Stack
- **Language**: TypeScript
- **LLM**: Anthropic Claude
- **Integrations**: Fireflies, Azure DevOps, Confluence, Obsidian
- **Interface**: CLI (MVP) → Web App (V1)

## 📦 Installation

### Prerequisites
- Node.js >= 18.0.0
- npm >= 8.0.0
- At least one AI provider API key (Anthropic Claude, OpenAI, or Google Gemini)

### Global Installation
```bash
npm install -g backlog-chef
```

### Development Installation
```bash
# Clone the repository
git clone https://github.com/ApexChef/backlog-chef.git
cd backlog-chef

# Install dependencies
npm install

# Build the project
npm run build

# Link for local development testing
npm link
```

## 🎮 Usage

### Basic Usage
```bash
# Process a meeting transcript
backlog-chef process meeting.txt

# Process JSON format
backlog-chef process fireflies-export.json

# Process XML format
backlog-chef process transcript.xml
```

### Advanced Options
```bash
# Specify output format
backlog-chef process meeting.txt --format obsidian

# Custom output directory
backlog-chef process meeting.txt --output ./my-pbis

# Enable verbose logging for debugging
backlog-chef process meeting.txt --verbose

# Combine options
backlog-chef process meeting.txt --format confluence --output ./confluence-pbis --verbose
```

### Available Flags
- `-f, --format <type>`: Output format (devops, obsidian, confluence) - default: devops
- `-o, --output <path>`: Custom output directory - default: ./output
- `-v, --verbose`: Enable detailed logging for troubleshooting

### Get Help
```bash
# Show all commands
backlog-chef --help

# Show help for specific command
backlog-chef process --help
```

## 🔧 Development

### Testing with npm link

**What is `npm link`?**
`npm link` creates a symlink from your global npm directory to your local development folder. This lets you test the CLI as if it were globally installed without actually publishing to npm.

**How to use it:**
```bash
# 1. In the backlog-chef directory
npm link

# 2. Now you can use the CLI anywhere
cd /path/to/your/test/project
backlog-chef process your-transcript.txt

# 3. To unlink when done
npm unlink -g backlog-chef
```

**Why use npm link?**
- Test CLI behavior exactly as end users will experience it
- Verify bin configuration works correctly
- Test the CLI in different directories
- No need to publish to npm registry for testing

### Development Scripts
```bash
# Build TypeScript
npm run build

# Run in development mode (legacy)
npm start [path/to/input.txt]

# Clean build artifacts
npm clean
```

## 🚦 Roadmap
- **MVP (1-3mo)**: CLI, basic extraction, DevOps output
- **V1 (3-6mo)**: Web UI, real-time, multi-screen views
- **V2 (6-12mo)**: Platform, marketplace, enterprise features

## 👥 Creator
Created by: Alwin (ApexChef)
- Salesforce/Apex Developer
- Former Kitchen Chef
- Process & Automation Expert

---

📚 **Documentation**: [docs/](docs/)  
⚙️ **Configuration**: [config/](config/)  
📝 **License**: TBD
