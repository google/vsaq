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
 * @fileoverview Interactive questionnaire.
 *
 * The code in this file renders an HTML questionnaire defined by a JSON
 * structure. Questions in the questionnaire can be assigned conditions under
 * which they are shown to the user, making the questionnaire interactive (i.e.
 * different questions are asked based on previous answers the user provided).
 * Questionnaires are typically organized in blocks, on the one hand to group
 * questions, and on the other hand to make it easier to apply conditions (they
 * can be applied to an entire block, as opposed to each question individually).
 * The blocks can be nested within each other as well.
 *
 * E.g.:
 * - q1: this is a yes/no question
 * - block (only show if q1 is 'yes')
 * | - q2: this is a nested yes/no question
 * | - a nested block (only show if q2 is 'no')
 *   | - another question
 * ...
 *
 */

goog.provide('vsaq.Questionnaire');
goog.provide('vsaq.questionnaire.QuestionnaireError');

goog.require('goog.Promise');
goog.require('goog.array');
goog.require('goog.debug.Console');
goog.require('goog.debug.Error');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.events');
goog.require('goog.events.Event');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('goog.json');
goog.require('goog.log');
goog.require('goog.object');
goog.require('goog.soy');
goog.require('goog.structs');
goog.require('vsaq.questionnaire.items.BlockItem');
goog.require('vsaq.questionnaire.items.BoxItem');
goog.require('vsaq.questionnaire.items.CheckItem');
goog.require('vsaq.questionnaire.items.CheckgroupItem');
goog.require('vsaq.questionnaire.items.GroupItem');
goog.require('vsaq.questionnaire.items.InfoItem');
goog.require('vsaq.questionnaire.items.Item');
goog.require('vsaq.questionnaire.items.LineItem');
goog.require('vsaq.questionnaire.items.ParseError');
goog.require('vsaq.questionnaire.items.RadioItem');
goog.require('vsaq.questionnaire.items.RadiogroupItem');
goog.require('vsaq.questionnaire.items.SpacerItem');
goog.require('vsaq.questionnaire.items.TipItem');
goog.require('vsaq.questionnaire.items.UploadItem');
goog.require('vsaq.questionnaire.items.ValueItem');
goog.require('vsaq.questionnaire.items.YesNoItem');
goog.require('vsaq.questionnaire.items.factory');
goog.require('vsaq.questionnaire.templates');



/**
 * Class to represent all generic questionnaire errors.
 * @param {*=} opt_msg An optional error message.
 * @constructor
 * @extends {goog.debug.Error}
 */
vsaq.questionnaire.QuestionnaireError = function(opt_msg) {
  goog.base(this, opt_msg);
};
goog.inherits(vsaq.questionnaire.QuestionnaireError, goog.debug.Error);



/**
 * An interactive questionnaire.
 *
 * This class allows to display an interactive questionnaire to the user, under
 * the {@code Element} passed as a parameter to the constructor.
 *
 * <p>After instantiation, the questions and structure of the questionnaire need
 * to be provided by setting an Array of {@code vsaq.questionnaire.items.Item}s
 * with {@code setTemplate}. If previous answers have been recorded, those can
 * be loaded with {@code setValues}.</p>
 *
 * <p>Calling {@code render} will display the questionnaire to the user. It
 * should be called only after setting a template.</p>
 *
 * <p>Any changes the user makes to the questionnaire cause an {@code
 * goog.events.EventType.CHANGE} event to be raised. At any given time, the
 * currently selected answers can be exported through {@code getValuesAsJson}
 * in JSON format.</p>
 *
 * @constructor
 * @param {!Element} rootElement The element under which the questionnaire
 *     should be rendered.
 * @extends {goog.events.EventTarget}
 */
