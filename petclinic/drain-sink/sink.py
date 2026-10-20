"""A drain receiver for the delivery test: what does Vercel do when deliveries fail?

Accepts Vercel log drain deliveries (NDJSON or JSON), appends one line per delivery to
/data/deliveries.jsonl (time, status returned, record ids), and answers 500 while the
file /data/fail exists. Requests must carry X-Sink-Key.
"""
import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

KEY = os.environ["SINK_KEY"]
DATA = "/data"


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.headers.get("x-sink-key") != KEY:
            self.send_response(401)
            self.end_headers()
            return
        body = self.rfile.read(int(self.headers.get("content-length", 0))).decode("utf-8", "replace")
        try:
            records = json.loads(body) if body.lstrip().startswith("[") else [json.loads(l) for l in body.splitlines() if l.strip()]
        except ValueError:
            records = []
        status = 500 if os.path.exists(f"{DATA}/fail") else 200
        with open(f"{DATA}/deliveries.jsonl", "a") as out:
            out.write(json.dumps({"at": time.time(), "status": status, "ids": [r.get("id") for r in records],
                                  "timestamps": [r.get("timestamp") for r in records]}) + "\n")
        self.send_response(status)
        self.end_headers()

    def log_message(self, *args):
        pass


ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
