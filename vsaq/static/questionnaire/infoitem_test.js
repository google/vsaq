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
 * @fileoverview Tests for vsaq.questionnaire.items.InfoItem.
 */

goog.provide('vsaq.questionnaire.items.InfoItemTests');
goog.setTestOnly('vsaq.questionnaire.items.InfoItemTests');

goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.testing.jsunit');
goog.require('vsaq.questionnaire.items.InfoItem');

var CAPTION = 'infoitem_caption';
var ID = 'infoitem_id';

var info;


/**
 * Initializes variables used by all tests.
 */
function setUp() {
  info = new vsaq.questionnaire.items.InfoItem(ID, [], CAPTION);
}


/**
 * Tests whether info items are rendered correctly.
 */
function testInfoItem() {
  var el = info.container;

  assertEquals(String(goog.dom.TagName.DIV), el.tagName);
  assertEquals(ID, el.id);
  assertEquals(CAPTION, goog.dom.getTextContent(el));
}


/**
 * Tests parsing of InfoItems.
 */
function testInfoItemParse() {
  var testStack = [{
    'type': 'info',
    'text': CAPTION,
    'id': ID
  }];
  info = vsaq.questionnaire.items.InfoItem.parse(testStack);
  assert(info instanceof vsaq.questionnaire.items.InfoItem);
  assertEquals(ID, info.id);
  assertEquals(CAPTION, info.info);
  assertEquals(0, testStack.length);
}