vsaq.Questionnaire = function(rootElement) {
  goog.events.EventTarget.call(this);
  goog.debug.Console.autoInstall();
  this.logger_ = goog.log.getLogger('vsaq.Questionnaire');

  /**
   * A dictionary of all items, where their ID is the key.
   * @type {!Object.<string, (!vsaq.questionnaire.items.Item)>}
   * @private
   */
  this.items_ = {};

  /**
   * Holds the individual items the quesitonnaire consists of.
   * @type {!vsaq.questionnaire.items.ItemArray}
   * @private
   */
  this.template_ = [];

  /**
   * Stores the values of the answers to the questions in a dictionary where
   * the keys are the items' ids (see {@code vsaq.questionnaire.items.Item.id}),
   * and the values are the answers.
   * @type {!Object.<string, string>}
   * @private
   */
  this.values_ = {};

  /**
   * The root element under which the questionnaire will be rendered.
   * @type {!Element}
   * @private
   */
  this.rootElement_ = rootElement;

  /**
   * Whether events are captured or not. This is because while the questionnaire
   * is updated through {@code setValues} no events must be sent.
   * @type {boolean}
   * @private
   */
  this.isCapturingEvents_ = true;

  /**
   * If true, the questionnaire will be rendered in unrolled mode, i.e. all
   * items will be shown, regardless of whether conditions are met or not.
   * @type {boolean}
   * @private
   */
  this.unrolledMode_ = false;

  /**
   * If true, the questionnaire will be rendered in admin mode, i.e. also
   * admin items will be shown.
   * @type {boolean}
   * @private
   */
  this.adminMode_ = false;

  /**
   * If true, the questionnaire cannot be edited by the user.
   * @type {boolean}
   * @private
   */
  this.readonlyMode_ = false;

  /**
   * If true, the todo list will be rendered.
   * @type {boolean}
   * @private
   */
  this.showTodo_ = false;

  /**
   * The element into which the todo list is rendered.
   * @type {!Element}
   * @private
   */
  this.todoListElement_ = goog.dom.createDom(goog.dom.TagName.DIV);

  /**
   * If true, the template for the questionnaire contains TODOs in old format.
   * @type {boolean}
   * @private
   */
  this.oldTodoFormat_ = false;

  /**
   * A resolver that is used to allow further objects like the editor to get
   * involved once the questionnaire has been loaded.
   * @type {!goog.promise.Resolver}
   * @private
   */
  this.resolver_ = goog.Promise.withResolver();

};
goog.inherits(vsaq.Questionnaire, goog.events.EventTarget);



/**
 * An event object for signalling changes that were made in a questionnaire.
 *
 * @constructor
 * @param {string} type Event type.
 * @param {Object=} opt_target Reference to the object that is the target of
 *     this event.
 * @extends {goog.events.Event}
 */
vsaq.Questionnaire.ChangeEvent = function(type, opt_target) {
  goog.events.Event.call(this, type, opt_target);

  /**
   * A dictionary containing the changes to the questionnaire. The keys are the
   * IDs of the changed question, and the value is the newly selected answer.
   * @type {Object.<string, string>}
   */
  this.changes = {};
};
goog.inherits(vsaq.Questionnaire.ChangeEvent, goog.events.Event);


/**
 * The block forming the root of the questionnaire.
 * @type {vsaq.questionnaire.items.BlockItem}
 * @private
 */
vsaq.Questionnaire.prototype.rootBlock_;


/**
 * Root block getter.
 * @return {vsaq.questionnaire.items.BlockItem} The root block.
 */
vsaq.Questionnaire.prototype.getRootBlock = function() {
  return this.rootBlock_;
};


/**
 * Handles clicks on controls.
 * @param {!vsaq.Questionnaire.ChangeEvent} e The event.
 * @private
 */
