# Graphify Usage Instructions

This project uses Graphify for local codebase knowledge management and context optimization.

IMPORTANT RULES:

1. Before exploring the codebase, check whether `graphify-out/graph.json` exists.
2. Prefer querying the existing Graphify knowledge graph before reading multiple source files.
3. Use graph queries to understand component relationships, dependencies, services, APIs, database models, and application architecture.
4. Avoid repeatedly reading unrelated files to understand existing functionality.
5. Read actual source files only when implementation details, exact code, or modifications are required.
6. Before making changes, understand the relationships between affected components.
7. After significant architectural changes, update the Graphify knowledge graph.
8. Never treat the knowledge graph as a replacement for source code. Verify critical implementation details against the actual source files.
9. Never include .env files, credentials, API keys, or secrets in generated documentation or graph reports.
10. Prefer concise context retrieval and avoid loading the entire codebase unnecessarily.

The objective is to reduce repeated codebase exploration, minimize unnecessary context consumption, and maintain accurate project knowledge across Claude Code sessions.
