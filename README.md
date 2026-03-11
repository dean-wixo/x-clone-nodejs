# Node.js TypeScript Project

Modern Node.js project setup with TypeScript, ESLint, and Prettier.

## 📁 Project Structure

```
├── src/
│   ├── index.ts         # Main entry point
│   └── type.d.ts        # Global type definitions
├── dist/                # Build output
├── .editorconfig        # Editor configuration
├── .gitignore          # Git ignore rules
├── .prettierrc         # Prettier configuration
├── .prettierignore     # Prettier ignore rules
├── eslint.config.mts   # ESLint configuration
├── nodemon.json        # Nodemon configuration
├── package.json        # Project dependencies
└── tsconfig.json       # TypeScript configuration
```

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Development

Run the project in development mode with hot reload:

```bash
npm run dev
```

### Build

Build TypeScript to JavaScript:

```bash
npm run build
```

### Production

Run the built application:

```bash
npm start
```

## 🔧 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production build
- `npm run lint` - Check code for linting errors
- `npm run lint:fix` - Fix linting errors automatically
- `npm run prettier` - Check code formatting
- `npm run prettier:fix` - Fix formatting issues

## 📦 Tech Stack

- **TypeScript** - Type-safe JavaScript
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **tsx** - Run TypeScript directly
- **tsc-alias** - Resolve path aliases in build
- **rimraf** - Clean build directory
- **nodemon** - Auto-restart on changes

## ⚙️ Configuration

### TypeScript

- **Module**: NodeNext
- **Target**: ES2023
- **Strict mode**: Enabled
- **Path aliases**: `~/*` → `src/*`

### ESLint & Prettier

- Single quotes
- No semicolons
- 2-space indentation
- 120 character line width
- Arrow function parentheses: always

## 📝 Adding Dependencies

For TypeScript projects, remember to install type definitions when needed:

```bash
npm install express
npm install @types/express --save-dev
```

## 🔄 Importing ES Modules

When using ES Module libraries in this CommonJS-based TypeScript project:

```typescript
const formidable = (await import('formidable')).default
```
