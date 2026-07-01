"""Thin wrapper for aider.

Spawns aider in a pseudo-terminal so it believes it has a real TTY.
Communicates via JSON over stdin/stdout so the MCP server can drive it.

Input JSON (stdin):  {"args": ["aider", "--cwd=..."], "input": "message text"}
Output JSON (stdout): {"output": "captured text", "exit_code": 0}
"""


import pexpect


class AiderTTYWrapper:
    def __init__(self, args = []):
        self.cmd = args.insert(0, "aider")
        self.aider_proc = pexpect.spawn(self.cmd, encoding="utf-8")
        self.aider_proc.setwinsize(40, 120)  
        self.aider_proc.timeout = 0
        self.terminating_sequence = [r"\u2500+", r"(Y)es/(N)o"]

        self.read_output()

    def read_output(self):
        idx = self.aider_proc.expect(self.terminating_sequence)
        if idx == 0:
            output = self.aider_proc.before
        elif idx == 1:
            output = self.aider_proc.before + self.aider_proc.match + self.aider_proc.after


        return output

    def send_command(self, cmd):
        aider_proc.sendline(cmd)

