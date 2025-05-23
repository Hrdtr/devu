# Devu Client Application

This directory contains the client-side application for Devu, built with Vue.js and Tauri. It provides the user interface and interacts with the `devu-api` backend.

## Development

To run the Devu client application in development mode:

1.  Ensure the `devu-api` is running. If not, navigate to the `apps/devu-api` directory and run `bun install` followed by `bun run dev`.
2.  Navigate to this directory (`apps/devu`).
3.  Install the dependencies:
    ```bash
    bun install
    ```
4.  Start the development server:
    ```bash
    bun run dev
    ```

This will launch the Devu desktop application.

## Linting and Type Checking

- **Lint:**
  ```bash
  bun run lint
  ```
- **Type Check:**
  ```bash
  bun run typecheck
  ```
