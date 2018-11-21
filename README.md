# VSAQ: Vendor Security Assessment Questionnaire

## Introduction
----
Note: VSAQ is not an official Google product (experimental or otherwise);
it's just code that happens to be owned by Google.

VSAQ is an interactive questionnaire application. Its initial purpose was
to support security reviews by facilitating not only the collection of
information, but also the redisplay of collected data in templated form.

At Google, questionnaires like the ones in this repository are used to
assess the security programs of third parties. But the templates provided
can be used for a variety of purposes, including doing a self-assessment
of your own security program, or simply becoming familiar with issues
affecting the security of web applications.

To test the application without deploying it, go to https://vsaq-demo.withgoogle.com.


### Example Third-Party Security Review Workflow
1. *Reviewer* sends questionnaire link(s) to *assessment target*
(e.g., https://vsaq-demo.withgoogle.com/vsaq.html?qpath=questionnaires/webapp.json).
1. *Assessment target* completes the questionnaire(s).
1. *Assessment target* clicks the Save button at the bottom of the questionnaire
to export the answers.
1. *Assessment target* sends the answers file back to *reviewer*.
1. *Reviewer* opens the same questionnaire(s) and loads the answers received
from *assessment target*.


### Project Structure

* / — top-level directory for common files.
* /questionnaires — directory for questionnaire templates.
* /vsaq — directory for the questionnaire rendering engine library.
* /client_side_only_impl — directory for a client-side reference implementation.


## Build Prerequisites
----
These instructions have been tested with the following software:

* java >= 1.7 — for running the Closure Compiler
* ant — for building VSAQ dependencies
* git
* curl
* maven
* a web server (an optional Python development server is provided)
* a browser with HTML5 support


## VSAQ Setup
----
These instructions assume a working directory of the repository root.

VSAQ includes an easy-to-use setup script called `do.sh`. It supports the
following commands:

 * Setup:   `./do.sh {install_deps|check_deps}`
 * Build:   `./do.sh {build|build_prod|build_templates|build_docs} [debug]`
 * Run:     `./do.sh {run}`
 * Cleanup: `./do.sh {clean|clean_deps}`
 * Other:   `./do.sh {lint}`


### Build

To build VSAQ, run the following commands:

1. `./do.sh install_deps`
1. `./do.sh build`


### Local Development Server
To run the VSAQ development server locally, use the `run` command:

1. `./do.sh run`

Note that the development app server uses a snapshot of the code, taken
at the time you run it. If you make changes to the code, be sure to run the
appropriate build command again and restart the dev server:

 * Run `./do.sh build`  to refresh the source code, static files, and templates.
 * Run `./do.sh build_templates` to rebuild only the Closure Templates. Then
 run `./do.sh run` to restart the dev server.


### Deployment
The open source version of VSAQ does not require a dedicated back end. This means
VSAQ can be hosted as a static application on any web server.

To deploy VSAQ, complete the following steps:

1. `./do.sh build_prod` — This will run a normal build, but will also remove
test files.
1. Copy the content of the `build` directory into any directory hosted on your
web server.
1. The questionnaire should now be available under
https://[yourserver]/vsaq.html?qpath=questionnaires/test_template.json

Example: https://vsaq-demo.withgoogle.com/vsaq.html?qpath=questionnaires/test_template.json


## Reference Implementation
----
The reference implementation in the `client_side_only_impl` folder requires no
code to run on a back end. All operations are performed by `vsaq_main.js` in the
browser.

Although this makes deployment very easy, you may want to run a custom
server-side component for storing answers and mapping questionnaires
to users. `vsaq_main.js` provides example code for submitting and loading questionnaire
answers to/from a back end:

 * `submitQuestionnaireToServer_` Submits questionnaire answers to a back end.
 * `loadAnswersFromServer_` Loads questionnaire answers from a back end.


## Notes
----
JS-Files in `static/` are compiled by the Closure Compiler and placed in
`build/vsaq_binary.js`.

Closure Templates are compiled by the Closure Template Compiler
and placed in `build/templates/vsaq/static/questionnaire/templates.soy.js`.

The `/questionnaires` directory and parts of the `/static` directories are
replicated in `build/`.

Changes to the JSON `/questionnaires` do not require redeployment of the
application code, and can be done on the server if required.
