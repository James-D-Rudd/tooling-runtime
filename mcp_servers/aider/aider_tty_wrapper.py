"""Thin wrapper for aider.

Spawns aider in a pseudo-terminal so it believes it has a real TTY.
Communicates via JSON over stdin/stdout so the MCP server can drive it.

Input JSON (stdin):  {"args": ["aider", "--cwd=..."], "input": "message text"}
Output JSON (stdout): {"output": "captured text", "exit_code": 0}
"""


import pexpect


class AiderTTYWrapper:
    def __init__(self, args=["--model", "ollama/qwen2.5-coder:14b"]):
        self.cmd = "aider"
        self.aider_proc = pexpect.spawn(self.cmd, args=args, encoding="utf-8")
        self.terminating_sequence = r"\u2500+"
        self.in_accept_block = False

    def start(self):
        self.aider_proc.setwinsize(40, 120)
        self.read_output()
        self.terminating_sequence = [r"\u2500+.*>", r"\(Y\)es/\(N\)o"]

    def read_output(self):
        self.aider_proc.expect(self.terminating_sequence)
        output = self.aider_proc.before + self.aider_proc.after

        return output

    def send_command(self, cmd):
        self.aider_proc.sendline(cmd)

