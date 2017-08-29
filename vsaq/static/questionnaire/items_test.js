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
 * @fileoverview Tests for vsaq.questionnaire.items.Item and
 * vsaq.questionnaire.items.ValueItem, the base classes for all questionnaire
 * items.
 */

goog.provide('vsaq.questionnaire.items.ItemTests');
goog.setTestOnly('vsaq.questionnaire.items.ItemTests');

goog.require('goog.array');
goog.require('goog.events.EventTarget');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers.ObjectEquals');
goog.require('vsaq.questionnaire.items.BlockItem');
goog.require('vsaq.questionnaire.items.CheckItem');
goog.require('vsaq.questionnaire.items.CheckgroupItem');
goog.require('vsaq.questionnaire.items.GroupItem');
goog.require('vsaq.questionnaire.items.Item');
goog.require('vsaq.questionnaire.items.LineItem');
goog.require('vsaq.questionnaire.items.RadioItem');
goog.require('vsaq.questionnaire.items.RadiogroupItem');
goog.require('vsaq.questionnaire.items.ValueItem');
goog.require('vsaq.questionnaire.items.YesNoItem');
goog.require('vsaq.questionnaire.items.factory');



var CAPTION = 'valueitem_caption';
var CONDITIONS = ['+condition1', '-condition2'];
var ID = 'item_id';
var VALUE = 'valueitem_value';
var TEST_ITEMS = [
  {type: 'block', id: 'block_id', text: 'block_text'},
  {type: 'line', id: 'line_id', text: 'line_text',
    placeholder: 'placeholder', required: true, inputType: 'date',
    inputPattern: '.*', inputTitle: 'input_title', maxlength: 100},
  {type: 'radio', id: 'radio1_id', text: 'radio1_text'},
  {type: 'radio', id: 'radio2_id', text: 'radio2_text'},
  {type: 'check', id: 'check1_id', text: 'check1_text'},
  {type: 'yesno', id: 'yesno1_id', text: 'yesno1_text', yes: 'yes', no: 'no'},
  {type: 'checkgroup', id: 'checkgroup1_id', text: 'checkgroup1_text', choices:
        [{checkchoice1_id: 'checkchoice1'}, {checkchoice2_id: 'checkchoice2'}]},
  {type: 'radiogroup', id: 'radiogroup1_id', text: 'radiogroup1_text', choices:
        [{radiochoice1_id: 'radiochoice1'}, {radiochoice2_id: 'radiochoice2'}]}
];
var TEST_VALUES = {
  radio1_id: 'checked',
  radio2_id: '',
  check1_id: '',
  yesno1_id: 'yes',
  //checkgroup1_id: true,
  checkchoice1_id: 'checked',
  checkchoice2_id: '',
  //radiogroup1_id: false,
  radiochoice1_id: '',
  radiochoice2_id: ''
};

var item, valueItem;


/**
 * Initializes variables used by all tests.
 */
function setUp() {
  // The following questionnaire items are necessary for the tests and therefore
  // added to the factory.
  goog.scope(function() {
  var items = vsaq.questionnaire.items;
  items.factory.clear();
  items.factory.add(items.CheckgroupItem.TYPE, items.CheckgroupItem.parse);
  items.factory.add(items.CheckItem.TYPE, items.CheckItem.parse);
  items.factory.add(items.RadiogroupItem.TYPE, items.RadiogroupItem.parse);
  items.factory.add(items.RadioItem.TYPE, items.RadioItem.parse);
  items.factory.add(items.LineItem.TYPE, items.LineItem.parse);
  items.factory.add(items.BlockItem.TYPE, items.BlockItem.parse);
  items.factory.add(items.YesNoItem.TYPE, items.YesNoItem.parse);
  });  // goog.scope

  item = new vsaq.questionnaire.items.Item(ID, CONDITIONS);
  valueItem =
      new vsaq.questionnaire.items.ValueItem(ID, CONDITIONS, CAPTION);
}


/**
 * Tests whether the item constructor works correctly.
 */
function testItem() {
  assertEquals(ID, item.id);
  assertObjectEquals(CONDITIONS, item.conditions);
  assertUndefined(item.parentItem);
  assert(item.container instanceof Element);
  assert(item.eventDispatcher instanceof goog.events.EventTarget);
}


/**
 * Sets up a basic test questionnaire and returns the items.
 * @return {!Object.<string, !vsaq.questionnaire.items.Item>} A dictionary of
 *     items, mapping the items' ids to the objects.
 */
function setUpTestQuestionnaire() {
  var items = {};
  var testq = goog.array.clone(TEST_ITEMS);
  var block = vsaq.questionnaire.items.Item.parse(testq);
  items[block.id] = block;
  while (testq.length) {
    var item = vsaq.questionnaire.items.Item.parse(testq);
    block.addItem(item);
    if (item instanceof vsaq.questionnaire.items.ValueItem)
      item.setValue(TEST_VALUES[item.id]);
    if (item instanceof vsaq.questionnaire.items.GroupItem)
      goog.array.forEach(item.containerItems, function(item) {
        item.setValue(TEST_VALUES[item.id]);
        items[item.id] = item;
      });
    items[item.id] = item;
  }
  return items;
}


/**
 * Tests evaluation of a group of conditions.
 */
