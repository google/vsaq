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

goog.provide('vsaq.QuestionnaireTest');
goog.setTestOnly('vsaq.QuestionnaireTest');

goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.object');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.jsunit');
goog.require('vsaq.Questionnaire');
goog.require('vsaq.questionnaire.items.BlockItem');
goog.require('vsaq.questionnaire.items.BoxItem');
goog.require('vsaq.questionnaire.items.CheckItem');
goog.require('vsaq.questionnaire.items.CheckgroupItem');
goog.require('vsaq.questionnaire.items.InfoItem');
goog.require('vsaq.questionnaire.items.LineItem');
goog.require('vsaq.questionnaire.items.RadioItem');
goog.require('vsaq.questionnaire.items.RadiogroupItem');
goog.require('vsaq.questionnaire.items.SpacerItem');
goog.require('vsaq.questionnaire.items.TipItem');
goog.require('vsaq.questionnaire.items.UploadItem');
goog.require('vsaq.questionnaire.items.YesNoItem');
goog.require('vsaq.questionnaire.items.factory');


var HTML_STRING = 'some_html<br>_string';
var BLOCK1, BLOCK2;
var BOX, CHECK, INFO, LINE, RADIO1, RADIO2, SPACER, TIP, WHYTIP, YESNO;
var QUESTIONNAIRE;
var root;


/**
 * Initializes variables used by all tests.
 */
function setUp() {
  root = goog.dom.getElement('root');

  BLOCK1 = {
    type: 'block',
    items: [],
    text: HTML_STRING
  };
  BLOCK2 = {
    type: 'block',
    items: [],
    text: HTML_STRING
  };
  BOX = {
    id: 'box_id',
    type: 'box',
    text: HTML_STRING
  };
  CHECK = {
    id: 'check_id',
    type: 'check',
    text: HTML_STRING
  };
  INFO = {
    id: 'info_id',
    type: 'info',
    text: HTML_STRING
  };
  LINE = {
    id: 'line_id',
    type: 'line',
    text: HTML_STRING
  };
  RADIO1 = {
    id: 'radio_id',
    type: 'radio',
    text: HTML_STRING
  };
  RADIO2 = {
    id: 'radio_id2',
    type: 'radio',
    text: HTML_STRING
  };
  SPACER = {
    type: 'spacer'
  };
  TIP = {
    id: 'tip_id',
    type: 'tip',
    text: HTML_STRING
  };
  WHYTIP = {
    id: 'whytip_id',
    type: 'tip',
    why: 'whytext',
    severity: 'high',
    text: HTML_STRING
  };
  YESNO = {
    id: 'yesno_id',
    type: 'yesno',
    yes: HTML_STRING + 'yes_part',
    no: HTML_STRING + 'no_part',
    text: HTML_STRING
  };

  BLOCK1.items = [BOX, LINE, BLOCK2, YESNO, RADIO1, RADIO2, SPACER, CHECK];
  BLOCK2.items = [TIP, WHYTIP];
  QUESTIONNAIRE = [BLOCK1];
}


/**
 * Cleans up after each test.
 */
function tearDown() {
  goog.dom.removeChildren(root);
}


/**
 * Tests whether all renderers are registered.
 */
function testRenderersComplete() {
  parsers = vsaq.questionnaire.items.factory.parsers;
  assert(vsaq.questionnaire.items.BlockItem.TYPE in parsers);
  assert(vsaq.questionnaire.items.BoxItem.TYPE in parsers);
  assert(vsaq.questionnaire.items.CheckgroupItem.TYPE in parsers);
  assert(vsaq.questionnaire.items.CheckItem.TYPE in parsers);
  assert(vsaq.questionnaire.items.InfoItem.TYPE in parsers);
  assert(vsaq.questionnaire.items.LineItem.TYPE in parsers);
  assert(vsaq.questionnaire.items.RadiogroupItem.TYPE in parsers);
  assert(vsaq.questionnaire.items.RadioItem.TYPE in parsers);
  assert(vsaq.questionnaire.items.SpacerItem.TYPE in parsers);
  assert(vsaq.questionnaire.items.TipItem.TYPE in parsers);
  assert(vsaq.questionnaire.items.YesNoItem.TYPE in parsers);
  assert(vsaq.questionnaire.items.UploadItem.TYPE in parsers);

  assertEquals(12, goog.object.getCount(parsers));
}


