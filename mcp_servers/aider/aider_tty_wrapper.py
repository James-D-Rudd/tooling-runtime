"""Thin wrapper for aider.

Spawns aider in a pseudo-terminal so it believes it has a real TTY.
Communicates via JSON over stdin/stdout so the MCP server can drive it.

Input JSON (stdin):  {"args": ["aider", "--cwd=..."], "input": "message text"}
Output JSON (stdout): {"output": "captured text", "exit_code": 0}
"""


import pexpect
import pyte
import re
import reprlib


class AiderTTYWrapper:
    def __init__(self, args=["--model", "ollama/qwen2.5-coder:14b"]):
        self.cmd = "aider"
        self.aider_proc = pexpect.spawn(self.cmd, args=args, encoding="utf-8")
        self.terminating_sequence = r"\u2500+"
        self.in_accept_block = False
        self.previous_output = ""
        self.screen_height = 40
        self.screen_width = 120

    def sanitize_output(self, output):
        proxy_infinity = 10000

        screen = pyte.HistoryScreen(lines=self.screen_height, columns=self.screen_width, history=proxy_infinity)
        stream = pyte.Stream(screen)
        stream.feed(output)

        return "\n".join(line.rstrip() for line in screen.display).rstrip()

    def start(self):
        self.aider_proc.setwinsize(rows=self.screen_height, cols=self.screen_width)
        self.aider_proc.timeout = None
        self.previous_output = self.read_output()
        self.terminating_sequence = [r"\u2500+.*>", r"\(Y\)es/\(N\)o"]

    def no_duplicate_output(self, new_output):
        sanitized = self.sanitize_output(new_output)
        if sanitized in self.previous_output and not len(sanitized) == 0:
            print("in")
            sanitized = self.read_output()

        print("through")
        self.previous_output = sanitized
        
        return sanitized

    def read_output(self):
        print("waiting on sequence")
        idx = self.aider_proc.expect(self.terminating_sequence)

        if idx == 0:
            print("first output")
            output = self.aider_proc.before
        else:
            print("second output")
            output = self.aider_proc.before + self.aider_proc.after

        return self.no_duplicate_output(output)

    def send_command(self, cmd):
        self.aider_proc.sendline(cmd)

