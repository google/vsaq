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
# @fileoverview Shell script to facilitate build-related tasks for VSAQ.
#

PYTHON_CMD="python"
JSCOMPILE_CMD="java -jar third_party/closure-compiler/target/closure-compiler-1.0-SNAPSHOT.jar --flagfile=compiler.flags"
CKSUM_CMD="cksum" # chosen because it's available on most Linux/OS X installations
BUILD_DIR="build"
BUILD_TPL_DIR="$BUILD_DIR/templates"
cd ${0%/*}

vsaq_assert_dependencies() {
  # Check if required binaries are present.
  type "$PYTHON_CMD" >/dev/null 2>&1 || { echo >&2 "Python is required to build VSAQ."; exit 1; }
  type ant >/dev/null 2>&1 || { echo >&2 "Ant is required to build VSAQ."; exit 1; }
  type java >/dev/null 2>&1 || { echo >&2 "Java is required to build VSAQ."; exit 1; }
  jversion=$(java -version 2>&1 | grep version | awk -F '"' '{print $2}')
  if [[ $jversion < "1.7" ]]; then
    echo "Java 1.7 or higher is required to build VSAQ."
    exit 1
  fi
  # Check if required files are present.
  files=(third_party/closure-library \
    third_party/closure-templates/target \
    third_party/closure-stylesheets/target/closure-stylesheets-1.5.0-SNAPSHOT-jar-with-dependencies.jar \
    third_party/closure-compiler/target/closure-compiler-1.0-SNAPSHOT.jar \
  )
  for var in "${files[@]}"
  do
    if [ ! -e $var ]; then
      echo $var "not found"
      echo >&2 "Download libraries needed to build first. Use $0 install_deps."
      exit 1
    fi
  done
  echo "All dependencies met."
}

vsaq_get_file_cksum() {
  # creates a checksum of a given file spec
  # no-op if $CKSUM_CMD is not available
  type $CKSUM_CMD >/dev/null 2>&1 && (find "vsaq" -name $1 | sort | xargs $CKSUM_CMD | $CKSUM_CMD) || true
}

vsaq_build_templates() {
  vsaq_assert_dependencies
  set -e
  mkdir -p "$BUILD_TPL_DIR"
  rm -rf "$BUILD_TPL_DIR/*"
  mkdir "$BUILD_TPL_DIR/proto"
  # Compile safe html type proto to JS
  third_party/protoc/bin/protoc --js_out $BUILD_TPL_DIR/proto \
    ./third_party/safe-html-types/proto/src/main/protobuf/webutil/html/types/html.proto
  # Compile soy templates
  echo "Compiling Soy templates..."
  rm -f "$BUILD_TPL_DIR/cksum"
  vsaq_get_file_cksum '*.soy' > "$BUILD_TPL_DIR/cksum"
  find "vsaq" -name '*.soy' -exec java -jar third_party/closure-templates/target/soy-2018-03-14-SoyToJsSrcCompiler.jar \
    --srcs {} --outputPathFormat "$BUILD_TPL_DIR/{INPUT_DIRECTORY}{INPUT_FILE_NAME}.js" \;
  echo "Done."
}

vsaq_assert_buildfiles() {
  if [ ! -d "$BUILD_DIR" ] || [ ! -f "$BUILD_DIR/vsaq.html" ]; then
    echo "Please build VSAQ first."
    exit 1
  fi
}

vsaq_assert_templates() {
  if [ ! -d $BUILD_TPL_DIR ]; then
    vsaq_build_templates
  else
    # If cmp is unavailable, just ignore the check, instead of exiting
    type cmp >/dev/null 2>&1 && (vsaq_get_file_cksum '*.soy' | cmp "$BUILD_TPL_DIR/cksum" - >/dev/null 2>&1) || true
    if [ -f "$BUILD_TPL_DIR/cksum" -a $? -eq 0 ] ; then
      echo "Using previous template build. Run ./do.sh clean if you want to rebuild the templates."
    else
      echo "Template files changed since last build. Rebuilding..."
      vsaq_build_templates
    fi
  fi
}

vsaq_assert_jsdeps() {
  if [ ! -f "$BUILD_DIR/deps.js" ]; then
    vsaq_generate_jsdeps
  fi
}

vsaq_build_closure_lib_() {
  # $1 - Closure entry point
  # $2 - Filename
  # $3 - Additional source dir
  # $4 - [debug|optimized]
  ENTRY_POINT=$1
  FNAME=$2
  SRC_DIRS=( \
    vsaq \
    client_side_only_impl \
    third_party/closure-templates/target \
    third_party/closure-library/closure/goog \
    third_party/closure-library/third_party/closure/goog \
    third_party/protoc/protobuf-3.5.1/js/binary )
  if [ -d "$3" ]; then
    SRC_DIRS+=("$3")
  fi
  jscompile_vsaq="$JSCOMPILE_CMD"
  for var in "${SRC_DIRS[@]}"
  do
    jscompile_vsaq+=" --js='$var/**.js' --js='!$var/**_test.js' --js='!$var/**_perf.js'"
  done
  jscompile_vsaq+=" --js='!third_party/closure-library/closure/goog/demos/**.js'"
  jscompile_vsaq+=" --js='!third_party/closure-templates/javascript/examples/**.js'"
  if [ "$4" == "debug" ]; then
     jscompile_vsaq+=" --debug --formatting=PRETTY_PRINT -O WHITESPACE_ONLY"
  elif [ "$4" == "optimized" ]; then
     jscompile_vsaq+=" -O ADVANCED"
  fi
  cmd="$jscompile_vsaq --closure_entry_point "$ENTRY_POINT" --js_output_file "$FNAME""
  echo $cmd
  echo -n "."
  $cmd
}

vsaq_build_jsmodule() {
  echo "Building JS module $1 into $BUILD_DIR/$1.js..."
  vsaq_assert_dependencies
  set -e
  vsaq_assert_jsdeps
  mkdir -p "$BUILD_DIR"
  if [ "$2" == "debug" ]; then
    echo "Debug mode enabled"
  fi
  vsaq_build_closure_lib_ $1 "$BUILD_DIR/$1.js" "" $2;
  echo ""
  echo "Done."
}

vsaq_build() {
  vsaq_assert_dependencies
  set -e
  vsaq_assert_jsdeps
  vsaq_assert_templates

  echo "Building VSAQ app to $BUILD_DIR"
  # compile javascript files
  if [ "$1" == "debug" ]; then
    echo "Debug mode enabled"
  fi
  echo "Compiling JS files..."
  vsaq_build_closure_lib_ "vsaq" "$BUILD_DIR/vsaq_binary.js" "$BUILD_TPL_DIR" "$1"

  BUILD_DIR_STATIC="$BUILD_DIR/static"
  mkdir -p "$BUILD_DIR_STATIC"
  csscompile_vsaq="java -jar third_party/closure-stylesheets/target/closure-stylesheets-1.5.0-SNAPSHOT-jar-with-dependencies.jar --allowed-non-standard-function color-stop"
  echo "Compiling CSS files..."
  $csscompile_vsaq "vsaq/static/vsaq_base.css" "vsaq/static/vsaq.css" > "$BUILD_DIR_STATIC/vsaq.css"
  echo "Copying remaining static files..."
  find "vsaq" -regex '.*.\(gif\|png\|ico\)$' -exec cp -f "{}" "$BUILD_DIR_STATIC" \;
  echo "Copying main html files..."
  find "client_side_only_impl" -regex .*.html -not -regex .*_test_dom.html -exec cp -f "{}" "$BUILD_DIR" \;
  echo "Copying questionnaire files..."
  cp -R "questionnaires" "$BUILD_DIR"
  echo "Done."
}

vsaq_build_prod() {
 vsaq_build
 rm -f "$BUILD_DIR/example.html"
 rm -f "$BUILD_DIR/all_tests.html"
}

vsaq_build_clean() {
  echo "Cleaning all builds..."
  rm -rfv "$BUILD_DIR"
  echo "Done."
}

vsaq_clean_deps() {
  echo "Removing all build dependencies. Install them with ./do.sh install_deps."
  rm -rfv lib
  echo "Done."
}

vsaq_install_deps() {
  set -e
  echo "Installing build dependencies..."
  ./download-libs.sh
  echo "Done."
}

vsaq_generate_jsdeps() {
  vsaq_assert_templates
  $PYTHON_CMD third_party/closure-library/closure/bin/build/depswriter.py \
    --root_with_prefix="build/templates/ build/templates/" \
    --root_with_prefix="vsaq/ vsaq/" \
    --root_with_prefix="third_party/closure-templates/javascript third_party/closure-templates/javascript/" \
    > "$BUILD_DIR/deps.js"
}

vsaq_run() {
  vsaq_assert_buildfiles
  vsaq_assert_templates
  echo "Generating build/deps-runfiles.js file..."
  mkdir -p "$BUILD_DIR"
  $PYTHON_CMD third_party/closure-library/closure/bin/build/depswriter.py \
    --root_with_prefix="build/templates/ ../../../build/templates/" \
    --root_with_prefix="vsaq/ ../vsaq/" \
    --root_with_prefix="third_party/closure-templates/javascript/ ../../../../third_party/closure-templates/javascript/" \
    > "$BUILD_DIR/deps-runfiles.js"

  rm -f "$BUILD_DIR/all_tests.js"
  echo "Starting the VSAQ server (Press Ctrl-C to stop)..."
  $PYTHON_CMD vsaq_server.py $*
  echo "Done."
}

vsaq_lint() {
  if [ -z `which gjslint` ]; then
    echo "Closure Linter is not installed."
    echo "Follow instructions at https://developers.google.com/closure/utilities/docs/linter_howto to install (root access is needed)."
    RETVAL=1
  else
    echo "Running Closure Linter..."
    if [ -z "$1" ]; then
      ADDITIONAL="-r vsaq"
    else
      ADDITIONAL=$*
    fi
    gjslint --strict --closurized_namespaces=goog,vsaq --limited_doc_files=_test.js --exclude_files=deps.js,externs.js $ADDITIONAL
    RETVAL=$?
  fi
}

vsaq_build_docs() {
  rm -rf docs/*
  if [ ! -f third_party/js-dossier/buck-out/gen/src/java/com/github/jsdossier/dossier.jar ]; then
    if [ -z `which buck` ]; then
      echo "Facebook Buck is not installed. Buck is needed by js-dossier to build the documentation."
      echo "Follow instructions at http://buckbuild.com/setup/quick_start.html to install."
      echo "Make sure 'buck' command line tool is available."
      RETVAL=1
      exit
    else
      cd third_party/js-dossier
      ./gendossier.sh -r
      cd ../..
    fi
  fi
  vsaq_build_templates
  java -jar third_party/js-dossier/buck-out/gen/src/java/com/github/jsdossier/dossier.jar -c third_party/docs-build/dossier-config.json
  RETVAL=$?
}

RETVAL=0

CMD=$1
shift

case "$CMD" in
  check_deps)
    vsaq_assert_dependencies;
    ;;
  install_deps)
    vsaq_install_deps;
    ;;
  build)
    vsaq_build $1;
    ;;
  build_prod)
    vsaq_build_prod;
    ;;
  build_templates)
    vsaq_build_templates;
    ;;
  build_jsmodule)
    vsaq_build_jsmodule $*;
    ;;
  clean)
    vsaq_build_clean;
    ;;
  clean_deps)
    vsaq_clean_deps;
    ;;
  run)
    vsaq_run;
    ;;
  lint)
    vsaq_lint $*;
    ;;
  build_docs)
    vsaq_build_docs;
    ;;
  deps)
    vsaq_generate_deps;
    ;;
  *)
    echo "Usage:   $0 PARAMETER"
    echo "Setup:   $0 {install_deps|check_deps}"
    echo "Build:   $0 {build|build_prod|build_templates|build_docs} [debug]"
    echo "Run:     $0 {run}"
    echo "Cleanup: $0 {clean|clean_deps}"
    echo "Other:   $0 {lint}"
    RETVAL=1
esac

exit $RETVAL
