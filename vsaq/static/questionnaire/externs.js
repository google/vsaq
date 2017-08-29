
/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Externs for questionnaire.
 * @externs
 */


/** @type {Object} */
var qjson = {};


/**
 * @typedef {{
 *   auth: string,
 *   choices: Object.<string, string>,
 *   choicesConds: Object.<string, string>,
 *   className: string,
 *   cond: string,
 *   customTitle: string,
 *   default: string,
 *   defaultChoice: boolean,
 *   id: string,
 *   inputType: string,
 *   inputPattern: string,
 *   inputTitle: string,
 *   maxlength: number,
 *   name: string,
 *   no: string,
 *   placeholder: string,
 *   required: boolean,
 *   severity: string,
 *   style: string,
 *   text: string,
 *   todo: string,
 *   type: string,
 *   warn: string,
 *   why: string,
 *   yes: string
 * }}
 */
qjson.QuestionnaireItem;