function testEvaluateConditions() {
  var items = setUpTestQuestionnaire();

  // Evaluate string-defined conditions (new format).
  item.conditions = 'radio1_id'; assert(item.evaluateConditions(items));
  item.conditions = 'radio2_id'; assert(!item.evaluateConditions(items));
  item.conditions = '!radio1_id'; assert(!item.evaluateConditions(items));
  item.conditions = '!radio2_id'; assert(item.evaluateConditions(items));
  item.conditions = 'checkgroup1_id'; assert(item.evaluateConditions(items));
  item.conditions = 'checkchoice1_id'; assert(item.evaluateConditions(items));
  item.conditions = '!checkchoice2_id'; assert(item.evaluateConditions(items));
  item.conditions = '!radiogroup1_id'; assert(item.evaluateConditions(items));
  item.conditions = '!radiochoice1_id'; assert(item.evaluateConditions(items));
  item.conditions = '!radiochoice2_id'; assert(item.evaluateConditions(items));

  item.conditions = 'radio1_id && yesno1_id/yes';
  assert(item.evaluateConditions(items));
  item.conditions = 'radio1_id && yesno1_id/no';
  assert(!item.evaluateConditions(items));
  item.conditions = 'radio2_id && yesno1_id/yes';
  assert(!item.evaluateConditions(items));
  item.conditions = 'radio2_id || yesno1_id/yes';
  assert(item.evaluateConditions(items));
  item.conditions = '!radiogroup1_id && yesno1_id/yes';
  assert(item.evaluateConditions(items));
  item.conditions = 'checkgroup1_id && yesno1_id/yes';
  assert(item.evaluateConditions(items));
}


/**
 * Tests parsing of Items.
 */
function testItemParse() {
  var testq = goog.array.clone(TEST_ITEMS);

  // Parses a few random items for testing.
  assert(vsaq.questionnaire.items.Item.parse(testq) instanceof
         vsaq.questionnaire.items.BlockItem);
  assert(vsaq.questionnaire.items.Item.parse(testq) instanceof
         vsaq.questionnaire.items.LineItem);
  assert(vsaq.questionnaire.items.Item.parse(testq) instanceof
         vsaq.questionnaire.items.RadioItem);
  assert(vsaq.questionnaire.items.Item.parse(testq) instanceof
         vsaq.questionnaire.items.RadioItem);
  assert(vsaq.questionnaire.items.Item.parse(testq) instanceof
         vsaq.questionnaire.items.CheckItem);
  assert(vsaq.questionnaire.items.Item.parse(testq) instanceof
         vsaq.questionnaire.items.YesNoItem);
  assert(vsaq.questionnaire.items.Item.parse(testq) instanceof
         vsaq.questionnaire.items.CheckgroupItem);
  assert(vsaq.questionnaire.items.Item.parse(testq) instanceof
         vsaq.questionnaire.items.RadiogroupItem);
}


/**
 * Tests visibility functions.
 */
function testItemVisibility() {
  var mock = new goog.testing.MockControl();
  var items = setUpTestQuestionnaire();
  mock.createMethodMock(items['block_id'].eventDispatcher, 'dispatchEvent');
  var expectedHiddenEvent = {
    type: vsaq.questionnaire.items.Item.HIDDEN,
    source: items['block_id'],
  };
  var expectedShownEvent = {
    type: vsaq.questionnaire.items.Item.SHOWN,
    source: items['block_id'],
  };
  items['block_id'].eventDispatcher.dispatchEvent(
      new goog.testing.mockmatchers.ObjectEquals(expectedHiddenEvent));
  items['block_id'].eventDispatcher.dispatchEvent(
      new goog.testing.mockmatchers.ObjectEquals(expectedShownEvent));
  mock.$replayAll();
  assert(items['block_id'].isVisible());
  assert(items['radio1_id'].isVisible());

  items['block_id'].setVisibility(false);
  assert(!items['block_id'].isVisible());
  assert(!items['radio1_id'].isVisible());

  items['radio1_id'].setVisibility(true);
  assert(!items['radio1_id'].isVisible());

  items['block_id'].setVisibility(true);
  assert(items['radio1_id'].isVisible());
  mock.$verifyAll();
}


/**
 * Test whether the LineItem properties were correctly assigned.
 */
function testValueItemProperties() {
  var items = setUpTestQuestionnaire();
  var inputElement = items['line_id'];
  assertEquals('input_title', inputElement.inputTitle);
  assertEquals('placeholder', inputElement.placeholder);
  assertEquals('.*', inputElement.inputPattern);
  assertEquals(100, inputElement.maxlength);
  assertEquals('date', inputElement.inputType);
  assertTrue(inputElement.required);
}


/**
 * Tests whether the ValueItem constructor works correctly.
 */
function testValueItem() {
  assertEquals(ID, valueItem.id);
  assertObjectEquals(CONDITIONS, valueItem.conditions);
  assertEquals(undefined, valueItem.parentItem);
  assert(valueItem.container instanceof Element);
  assert(valueItem.eventDispatcher instanceof goog.events.EventTarget);
  assertEquals(CAPTION, valueItem.text);
}


/**
 * Tests whether events are correctly dispatched when the answer changes.
 */
function testValueItemAnswerChanged() {
  var mock = new goog.testing.MockControl();
  mock.createMethodMock(valueItem, 'getValue');
  mock.createMethodMock(valueItem.eventDispatcher, 'dispatchEvent');
  var expectedChanges = {};
  expectedChanges[ID] = VALUE;
  var expectedEvent = {
    type: vsaq.questionnaire.items.Item.CHANGED,
    source: valueItem,
    changes: expectedChanges
  };
  valueItem.getValue().$returns(VALUE);
  valueItem.eventDispatcher.dispatchEvent(
      new goog.testing.mockmatchers.ObjectEquals(expectedEvent));

  mock.$replayAll();
  valueItem.answerChanged({});
  mock.$verifyAll();
}

