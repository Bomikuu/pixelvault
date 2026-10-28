#!/usr/bin/env python3
"""Start/stop only this repository's local development processes; no builds."""

import argparse
import json
import os
import signal
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RUNTIME = ROOT / ".runtime"


def identity(pid):
    try:
        return Path(f"/proc/{pid}/stat").read_text().split()[21]
    except (OSError, IndexError):
        return None


def stop():
    file = RUNTIME / "processes.json"
    if not file.exists():
        print("PixelVault development processes are not recorded.")
        return
    for process in json.loads(file.read_text()):
        if process.get("identity") and identity(process["pid"]) == process["identity"]:
            try:
                os.killpg(process["pid"], signal.SIGTERM)
            except ProcessLookupError:
                pass
    file.unlink(missing_ok=True)
    print("PixelVault API, web and worker processes stopped. PostgreSQL data was preserved.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stop", action="store_true")
    parser.add_argument(
        "--seed", action="store_true", help="Create fictional test fixtures if absent"
    )
    options = parser.parse_args()
    if options.stop:
        stop()
        return
    RUNTIME.mkdir(exist_ok=True)
    record = RUNTIME / "processes.json"
    if record.exists() and any(
        p.get("identity") and identity(p["pid"]) == p["identity"]
        for p in json.loads(record.read_text())
    ):
        print("PixelVault is already running at http://127.0.0.1:5178")
        return
    subprocess.run(["docker", "compose", "up", "-d", "postgres", "redis"], cwd=ROOT, check=True)
    for _ in range(30):
        result = subprocess.run(
            ["docker", "compose", "exec", "-T", "postgres", "pg_isready", "-U", "pixelvault"],
            cwd=ROOT,
            capture_output=True,
        )
        if result.returncode == 0:
            break
        time.sleep(0.5)
    else:
        raise SystemExit("PostgreSQL did not become ready; inspect docker compose logs postgres.")
    subprocess.run(
        ["uv", "run", "python", "apps/api/manage.py", "migrate", "--noinput"], cwd=ROOT, check=True
    )
    if options.seed:
        subprocess.run(
            ["uv", "run", "python", "apps/api/manage.py", "seed_demo"], cwd=ROOT, check=True
        )
    processes = []
    handles = []
    environment = os.environ.copy()
    environment["PYTHONPATH"] = str(ROOT / "apps/api")
    for name, command in [
        (
            "api",
            [
                "uv",
                "run",
                "python",
                "apps/api/manage.py",
                "runserver",
                "127.0.0.1:8008",
                "--noreload",
            ],
        ),
        ("web", ["npm", "run", "dev", "--", "--host", "127.0.0.1"]),
        (
            "worker",
            [
                "uv",
                "run",
                "celery",
                "-A",
                "config.celery:app",
                "worker",
                "--loglevel=warning",
                "--pool=solo",
                "--without-gossip",
                "--without-mingle",
            ],
        ),
        (
            "scheduler",
            [
                "uv",
                "run",
                "celery",
                "-A",
                "config.celery:app",
                "beat",
                "--loglevel=warning",
                "--schedule",
                str(RUNTIME / "celerybeat"),
            ],
        ),
    ]:
        with (RUNTIME / f"{name}.log").open("ab") as log:
            process = subprocess.Popen(
                command,
                cwd=ROOT,
                env=environment,
                stdout=log,
                stderr=subprocess.STDOUT,
                start_new_session=True,
            )
        handles.append((name, process))
        processes.append({"name": name, "pid": process.pid, "identity": identity(process.pid)})
    record.write_text(json.dumps(processes))
    time.sleep(2)
    failed = [name for name, process in handles if process.poll() is not None]
    if failed:
        stop()
        raise SystemExit(f"Startup failed: {', '.join(failed)}. Inspect the .runtime logs.")
    print("PixelVault web: http://127.0.0.1:5178")
    print("PixelVault API: http://127.0.0.1:8008")
    print("Logs: .runtime/{api,web,worker,scheduler}.log. Stop: python3 scripts/dev.py --stop")


if __name__ == "__main__":
    main()