vsaq.Questionnaire.prototype.answerChanged_ = function(e) {
  // If event capturing is disabled, we can bail out.
  if (!this.isCapturingEvents_) return;

  goog.object.extend(this.values_, e.changes);

  // Now tell whomever is listening as well that something changed.
  this.dispatchChange_(e.changes);

  // Don't reevaluate conditions for line, tip or box items too often.
  if (e.source instanceof vsaq.questionnaire.items.LineItem ||
      e.source instanceof vsaq.questionnaire.items.BoxItem ||
      e.source instanceof vsaq.questionnaire.items.TipItem) {
    this.reevaluateConditionsLater_();
  } else {
    this.reevaluateConditions_();
  }
};


/**
 * Fixes all <a href=...> links that have no target attribute specified to open
 * in a new window.
 * @param {!Element} start Element to start fixing the links from.
 * @private
 */
vsaq.Questionnaire.prototype.fixLinks_ = function(start) {
  goog.events.listen(start, goog.events.EventType.CLICK, function(e) {
    if (e.target instanceof HTMLAnchorElement && e.target.target == '') {
      e.target.target = '_blank';
    }
    return true;
  });
};


/**
 * Sends a goog.events.EventType.CHANGE event.
 * @param {Object.<string, string>} changes Dictionary-like object that has the
 *     changed values (e.g. {'question_id': 'new updated value'}, indexed by the
 *     id of the changed question.
 * @private
 */
vsaq.Questionnaire.prototype.dispatchChange_ = function(changes) {
  var ev = {
    type: goog.events.EventType.CHANGE,
    changedValues: changes
  };

  this.dispatchEvent(ev);
};


/**
 * Reevaluates the conditions in the questionnaire. Based on those evaluations
 * either shows or hides parts of the questionnaire. This function must be
 * called whenever values in the questionnaire that have an effect on conditions
 * (radio buttons, check boxes, Yes/No questions) change.
 * @private
 */
vsaq.Questionnaire.prototype.reevaluateConditions_ = function() {
  var todos = [];
  var todoStatus = {};
  // Show and hide items in the questionnaire
  goog.structs.forEach(this.items_, function(item, id, items) {
    if (item instanceof vsaq.questionnaire.items.ValueItem)
      item.setReadOnly(this.readonlyMode_);

    if ((item.auth == 'admin' && !this.adminMode_) ||
        item.className == 'vsaq-invisible') {
      item.setVisibility(false);
    } else {
      item.setVisibility(this.unrolledMode_ ||
          item.evaluateConditions(items));
    }

    if ((item instanceof vsaq.questionnaire.items.TipItem) &&
        (item.isVisible()) && (item.todo.length > 0)) {
      var todoKey = 'vsaq_todo_' + item.id;
      todos.push({
        key: todoKey,
        description: soydata.VERY_UNSAFE.ordainSanitizedHtml(item.todo)
      });
      todoStatus[todoKey] = this.values_[todoKey];
    }
  }, this);

  // Show todo list
  goog.dom.removeChildren(this.todoListElement_);
  if (!this.oldTodoFormat_) {
    this.todoListElement_.appendChild(goog.soy.renderAsElement(
        vsaq.questionnaire.templates.todoList,
        {todoListItems: todos, todoStatus: todoStatus}));
  }
};


/**
 * Calls reevaluateConditions_ once every REEVALUATE_CONDITIONS_DELAY_.
 * @private
 */
vsaq.Questionnaire.prototype.reevaluateConditionsLater_ = function() {
  if (!goog.isDefAndNotNull(this.reevaluateTimer_)) {
    this.reevaluateTimer_ = setTimeout(goog.bind(function() {
      this.reevaluateTimer_ = null;
      this.reevaluateConditions_();
    }, this), this.REEVALUATE_CONDITIONS_DELAY_);
  }
};


/**
 * The timer used to reevaluate conditions.
 * @type {?number}
 * @private
 */
vsaq.Questionnaire.prototype.reevaluateTimer_ = null;


/**
 * Miliseconds to wait when delaying reevaluating conditions.
 * @const {number}
 * @private
 */
