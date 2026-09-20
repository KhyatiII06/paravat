from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os
os.chdir(Path(__file__).resolve().parent)
print('PARVAT frontend: http://127.0.0.1:5500')
ThreadingHTTPServer(('127.0.0.1',5500),SimpleHTTPRequestHandler).serve_forever()
