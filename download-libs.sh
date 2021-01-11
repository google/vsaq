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



type unzip >/dev/null 2>&1 || {
  echo >&2 "Unzip is required to build VSAQ dependencies."
  exit 1
}
type wget >/dev/null 2>&1 || {
  echo >&2 "Wget is required to build VSAQ dependencies."
  exit 1
}
type ant >/dev/null 2>&1 || {
  echo >&2 "Ant is required to build VSAQ dependencies."
  exit 1
}
type mvn >/dev/null 2>&1 || {
  echo >&2 "Apache Maven is required to build VSAQ dependencies."
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

# if repo was downloaded as zip from github, init git and clear submodules
if [ ! -d .git ]; then
  git init
  rm -rf $THIRD_PARTY_DIRECTORY/closure-compiler
  rm -rf $THIRD_PARTY_DIRECTORY/closure-library
  rm -rf $THIRD_PARTY_DIRECTORY/closure-stylesheets
  rm -rf $THIRD_PARTY_DIRECTORY/js-dossier
  rm -rf $THIRD_PARTY_DIRECTORY/closure-templates
fi

if [ ! -d $THIRD_PARTY_DIRECTORY ]; then
  mkdir $THIRD_PARTY_DIRECTORY
fi
cd $THIRD_PARTY_DIRECTORY
git init
git submodule add -f https://github.com/google/closure-compiler closure-compiler
git submodule add -f https://github.com/google/closure-library closure-library
git submodule add -f https://github.com/google/closure-stylesheets closure-stylesheets
git submodule add -f https://github.com/google/closure-templates closure-templates
git submodule add -f https://github.com/jleyba/js-dossier js-dossier
git submodule add -f https://github.com/google/safe-html-types safe-html-types

git submodule init
git submodule update

# Pin submodules to particular commits
cd closure-compiler
git checkout -b 0441c526dc7ed322034d4f708062c00802184e8f 0441c526dc7ed322034d4f708062c00802184e8f
cd ..
cd closure-library
git checkout -b 26de3253e443d36f64c2ea380faee879dfcf1c54 26de3253e443d36f64c2ea380faee879dfcf1c54
cd ..
cd js-dossier
git checkout -b e6e55806ea97a4fcf4157661ee809eb8b48fe848 e6e55806ea97a4fcf4157661ee809eb8b48fe848
cd ..
cd closure-templates
git checkout -b 17dad0f13db94ca43a2e4c436658682a0403ced1 17dad0f13db94ca43a2e4c436658682a0403ced1
cd ..
cd safe-html-types
git checkout -b 8507735457ea41a37dfa027fb176d49d5783c4ba 8507735457ea41a37dfa027fb176d49d5783c4ba
cd ..
cd closure-stylesheets
git checkout -b d2c0cce5c11891c086a3d055ec84e96d5b9cb559 d2c0cce5c11891c086a3d055ec84e96d5b9cb559
cd ..

# build closure compiler
if [ ! -f closure-compiler/build/compiler.jar ] && [ -d closure-compiler ]; then
  cd closure-compiler
  mvn -DskipTests -pl externs/pom.xml,pom-main.xml,pom-main-shaded.xml
  cd ..
fi

# build closure templates compiler
if [ -d closure-templates ] && [ ! -d closure-templates/target ]; then
  cd closure-templates
  mvn -DskipTests package
  cd ..
fi

# build css compiler
if [ ! -f closure-stylesheets/target/closure-stylesheets-1.5.0-SNAPSHOT-jar-with-dependencies.jar ]; then
  cd closure-stylesheets
  mvn compile assembly:single
  cd ..
fi

if [ -f chrome_extensions.js ]; then
  rm -f chrome_extensions.js
fi

mkdir protoc; cd protoc
wget https://github.com/google/protobuf/releases/download/v3.5.1/protoc-3.5.1-linux-x86_64.zip
unzip protoc-3.5.1-linux-x86_64.zip
rm protoc-3.5.1-linux-x86_64.zip
wget https://github.com/google/protobuf/releases/download/v3.5.1/protobuf-js-3.5.1.zip
unzip protobuf-js-3.5.1.zip
rm protobuf-js-3.5.1.zip
cd ..

cd ..
