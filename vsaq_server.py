# Copyright 2016 Google Inc. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Runs a test server for VSAQ."""


import BaseHTTPServer
import cgi
import fnmatch
import os
import os.path
import re
import SimpleHTTPServer
import sys

PORT = 9000
if len(sys.argv) > 1:
  PORT = int(sys.argv[1])

server_address = ("127.0.0.1", PORT)

#./ do.sh testserver generates the file
DEPS_FILE = "build/deps-runfiles.js"
ALL_JSTESTS_FILE = "build/all_tests.js"


class TestServerRequestHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
  """Request handler for VSAQ test server."""

  DIRECTORY_MAP = {
      "/": "build/",
      "/vsaq/": "vsaq/",
      "/vsaq/static/questionnaire/": "vsaq/static/questionnaire/",
      "/javascript/closure/": "third_party/closure-library/closure/goog/",
      "/javascript/vsaq/": "vsaq/",
      "/third_party/closure/":
          "third_party/closure-library/third_party/closure/",
      "/third_party/closure-templates-compiler/":
          "third_party/closure-templates-compiler/",
      "/build/templates/vsaq/static/questionnaire/":
          "build/templates/vsaq/static/questionnaire/",

  }

  def get_test_files(self):
    test_files = []
    for root, _, files in os.walk("vsaq/"):
      for f in fnmatch.filter(files, "*test_dom.html"):
        test_files.append(os.path.join(root, f))
    return test_files

  def generate_all_tests_file(self):
    if os.path.exists(ALL_JSTESTS_FILE):
      return
    with open(ALL_JSTESTS_FILE, "wb") as f:
      f.write("var _allTests=")
      f.write(repr(self.get_test_files()))
      f.write(";")

  def show_tests(self):
    """Lists only vsaq/**/_test.html files."""
    self.send_response(200)
    self.send_header("Content-type", "text/html")
    self.end_headers()
    test_files = self.get_test_files()

    self.wfile.write("<h2>VSAQ test server</h2>")
    self.wfile.write("<h3>Test suite</h3>")
    self.wfile.write("<a href=\"%s\">%s</a>\n" % ("/all_tests.html",
                                                  "all_tests.html"))
    self.wfile.write("<h3>Individual tests</h3>")
    self.wfile.write("<ul>")
    for f in test_files:
      self.wfile.write("<li><a href=\"/%s\">%s</a>\n" % (f, cgi.escape(f)))
    self.wfile.write("</ul>")
    return

  def do_GET(self):
    print self.path
    if self.path == "/tests.html" or self.path == "/tests.html/":
      self.show_tests()
    else:
      SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)

  def translate_path(self, path):
    """Serves files from different directories."""
    # Remove all parameters from filenames.
    path = re.sub(r"\?.*$", "", path)

    if path.endswith("deps-runfiles.js"):
      return DEPS_FILE
    if path == "/" + ALL_JSTESTS_FILE:
      self.generate_all_tests_file()
      return ALL_JSTESTS_FILE
    for prefix, dest_dir in TestServerRequestHandler.DIRECTORY_MAP.items():
      print "checking: " + dest_dir + path[len(prefix):]
      if path.startswith(prefix) and os.path.isfile(
          dest_dir + path[len(prefix):]):
        return dest_dir + path[len(prefix):]
    return "build/index.html"


httpd = BaseHTTPServer.HTTPServer(server_address, TestServerRequestHandler)
print "Starting the VSAQ server at http://%s:%d" % server_address
httpd.serve_forever()
