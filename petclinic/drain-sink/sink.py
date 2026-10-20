"""A drain receiver for the delivery test: what does Vercel do when deliveries fail?

Accepts Vercel log drain deliveries (NDJSON or JSON), appends one line per delivery to
/data/deliveries.jsonl (time, status returned, record ids, sizes, encoding, whether the
x-vercel-signature HMAC-SHA1 matches DRAIN_SECRET), and answers 500 while the
file /data/fail exists. ?fail=on / ?fail=off switches that mode. Requests must carry
X-Sink-Key.
"""
import gzip
import hashlib
import hmac
import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

KEY = os.environ["SINK_KEY"]
SECRET = os.environ.get("DRAIN_SECRET", "").encode()
DATA = "/data"


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.headers.get("x-sink-key") != KEY:
            self.send_response(401)
            self.end_headers()
            return
        mode = parse_qs(urlparse(self.path).query).get("fail", [None])[0]
        if mode in ("on", "off"):
            if mode == "on":
                open(f"{DATA}/fail", "w").close()
            elif os.path.exists(f"{DATA}/fail"):
                os.remove(f"{DATA}/fail")
            self.send_response(204)
            self.end_headers()
            return
        wire = self.rfile.read(int(self.headers.get("content-length", 0)))
        encoding = self.headers.get("content-encoding", "")
        raw = gzip.decompress(wire) if encoding == "gzip" else wire
        body = raw.decode("utf-8", "replace")
        signature = self.headers.get("x-vercel-signature", "")
        sig_wire = hmac.new(SECRET, wire, hashlib.sha1).hexdigest() if SECRET else ""
        sig_raw = hmac.new(SECRET, raw, hashlib.sha1).hexdigest() if SECRET else ""
        try:
            records = json.loads(body) if body.lstrip().startswith("[") else [json.loads(l) for l in body.splitlines() if l.strip()]
        except ValueError:
            records = []
        status = 500 if os.path.exists(f"{DATA}/fail") else 200
        with open(f"{DATA}/deliveries.jsonl", "a") as out:
            out.write(json.dumps({"at": time.time(), "status": status, "ids": [r.get("id") for r in records],
                                  "timestamps": [r.get("timestamp") for r in records],
                                  "wire_bytes": len(wire), "body_bytes": len(raw), "encoding": encoding,
                                  "content_type": self.headers.get("content-type", ""),
                                  "record_json_bytes": [len(json.dumps(r, separators=(",", ":"))) for r in records],
                                  "signature": "none" if not signature else
                                  "wire" if hmac.compare_digest(signature, sig_wire) else
                                  "body" if hmac.compare_digest(signature, sig_raw) else "mismatch"}) + "\n")
        self.send_response(status)
        self.end_headers()

    def log_message(self, *args):
        pass


ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
