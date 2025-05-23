# Devu API

This directory contains the backend API for the Devu application. It handles data storage, LLM integrations, provides various utility functions, etc.

## Development

To run the Devu API in development mode:

1.  Navigate to this directory (`apps/devu-api`).
2.  Install the dependencies:
    ```bash
    bun install
    ```
3.  Start the development server:
    ```bash
    bun run dev
    ```

The API will be accessible at `http://localhost:3000` (or the port configured).

## Linting and Type Checking

- **Lint:**
  ```bash
  bun run lint
  ```
- **Type Check:**
  ```bash
  bun run typecheck
  ```
