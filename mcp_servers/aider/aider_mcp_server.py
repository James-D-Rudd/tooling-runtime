"""MCP server for controlling Aider.

Aider is the only tool that touches code or git history.
Claude Code plans; Aider executes.
"""

import asyncio
import json
import os
import subprocess
from pathlib import Path

from mcp.server import FastMCP

mcp = FastMCP(name="aider-mcp-server", instructions="Control Aider for code editing, docstrings, and git commits.")

AIDER_BIN = "aider"
WRAPPER_BIN = "aider-tty-wrapper"
WORKING_DIR = Path(os.environ.get("AIDER_WORKING_DIR", os.getcwd()))
CHAT_HISTORY = WORKING_DIR / ".aider.chat.history.md"

BASE_FLAGS = [
    "--no-auto-commits",
    "--yes-always",
    "--no-pretty",
    "--no-stream",
    "--restore-chat-history",
    f"--chat-history-file={CHAT_HISTORY}",
]

DOCTRINGS_PROMPT = (
    "Add docstrings to every function and class in the added files. "
    "Do not change any logic, signatures, or behavior. Only insert docstrings."
)


def _run_aider(extra_args: list[str], message: str) -> str:
    """Run aider through the PTY wrapper and return its output."""
    cmd = [AIDER_BIN, f"--cwd={WORKING_DIR}"] + BASE_FLAGS + extra_args
    payload = json.dumps({"args": cmd, "input": message})
    result = subprocess.run(
        [WRAPPER_BIN], input=payload, capture_output=True, text=True, cwd=WORKING_DIR
    )
    if result.returncode != 0:
        return f"Wrapper exited with code {result.returncode}\nSTDERR:\n{result.stderr}"
    try:
        response = json.loads(result.stdout)
        if response.get("exit_code", 0) != 0:
            return f"Aider exited with code {response['exit_code']}\n{response['output']}"
        return response["output"]
    except (json.JSONDecodeError, KeyError) as e:
        return f"Failed to parse wrapper output: {e}\n{result.stdout}"


@mcp.tool()
def aider_add_files(files: list[str]) -> str:
    """Add files to Aider's editing context so they can be modified."""
    extra = [f"--file={f}" for f in files]
    return _run_aider(extra, "Files added to context. Awaiting instructions.")


@mcp.tool()
def aider_drop_files(files: list[str]) -> str:
    """Remove files from Aider's editing context to free up space."""
    msg = " ".join(f"/drop {f}" for f in files)
    return _run_aider([], msg)


@mcp.tool()
def aider_read_only_files(files: list[str]) -> str:
    """Add files as read-only reference in Aider's context."""
    extra = [f"--read={f}" for f in files]
    return _run_aider(extra, "Files added as read-only reference.")


@mcp.tool()
def aider_run(instruction: str, mode: str = "code") -> str:
    """Send an instruction to Aider.

    Mode 'code' (default): write or modify code.
    Mode 'docstrings': only add docstrings without changing logic.
    """
    if mode == "docstrings":
        full = f"{DOCTRINGS_PROMPT}\n\nSpecific guidance: {instruction}"
    else:
        full = instruction
    return _run_aider([], full)


@mcp.tool()
def aider_commit(message: str) -> str:
    """Commit current Aider changes with the given commit message."""
    return _run_aider(["--commit", f"--commit-prompt={message}"], "commit")


@mcp.tool()
def aider_undo_commit() -> str:
    """Undo the last git commit made by Aider."""
    return _run_aider([], "/undo")


@mcp.tool()
def aider_diff() -> str:
    """Show the current diff of working tree changes."""
    return _run_aider([], "/diff")


@mcp.tool()
def aider_list_files() -> str:
    """List all files Aider knows about and which are in the chat session."""
    return _run_aider([], "/ls")


@mcp.tool()
def aider_git(command: str) -> str:
    """Run an arbitrary git command through Aider."""
    return _run_aider([], f"/git {command}")


@mcp.tool()
def aider_repo_map() -> str:
    """Refresh and return Aider's repository map."""
    return _run_aider([], "/map-refresh")


@mcp.tool()
def aider_clear_session() -> str:
    """Clear Aider's chat history."""
    return _run_aider([], "/clear")


@mcp.tool()
def aider_set_model(model: str) -> str:
    """Switch Aider's main model."""
    return _run_aider([], f"/model {model}")


def main():
    asyncio.run(mcp.run_stdio_async())


if __name__ == "__main__":
    main()
