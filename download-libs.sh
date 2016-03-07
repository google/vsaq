#!/usr/bin/env bash
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
#
# @fileoverview Shell script to download VSAQ build dependencies
#

export JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF8
THIRD_PARTY_DIRECTORY="third_party"

type ant >/dev/null 2>&1 || {
  echo >&2 "Ant is required to build VSAQ dependencies."
  exit 1
}
type javac >/dev/null 2>&1 || {
  echo >&2 "Java compiler is required to build VSAQ dependencies."
  exit 1
}
type git >/dev/null 2>&1 || {
  echo >&2 "Git is required to build VSAQ dependencies."
  exit 1
}
type curl >/dev/null 2>&1 || {
  echo >&2 "Curl is required to build VSAQ dependencies."
  exit 1
}
type unzip >/dev/null 2>&1 || {
  echo >&2 "Unzip is required to build VSAQ dependencies."
  exit 1
}
jversion=$(java -version 2>&1 | grep version | awk -F '"' '{print $2}')
if [[ $jversion < "1.7" ]]; then
  echo "Java 1.7 or higher is required to build VSAQ."
  exit 1
fi

if [ ! -d .git ]; then
  git init
fi

if [ ! -d $THIRD_PARTY_DIRECTORY ]; then
  mkdir $THIRD_PARTY_DIRECTORY
fi
cd $THIRD_PARTY_DIRECTORY

git submodule add -f https://github.com/google/closure-compiler closure-compiler
git submodule add -f https://github.com/google/closure-library closure-library
git submodule add -f https://github.com/google/closure-stylesheets closure-stylesheets
git submodule add -f https://github.com/jleyba/js-dossier js-dossier

git submodule init
git submodule update

# Pin submodules to particular commits
cd closure-compiler
git checkout -b 59b42c9fc8fc752b3ff3aabe04ad89a96f9a7bf7 59b42c9fc8fc752b3ff3aabe04ad89a96f9a7bf7
cd ..
cd closure-library
git checkout -b dc369cde87d7ef6dfb46d3b873f872ebee7d07cd dc369cde87d7ef6dfb46d3b873f872ebee7d07cd
cd ..
cd js-dossier
git checkout -b 6f2d09ee26925b7417f9f6bd1547dffe700ab60f 6f2d09ee26925b7417f9f6bd1547dffe700ab60f
cd ..

# build closure compiler
if [ ! -f closure-compiler/build/compiler.jar ] && [ -d closure-compiler ]; then
  cd closure-compiler
  ant clean
  ant jar
  cd ..
fi

# checkout closure templates compiler
if [ ! -d closure-templates-compiler ]; then
  curl https://dl.google.com/closure-templates/closure-templates-for-javascript-latest.zip -O
  unzip closure-templates-for-javascript-latest.zip -d closure-templates-compiler
  rm closure-templates-for-javascript-latest.zip
fi

# build css compiler
if [ ! -f closure-stylesheets/build/closure-stylesheets.jar ]; then
  cd closure-stylesheets
  ant
  cd ..
fi

if [ -f chrome_extensions.js ]; then
  rm -f chrome_extensions.js
fi

# Temporary fix
# Soy file bundled with the compiler does not compile with strict settings:
# lib/closure-templates-compiler/soyutils_usegoog.js:1762: ERROR - element JS_STR_CHARS does not exist on this enum
cd closure-templates-compiler
echo $PWD
curl https://raw.githubusercontent.com/google/closure-templates/0cbc8543c34d3f7727dd83a2d1938672f16d5c20/javascript/soyutils_usegoog.js -O
cd ..

cd ..
