/**
 * CLI entry point — the home for corpus and eval commands added in later
 * changes. For now it prints help/version and exits successfully.
 */
const VERSION = '0.1.0';

const HELP = `triage — Triage Memory CLI (v${VERSION})

Usage:
  triage <command> [options]

Commands:
  (none yet)   Corpus and eval commands arrive in later changes.

Options:
  -h, --help       Show this help
  -v, --version    Show version
`;

function run(argv: string[]): number {
  const arg = argv[0];
  if (arg === '-v' || arg === '--version') {
    console.log(VERSION);
    return 0;
  }
  // Default (no args) and --help both print usage.
  console.log(HELP);
  return 0;
}

process.exit(run(process.argv.slice(2)));