vsaq.Questionnaire.prototype.REEVALUATE_CONDITIONS_DELAY_ = 1e3;


/**
 * Sets or unsets the questionnaire to unrolled-mode (i.e. all items will be
 * shown, regardless of whether conditions are matched or not).
 * @param {boolean} isOn If true, the questionnaire will be shown in
 *     unrolled mode.
 */
vsaq.Questionnaire.prototype.setUnrolledMode = function(isOn) {
  this.unrolledMode_ = isOn;
};


/**
 * Sets or unsets admin-mode (i.e. also admin items will be shown.)
 * @param {boolean} isAdmin If true, the questionnaire will be shown in
 *     admin mode.
 */
vsaq.Questionnaire.prototype.setAdminMode = function(isAdmin) {
  this.adminMode_ = isAdmin;
};


/**
 * Sets or unsets readonly-mode.
 * @param {boolean} isReadOnly If true, the questionnaire will be shown in
 *     readonly mode.
 */
vsaq.Questionnaire.prototype.setReadOnlyMode = function(isReadOnly) {
  this.readonlyMode_ = isReadOnly;
};


/**
 * Sets or unsets visibility of the todo section.
 * @param {boolean} isTodoVisible If true, the todo section will be rendered.
 */
vsaq.Questionnaire.prototype.setShowTodo = function(isTodoVisible) {
  this.showTodo_ = isTodoVisible;
};


/**
 * Sets the recursive template for the questionnaire.
 * @param {!vsaq.questionnaire.items.ItemArray} template The template for
 *     questionnaire.
 * @param {string} parentId The id of the current parent id.
 * @throws {vsaq.questionnaire.items.ParseError}
 */
vsaq.Questionnaire.prototype.setRecursiveTemplate =
    function(template, parentId) {

  var parentItem = this.items_[parentId];
  if (!(parentItem instanceof vsaq.questionnaire.items.BlockItem))
    throw new vsaq.questionnaire.items.ParseError(
        'Invalid parent item passed, id: ' + parentId);

  var itemStack = goog.array.clone(template);
  while (itemStack.length) {
    var currentObject = goog.object.clone(itemStack[0]);
    var item = vsaq.questionnaire.items.Item.parse(itemStack);

    parentItem.addItem(item);
    item.parentItemSet(parentItem);

    goog.events.listen(item.eventDispatcher,
        vsaq.questionnaire.items.Item.CHANGED,
        goog.bind(this.answerChanged_, this));
    goog.events.listen(item.eventDispatcher,
        vsaq.questionnaire.items.Item.SHOWN,
        goog.bind(this.dispatchEvent, this));
    goog.events.listen(item.eventDispatcher,
        vsaq.questionnaire.items.Item.HIDDEN,
        goog.bind(this.dispatchEvent, this));
    if (this.items_[item.id])
      throw new vsaq.questionnaire.items.ParseError(
          'Duplicate item id: ' + item.id);
    this.items_[item.id] = item;

    if (item instanceof vsaq.questionnaire.items.BlockItem) {
      // These items might contain further items.
      if (currentObject['items'].length > 0)
        this.setRecursiveTemplate(currentObject['items'], item.id);
    } else if (item instanceof vsaq.questionnaire.items.GroupItem) {
      // Add all group items to the list of known items.
      var containerItems = item.getContainerItems();
      goog.array.forEach(containerItems, function(item) {
        this.items_[item.id] = item;
      }, this);
    }
  }
};


/**
 * Returns a promise that can be used to call a function once the
 * questionnaire has been loaded.
 * @return {!goog.Promise}
 */
vsaq.Questionnaire.prototype.done = function() {
  return this.resolver_.promise;
};


/**
 * Sets the template object for the questionnaire. If the template is not
 * in a valid format, a {@code vsaq.questionnaire.items.ParseError} is thrown.
 * @param {!vsaq.questionnaire.items.ItemArray} template The template for
 *     questionnaire.
 * @throws {vsaq.questionnaire.items.ParseError}
 */