/**
 * Tests whether templates are set correctly.
 */
function testSetTemplate() {
  var q = new vsaq.Questionnaire(root);
  q.setTemplate(QUESTIONNAIRE);
  assertEquals(QUESTIONNAIRE, q.template_);
}


/**
 * Tests how many questions are unanswered in a block.
 * This test should probably really be in blockitems_test.js, but since we
 * already have a full questionnaire defined here, it's convenient.
 */
function testUnansweredCount() {
  var q = new vsaq.Questionnaire(root);
  q.setTemplate(QUESTIONNAIRE);

  // should be 4: box, radio, line, yesno
  assertEquals(4, q.rootBlock_.getUnansweredCount());
  q.setValues({'yesno_id': 'yes'});
  assertEquals(3, q.rootBlock_.getUnansweredCount());
  q.setValues({'yesno_id': 'yes', 'line_id': 'blah'});
  assertEquals(2, q.rootBlock_.getUnansweredCount());
  q.setValues({'line_id': '', 'radio_id': 'checked'});
  assertEquals(2, q.rootBlock_.getUnansweredCount());
  q.setValues({'box_id': 'blah2'});
  assertEquals(1, q.rootBlock_.getUnansweredCount());
  q.setValues({'yesno_id': 'yes', 'radio_id': 'checked'});
  assertEquals(1, q.rootBlock_.getUnansweredCount());
}


/**
 * Tests setting the questionnaire to unrolled-mode.
 */
function testSetUnrolledMode() {
  var q = new vsaq.Questionnaire(root);
  assertTrue(!q.unrolledMode_);
  q.setUnrolledMode(true);
  assertTrue(q.unrolledMode_);
}


/**
 * Tests retrieving the template back.
 */
function testGetTemplate() {
  var q = new vsaq.Questionnaire(root);
  q.setTemplate(QUESTIONNAIRE);
  assertObjectEquals(QUESTIONNAIRE, q.getTemplate());
}


/**
 * Tests updates to the questionnaire.
 */
function testQuestionnaireUpdates() {
  var q = new vsaq.Questionnaire(root);
  var realChanges = {};
  var expectedChanges = {};
  var e = {};

  q.setTemplate(QUESTIONNAIRE);
  q.render();

  q.addEventListener(goog.events.EventType.CHANGE, function(e) {
    realChanges = e.changedValues;
  });

  // Tests updates to Boxes.
  var box = q.items_[BOX.id];
  box.textArea_.value = 'updated_value';
  e.target = box.textArea_;
  goog.events.fireListeners(e.target, goog.events.EventType.CHANGE, true, e);
  expectedChanges[BOX.id] = box.textArea_.value;
  assertObjectEquals(expectedChanges, realChanges);

  // Tests updates to Lines.
  expectedChanges = {};
  realChanges = {};
  var line = q.items_[LINE.id];
  line.textBox_.value = 'updated_value';
  e.target = line.textBox_;
  goog.events.fireListeners(e.target, goog.events.EventType.CHANGE, true, e);
  expectedChanges[LINE.id] = line.textBox_.value;
  assertObjectEquals(expectedChanges, realChanges);

  // Tests updates to Radios.
  expectedChanges = {};
  realChanges = {};
  var radio = q.items_[RADIO1.id];
  radio.setValue(true);
  e.target = radio.radioButton;
  goog.events.fireListeners(e.target, goog.events.EventType.CHANGE, true, e);
  expectedChanges[RADIO1.id] = 'checked';
  expectedChanges[RADIO2.id] = '';
  assertObjectEquals(expectedChanges, realChanges);

  // Tests updates to Checks.
  expectedChanges = {};
  realChanges = {};
  var check = q.items_[CHECK.id];
  check.setValue(true);
  e.target = check.checkBox_;
  goog.events.fireListeners(e.target, goog.events.EventType.CHANGE, true, e);
  expectedChanges[CHECK.id] = 'checked';
  assertObjectEquals(expectedChanges, realChanges);

  // Tests updates to YesNos.
  expectedChanges = {};
  realChanges = {};
  var yes = q.items_[YESNO.id];
  yes.setValue('yes');
  e.target = yes.yesRadio_;
  goog.events.fireListeners(e.target, goog.events.EventType.CHANGE, true, e);
  expectedChanges[YESNO.id] = 'yes';
  assertObjectEquals(expectedChanges, realChanges);
}


/**
 * Tests setting values for the Questionnaire.
 */
