from __future__ import annotations

import posixpath
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote


ROOT_DIR = Path(__file__).resolve().parents[1]


class CleanUrlsHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        path = unquote(path.split("?", 1)[0].split("#", 1)[0])
        path = posixpath.normpath(path)
        if path.startswith("/"):
            path = path[1:]

        requested = (ROOT_DIR / path).resolve()

        if path == "" or path.endswith("/"):
            candidate = (ROOT_DIR / path / "index.html").resolve()
            if candidate.exists():
                return str(candidate)

        if requested.exists():
            return str(requested)

        if "." not in Path(path).name:
            candidate = (ROOT_DIR / f"{path}.html").resolve()
            if candidate.exists():
                return str(candidate)

        return str(requested)


def main() -> None:
    port = 8000
    if len(sys.argv) >= 2:
        port = int(sys.argv[1])

    server = ThreadingHTTPServer(("localhost", port), CleanUrlsHandler)
    print(f"Serving {ROOT_DIR} on http://localhost:{port}/", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()