vsaq.Questionnaire.prototype.setTemplate = function(template) {
  var tmp = /** @type {!vsaq.questionnaire.items.ItemArray} */ (
      goog.object.unsafeClone(template));
  var currentObject = goog.object.clone(tmp[0]);
  var rootItem = vsaq.questionnaire.items.Item.parse(tmp);

  if (!(rootItem instanceof vsaq.questionnaire.items.BlockItem))
    throw new vsaq.questionnaire.items.ParseError(
        'All items must be contained in a block.');

  this.rootBlock_ =
      /** @type {!vsaq.questionnaire.items.BlockItem} */ (rootItem);
  this.items_ = {};
  this.items_[rootItem.id] = rootItem;

  // Check if root element has right format.
  if (!currentObject.hasOwnProperty('items') || template.length > 1)
    throw new vsaq.questionnaire.items.ParseError(
        'All items must be contained in one root block.');

  this.setRecursiveTemplate(currentObject['items'], rootItem.id);
  this.template_ = template;

  // Inform everyone that the questionnaire has been loaded.
  this.resolver_.resolve();
};


/**
 * Merges multiple templates and sets them as questionnaire.
 *
 * Note: The order in which template extension are passed matters.
 * If the extension templates is not in a valid format, a
 * {@code vsaq.questionnaire.QuestionnaireError} is thrown.
 *
 * @param {!Object} baseTemplate The base template for the questionnaire.
 * @param {...!Object} var_args Template extensions that extend the baseTemplate
 *     (e.g. company specific questions).
 * @throws {vsaq.questionnaire.QuestionnaireError}
 */
vsaq.Questionnaire.prototype.setMultipleTemplates = function(
    baseTemplate, var_args) {
  var count = arguments.length;
  var baseTemplateVersion = baseTemplate['version'];
  var questionnaireTemplate =
      /** @type {!vsaq.questionnaire.items.ItemArray} */
      (baseTemplate['questionnaire']);

  // If only baseTemplate was specified use normal setTemplate.
  if (count < 2) {
    this.setTemplate(questionnaireTemplate);
    return;
  }

  // Iterate over extension templates (omit first argument).
  for (var i = 1; i < count; i++) {
    var template = arguments[i];

    // Ensure version is compatible
    var version = template['version'];
    if (version != baseTemplateVersion) {
      throw new vsaq.questionnaire.QuestionnaireError(
          'Extension templates must match version of base template.');
    }

    this.extendBaseTemplate_(baseTemplate, template);
  }

  // load updated baseTemplate
  this.setTemplate(questionnaireTemplate);
};


/**
 * Inserts all items of an extension template into the specified position of the
 * baseTemplate.
 * If extension templates are not in a valid format, a
 * {@code vsaq.questionnaire.QuestionnaireError} is thrown.
 * @param {!Object} baseTemplate The base template where items will be insteted.
 * @param {!Object} extensionTemplate Template that extends the baseTemplate
 *     (e.g. company specific questions).
 * @throws {vsaq.questionnaire.QuestionnaireError}
 * @private
 */
