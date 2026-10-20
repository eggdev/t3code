"""Tests for clyde-sandbox-exec. Run: python3 clyde/sandbox/test_clyde_sandbox_exec.py"""
import base64
import importlib.machinery
import importlib.util
import json
import os
import tempfile
import unittest
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
_loader = importlib.machinery.SourceFileLoader("clyde_sandbox_exec", os.path.join(HERE, "clyde-sandbox-exec"))
_spec = importlib.util.spec_from_loader("clyde_sandbox_exec", _loader)
exec_script = importlib.util.module_from_spec(_spec)
_loader.exec_module(exec_script)


def encode(payload):
    return "run " + base64.b64encode(json.dumps(payload).encode()).decode()


class Refused(Exception):
    pass


class ExecScriptTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = os.path.realpath(self.tmp.name)
        self.root = os.path.join(root, "worktrees")
        self.project = os.path.join(self.root, "proj")
        self.worktree = os.path.join(self.project, "branch")
        os.makedirs(os.path.join(self.project, ".git", "info"))
        os.makedirs(self.worktree)
        patches = [
            mock.patch.object(exec_script, "WORKTREE_ROOT", self.root),
            mock.patch.object(exec_script, "HOME_ROOT", os.path.join(root, "homes")),
            mock.patch.object(exec_script, "refuse", side_effect=Refused),
        ]
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)
        self.addCleanup(self.tmp.cleanup)

    def run_main(self, payload):
        with mock.patch.dict(os.environ, {"SSH_ORIGINAL_COMMAND": encode(payload)}), mock.patch.object(
            exec_script.os, "execvp"
        ) as execvp:
            exec_script.main()
        return execvp.call_args.args[1]

    def env_of(self, docker):
        return [docker[i + 1] for i, arg in enumerate(docker) if arg == "-e"]

    def test_claude_gets_its_home_cwd_and_allowed_env(self):
        docker = self.run_main(
            {
                "dir": self.project,
                "cwd": self.worktree,
                "command": "claude",
                "args": ["--output-format", "stream-json"],
                "env": {"CLAUDE_CODE_ENTRYPOINT": "sdk-ts", "CLAUDE_AGENT_SDK_VERSION": "0.3.276"},
            }
        )
        home = os.path.join(self.project, ".clyde", "claude-home")
        env = self.env_of(docker)
        self.assertIn(f"CLAUDE_CONFIG_DIR={home}", env)
        self.assertIn("CLAUDE_CODE_ENTRYPOINT=sdk-ts", env)
        self.assertIn("CLAUDE_AGENT_SDK_VERSION=0.3.276", env)
        self.assertIn("ANTHROPIC_AUTH_TOKEN=clyde-gateway-placeholder", env)
        self.assertEqual(docker[docker.index("-w") + 1], self.worktree)
        self.assertEqual(docker[-3:], ["claude", "--output-format", "stream-json"])
        self.assertTrue(os.path.isdir(home))
        with open(os.path.join(self.project, ".git", "info", "exclude")) as file:
            self.assertEqual(file.read(), "/.clyde/\n")
        # A second run does not add the exclude line again.
        self.run_main({"dir": self.project, "command": "claude", "args": []})
        with open(os.path.join(self.project, ".git", "info", "exclude")) as file:
            self.assertEqual(file.read(), "/.clyde/\n")

    def test_codex_keeps_its_old_payload(self):
        docker = self.run_main({"dir": self.project, "command": "codex", "args": ["app-server"]})
        self.assertEqual(docker[docker.index("-w") + 1], self.project)
        self.assertFalse(any(arg.startswith("CLAUDE_CONFIG_DIR=") for arg in self.env_of(docker)))
        self.assertEqual(docker[docker.index("codex") + 1], "app-server")

    def test_refuses_reserved_and_bad_env_names(self):
        for name in [
            "HOME",
            "PATH",
            "HTTP_PROXY",
            "HTTPS_PROXY",
            "NO_PROXY",
            "ANTHROPIC_BASE_URL",
            "ANTHROPIC_AUTH_TOKEN",
            "ANTHROPIC_API_KEY",
            "CLAUDE_CODE_OAUTH_TOKEN",
            "CLAUDE_CONFIG_DIR",
            "LD_PRELOAD",
            "NODE_OPTIONS",
            "GH_TOKEN",
            "MY_SECRET",
            "lower_case",
            "1ABC",
            "A-B",
        ]:
            with self.subTest(name=name), self.assertRaises(Refused):
                self.run_main({"dir": self.project, "command": "claude", "args": [], "env": {name: "x"}})

    def test_refuses_bad_env_values_and_shapes(self):
        for env in [[], {"CLAUDE_CODE_ENTRYPOINT": 1}, {"CLAUDE_CODE_ENTRYPOINT": "x" * 5000}]:
            with self.subTest(env=env), self.assertRaises(Refused):
                self.run_main({"dir": self.project, "command": "claude", "args": [], "env": env})

    def test_refuses_a_cwd_outside_dir(self):
        other = os.path.join(self.root, "other")
        os.makedirs(other)
        for cwd in [other, self.root, os.path.join(self.project, "missing")]:
            with self.subTest(cwd=cwd), self.assertRaises(Refused):
                self.run_main({"dir": self.project, "cwd": cwd, "command": "claude", "args": []})

    def test_refuses_a_linked_claude_home(self):
        os.symlink(self.root, os.path.join(self.project, ".clyde"))
        with self.assertRaises(Refused):
            self.run_main({"dir": self.project, "command": "claude", "args": []})


if __name__ == "__main__":
    unittest.main()
