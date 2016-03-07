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
 * @fileoverview Tests for vsaq.questionnaire.items.BlockItem.
 */

goog.provide('vsaq.questionnaire.items.BlockItemsTests');
goog.setTestOnly('vsaq.questionnaire.items.BlockItemsTests');

goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.dom.classlist');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.events');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers.ObjectEquals');
goog.require('vsaq.questionnaire.items.BlockItem');
goog.require('vsaq.questionnaire.items.Item');
goog.require('vsaq.questionnaire.items.RadioItem');

var CAPTION = 'block_caption';
var ID = 'test_id';
var ADMIN = 'admin';

var block;


/**
 * Initializes variables used by all tests.
 */
function setUp() {
  block = new vsaq.questionnaire.items.BlockItem(
      ID, [], CAPTION, ADMIN);
}


/**
 * Tests whether blocks are rendered correctly.
 */
function testBlockItem() {
  var el = block.container;
  var legend = goog.dom.getFirstElementChild(el);

  assertEquals(goog.dom.TagName.FIELDSET, el.tagName);
  assert(goog.dom.classlist.contains(el, 'vsaq-block'));
  assertEquals(goog.dom.TagName.LEGEND, legend.tagName);

  var span = goog.dom.getFirstElementChild(legend);
  assertEquals(goog.dom.TagName.SPAN, span.tagName);
  assertEquals(CAPTION, span.innerHTML);
}


/**
 * Tests changes to radio buttons within the block.
 */
function testBlockRadioChanges() {
  var rad1 = new vsaq.questionnaire.items.RadioItem('radio1_id', [], 'radio1');
  var rad2 = new vsaq.questionnaire.items.RadioItem('radio2_id', [], 'radio2');

  block.addItem(rad1);
  block.addItem(rad2);

  var expectedEvent = {
    type: vsaq.questionnaire.items.Item.CHANGED,
    source: block,
    changes: {'radio1_id': rad1.getValue(), 'radio2_id': ''}
  };

  var mock = new goog.testing.MockControl();
  mock.createFunctionMock(block.eventDispatcher, 'dispatchEvent');

  block.eventDispatcher.dispatchEvent(
      new goog.testing.mockmatchers.ObjectEquals(expectedEvent));

  mock.$replayAll();

  // Change the selection.
  goog.testing.events.fireClickEvent(rad1.radioButton);

  mock.$verifyAll();
  mock.$tearDown();
}


/**
 * Tests adding of containerItems to blocks.
 */
function testBlockAddItem() {
  var rad = new vsaq.questionnaire.items.RadioItem('radio1_id', [], 'radio1');
  block.addItem(rad);
  assertContains('Item not added.', rad, block.containerItems);
  assertEquals(rad.container, block.container.lastChild);
}


/**
 * Tests parsing of BlockItems.
 */
function testStartBlockParse() {
  var testStack = [{
    'type': 'block',
    'text': CAPTION,
    'id': ID,
    'auth' : ADMIN
  }];

  block = vsaq.questionnaire.items.BlockItem.parse(testStack);

  assert(block instanceof vsaq.questionnaire.items.BlockItem);
  assertEquals(ID, block.id);
  assertEquals(CAPTION, block.text);
  assertEquals(ADMIN, block.auth);
  assertEquals(0, testStack.length);
}