function testSetValues() {
  var q = new vsaq.Questionnaire(root);
  q.setTemplate(QUESTIONNAIRE);
  q.render();

  var values = {};
  values[BOX.id] = 'boxvalue';
  values[LINE.id] = 'linevalue';
  values[CHECK.id] = 'checked';
  values[RADIO1.id] = 'checked';
  values[RADIO2.id] = 'unchecked';
  values[YESNO.id] = 'yes';
  q.setValues(values);

  assertEquals('boxvalue', goog.dom.getElement(BOX.id).value);
  assertEquals('linevalue', goog.dom.getElement(LINE.id).value);
  assertEquals('checked', q.items_[CHECK.id].getValue());
  assertEquals('checked', q.items_[RADIO1.id].getValue());
  assertEquals('', q.items_[RADIO2.id].getValue());
  assertEquals('yes', q.items_[YESNO.id].getValue());

  var verify = JSON.parse(q.getValuesAsJson());
  assertEquals('boxvalue', verify[BOX.id]);
  assertEquals('linevalue', verify[LINE.id]);
  assertEquals('yes', verify[YESNO.id]);
  assertEquals('checked', verify[CHECK.id]);
  assertEquals('checked', verify[RADIO1.id]);
  assertEquals('checked', verify[CHECK.id]);

  values[YESNO.id] = 'no';
  values[CHECK.id] = '';
  q.setValues(values);

  assertEquals('', q.items_[CHECK.id].getValue());
  assertEquals('no', q.items_[YESNO.id].getValue());

  verify = JSON.parse(q.getValuesAsJson());
  assertEquals('', verify[CHECK.id]);
  assertEquals('no', verify[YESNO.id]);
}


/**
 * Tests whether the questionnaire renders correctly.
 */
function testRender() {
  var q = new vsaq.Questionnaire(root);
  q.setTemplate(QUESTIONNAIRE);

  mock = new goog.testing.MockControl();
  mock.createMethodMock(q, 'reevaluateConditions_');
  mock.createMethodMock(q, 'fixLinks_');

  q.reevaluateConditions_();
  q.fixLinks_(root);

  mock.$replayAll();
  q.render();
  mock.$verifyAll();

  assertEquals(root.firstChild, goog.dom.getElement(q.rootBlock_.id));
}


/**
 * Tests whether items with auth set to 'admin' are visible in admin-mode and
 * invisible otherwise.
 */
function testAdminMode() {
  var q = new vsaq.Questionnaire(root);
  var temp = goog.array.clone(QUESTIONNAIRE);
  temp[0].items[2].id = 'block_id2';
  q.setTemplate(temp);
  block = q.items_['block_id2'];

  // No auth parameter set.
  assertTrue(block.isVisible());

  // Auth parameter set, and not in admin mode.
  block.auth = 'admin';
  q.setAdminMode(false);
  q.reevaluateConditions_();
  assertFalse(block.isVisible());

  // Auth parameter set and in admin mode.
  q.setAdminMode(true);
  q.reevaluateConditions_();
  assertTrue(block.isVisible());
}


/**
 * Tests merging of two templates.
 * The extension template holds a line item that is getting added after the
 * RADIO2 item in the base template.
 */
function testSetMultipleTemplates() {
  var extensionItemId = 'extension_test_id';
  var extensionItem = {
    id: extensionItemId,
    type: 'line',
    text: HTML_STRING,
    insertBefore: RADIO2['id']
  };

  var baseQuestionnaire = {'questionnaire': [BLOCK1], 'version': 4};
  var extension = {
    'extensions': [extensionItem], 'version': 4, 'namespace': 'test'};

  var q = new vsaq.Questionnaire(root);
  q.setMultipleTemplates(baseQuestionnaire, extension);

  // Make sure that the line item from the extension is rendered and visible.
  var rendered_extension_item = q.items_[extensionItem['id']];
  assertTrue(rendered_extension_item.isVisible());

  // Make sure that the line item was inserted after RADIO2.
  var block1Items = BLOCK1['items'];
  var extensionItemPos = goog.array.indexOf(block1Items, extensionItem);
  var elementAfter = block1Items[extensionItemPos + 1];
  assertEquals(RADIO2, elementAfter);

  // Make sure that the namespace was applied to inserted item id.
  assertEquals(
      extension['namespace'] + ':' + extensionItemId, extensionItem['id']);

  // Namespace of items in base template should not have changed.
  assertEquals('radio_id2', RADIO2['id']);
}