vsaq.Questionnaire.prototype.extendBaseTemplate_ = function(
    baseTemplate, extensionTemplate) {
  var extensions = extensionTemplate['extensions'];

  // Apply namespace to item ids.
  if (extensionTemplate.hasOwnProperty('namespace')) {
    this.addNamespaceToIds_(extensions, extensionTemplate['namespace']);
  }

  for (var i = 0, extension; extension = extensions[i]; i++) {
    var insertBefore = undefined;
    var insertAfter = undefined;
    if (extension.hasOwnProperty('insertBefore')) {
      insertBefore = extension['insertBefore'];
    }
    if (extension.hasOwnProperty('insertAfter')) {
      insertAfter = extension['insertAfter'];
    }

    // Ensure that exactly one property is set.
    if ((insertBefore && insertAfter) || (!insertBefore && !insertAfter)) {
      throw new vsaq.questionnaire.QuestionnaireError(
          'Extension item at position ' + i + ' in extension array must have ' +
          'either an insertBefore or an insertAfter property set');
    }

    // Insert extension into baseTemplate.
    var targetItemId = insertBefore || insertAfter;
    var success = this.insertItemIntoTemplate_(
        baseTemplate['questionnaire'], extension, targetItemId, insertAfter);
    if (!success) {
      throw new vsaq.questionnaire.QuestionnaireError(
          'Target item id "' + targetItemId + '" was not found. Check ' +
          '"insertBefore" or "insertAfter" property');
    }
  }
};


/**
 * Inserts an item before or after a targetItem of a questionaire template.
 * @param {!vsaq.questionnaire.items.ItemArray} template Array of template items
 * @param {!vsaq.questionnaire.items.Item} newItem Item to insert.
 * @param {!string} targetItemId Item id wher new item should get inserted.
 * @param {boolean=} opt_insertAfter If true, item is insert after target item.
 * @return {boolean} True, if operation was successful.
 * @private
 */
vsaq.Questionnaire.prototype.insertItemIntoTemplate_ = function(
    template, newItem, targetItemId, opt_insertAfter) {

  var success = false;

  // Deep search for target item.
  for (var i = 0, item; item = template[i]; i++) {
    // Target item found. Item is inserted before or after.
    if (item.hasOwnProperty('id') && item['id'] == targetItemId) {
      if (opt_insertAfter) {
        goog.array.insertAt(template, newItem, i + 1);
      } else {
        goog.array.insertAt(template, newItem, i);
      }

      return true;
    }

    // We need to go deeper.
    if (item.hasOwnProperty('items')) {
      success |= this.insertItemIntoTemplate_(
          item['items'], newItem, targetItemId, opt_insertAfter);
    }
  }

  return success;
};


/**
 * Adds a namespace to ids of all items in a template.
 * @param {!vsaq.questionnaire.items.ItemArray} items Array of template items.
 * @param {!string} namespace Namespace which is added as prefix to item ids.
 * @private
 */
vsaq.Questionnaire.prototype.addNamespaceToIds_ = function(items, namespace) {
  for (var i = 0, item; item = items[i]; i++) {
    if (item.hasOwnProperty('id')) {
      item['id'] = namespace + ':' + item['id'];
    }
    if (item.hasOwnProperty('items')) {
      this.addNamespaceToIds_(item['items'], namespace);
    }
    if (item.hasOwnProperty('choices')) {
      for (var j = 0, choice; choice = item['choices'][j]; j++) {
        var key = goog.object.getKeys(choice)[0];
        choice[namespace + ':' + key] = choice[key];
        delete choice[key];
      }
    }
  }
};


/**
 * Sets or updates the values for the current questionnaire. Setting this causes
 * the questionnaire to be re-drawn.
 * @param {!Object.<string, string>} values A dictionary containing the IDs of
 *     the questions as keys, and the values as values.
 * @param {boolean=} opt_scrollThere If true, scrolls to the item changed.
 */
vsaq.Questionnaire.prototype.setValues = function(values, opt_scrollThere) {
  this.values_ = values;

  // Set the new values. We need to disable events during that time, as
  // we don't want to dispatch CHANGE events for change *to* the desired state.
  this.isCapturingEvents_ = false;
  goog.structs.forEach(this.values_, function(value, id) {
    var item = this.items_[id];
    if (!item) {
      this.logger_.warning(
          'Answers refer to item "' + id + '", which does not seem to exist.');
      return;
    }
    if (!(item instanceof vsaq.questionnaire.items.ValueItem)) {
      this.logger_.warning(
          'Answer refers to item "' + id + '", which cannot have a value');
      return;
    }
    item = /** @type {vsaq.questionnaire.items.ValueItem} */ (item);
    item.setValue(value);
    if (opt_scrollThere) item.container.scrollIntoViewIfNeeded(true);
  }, this);
  this.isCapturingEvents_ = true;

  this.reevaluateConditions_();
};