/**
 * Tests merging of three templates.
 */
function testSetMultipleTemplatesWithThreeTemplates() {
  var extensionItem1Id = 'extension1_test_id';
  var extensionItem1 = {
    id: extensionItem1Id,
    type: 'line',
    text: HTML_STRING,
    insertAfter: RADIO2['id']
  };

  var extensionItem2Id = 'extension2_test_id';
  var extensionItem2 = {
    id: extensionItem2Id,
    type: 'info',
    text: HTML_STRING,
    insertAfter: RADIO2['id']
  };

  var baseQuestionnaire = {'questionnaire': [BLOCK1], 'version': 4};
  var extension1 = {
    'extensions': [extensionItem1], 'version': 4, 'namespace': 'test1'};
  var extension2 = {
    'extensions': [extensionItem2], 'version': 4, 'namespace': 'test2'};

  var q = new vsaq.Questionnaire(root);
  q.setMultipleTemplates(baseQuestionnaire, extension1, extension2);

  // Make sure that items from extensions are rendered and visible.
  var rendered_extension1_item = q.items_[extensionItem1['id']];
  assertTrue(rendered_extension1_item.isVisible());
  var rendered_extension2_item = q.items_[extensionItem2['id']];
  assertTrue(rendered_extension2_item.isVisible());

  // Make sure that inserted items from extensions are at the right position.
  // Since extension2 was applied after extension1 with
  // "insertAfter: RADIO2['id']", the new order should look like:
  //   [..., RADIO2, extensionItem2, extensionItem1, ...]
  var block1Items = BLOCK1['items'];
  var radio2Pos = goog.array.indexOf(block1Items, RADIO2);
  var element1PositionAfterRadio = block1Items[radio2Pos + 1];
  var element2PositionsAfterRadio = block1Items[radio2Pos + 2];
  assertEquals(extensionItem2, element1PositionAfterRadio);
  assertEquals(extensionItem1, element2PositionsAfterRadio);

  // Make sure that the namespaces were applied to inserted item ids.
  assertEquals(
      extension1['namespace'] + ':' + extensionItem1Id, extensionItem1['id']);
  assertEquals(
      extension2['namespace'] + ':' + extensionItem2Id, extensionItem2['id']);
}


/**
 * Tests that an exception is thrown, if insertAfter and insertBefore are both
 * present in items of an extension template.
 */
function testSetMultipleTemplatesVersionMismatch() {
  var extensionItem = {
    id: 'extension_test_id',
    type: 'line',
    text: HTML_STRING,
    insertBefore: RADIO2['id'],
    insertAfter: RADIO2['id']
  };

  var baseQuestionnaire = {'questionnaire': [BLOCK1], 'version': 4};
  var extension = {'extensions': [extensionItem], 'version': 4};

  var q = new vsaq.Questionnaire(root);

  assertThrows(
      function() {q.setMultipleTemplates(baseQuestionnaire, extension)});
}


/**
 * Tests that an exception is thrown, if multiple templates, having different
 * versions, are set.
 */
function testSetMultipleTemplatesVersionMismatch() {
  var baseQuestionnaire = {'questionnaire': QUESTIONNAIRE, 'version': 3};
  var extension = {'extensions': null, 'version': 4};

  var q = new vsaq.Questionnaire(root);

  assertThrows(
      function() {q.setMultipleTemplates(baseQuestionnaire, extension)});
}


/**
 * Tests whether setMultipleTempaltes falls back to setTemplate if only one
 * template was provided.
 */
function testSetMultipleTemplatesFallback() {
  var baseQuestionnaire = {'questionnaire': QUESTIONNAIRE};
  var q = new vsaq.Questionnaire(root);

  mock = new goog.testing.MockControl();
  mock.createMethodMock(q, 'setTemplate');
  q.setTemplate(QUESTIONNAIRE);

  mock.$replayAll();
  q.setMultipleTemplates(baseQuestionnaire);
  mock.$verifyAll();
}


/**
 * Tests updating ids in a questionnaire template.
 */
function testAddNamespaceToIds() {
  var q = new vsaq.Questionnaire(root);
  q.addNamespaceToIds_([BLOCK2], 'test');
  assertEquals('test:tip_id', TIP['id']);
  assertEquals('test:whytip_id', WHYTIP['id']);
}