/**
 * Returns the serialized values of questionnaire as a JSON string.
 * @return {string} Values of the questionnaire serialized as JSON string.
 */
vsaq.Questionnaire.prototype.getValuesAsJson = function() {
  return goog.json.serialize(this.values_);
};


/**
 * Returns the template of the questionnaire as array of QuestionnaireItems.
 * @return {!vsaq.questionnaire.items.ItemArray} The current questionnaire's
 *     template.
 */
vsaq.Questionnaire.prototype.getTemplate = function() {
  return this.template_;
};


/**
 * Returns the root element into which the questionnaire is rendered.
 * @return {!Element} The questionnaire's root element.
 */
vsaq.Questionnaire.prototype.getRootElement = function() {
  return this.rootElement_;
};


/**
 * Returns a requested item.
 * @param {string} index The requested item's id.
 * @return {?vsaq.questionnaire.items.Item} The requested item.
 */
vsaq.Questionnaire.prototype.getItem = function(index) {
  if (!(this.items_.hasOwnProperty(index)))
    return null;
  return this.items_[index];
};


/**
 * Returns an object with all items in the questionnaire. The keys in the object
 * are the items' IDs.
 * @return {!Object.<string, (!vsaq.questionnaire.items.Item|!Object)>}
 */
vsaq.Questionnaire.prototype.getItems = function() {
  return this.items_;
};


/**
 * Renders the questionnaire into the root element passed to the constructor.
 */
vsaq.Questionnaire.prototype.render = function() {
  this.isCapturingEvents_ = false;

  goog.dom.removeChildren(this.rootElement_);
  if (this.rootBlock_) {
    this.rootElement_.appendChild(this.rootBlock_.container);
    if (this.showTodo_) {
      this.rootElement_.appendChild(this.todoListElement_);
    }
  }

  this.isCapturingEvents_ = true;

  this.reevaluateConditions_();
  this.fixLinks_(this.rootElement_);
};


/**
 * Resets the answers for the questionnaire.
 */
vsaq.Questionnaire.prototype.reset = function() {
  this.setTemplate(this.template_);
  this.render();
};


/**
 * Specify a container for TODO list.
 * @param {!Element} el Element to contain the todo list.
 */
vsaq.Questionnaire.prototype.setTodoListElement = function(el) {
  this.todoListElement_ = el;
  this.reevaluateConditions_();
};


// The following questionnaire items are necessary for the questionnaire and
// therefore added to the factory.
goog.scope(function() {
var items = vsaq.questionnaire.items;
items.factory.clear();
items.factory.add(items.BoxItem.TYPE, items.BoxItem.parse);
items.factory.add(items.CheckItem.TYPE, items.CheckItem.parse);
items.factory.add(items.InfoItem.TYPE, items.InfoItem.parse);
items.factory.add(items.LineItem.TYPE, items.LineItem.parse);
items.factory.add(items.RadioItem.TYPE, items.RadioItem.parse);
items.factory.add(items.SpacerItem.TYPE, items.SpacerItem.parse);
items.factory.add(items.BlockItem.TYPE, items.BlockItem.parse);
items.factory.add(items.TipItem.TYPE, items.TipItem.parse);
items.factory.add(items.UploadItem.TYPE, items.UploadItem.parse);
items.factory.add(items.YesNoItem.TYPE, items.YesNoItem.parse);
items.factory.add(items.CheckgroupItem.TYPE, items.CheckgroupItem.parse);
items.factory.add(items.RadiogroupItem.TYPE, items.RadiogroupItem.parse);
});  // goog.scope
