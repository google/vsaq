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
 * @fileoverview Questionnaire Items.
 *
 * The code in this file describes the base classes for all questionnaire items.
 * An item is usually derived from either {vsaq.questionnaire.items.Item} or
 * from {vsaq.questionnaire.items.ValueItem}. The former is used only for items
 * that cannot have a value (e.g. static text). The later must be used for all
 * items that allow the user to provide an answer.
 */

goog.provide('vsaq.questionnaire.items.Item');
goog.provide('vsaq.questionnaire.items.ItemArray');
goog.provide('vsaq.questionnaire.items.ParseError');
goog.provide('vsaq.questionnaire.items.ValueItem');
goog.provide('vsaq.questionnaire.items.factory');

goog.require('goog.debug.Error');
goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('goog.events.EventTarget');
goog.require('goog.object');
goog.require('goog.string');
goog.require('goog.structs.LinkedMap');
goog.require('vsaq.questionnaire.utils');


/**
 * Array of questionnaire items.
 * @typedef {Array.<!vsaq.questionnaire.items.Item>}
 */
vsaq.questionnaire.items.ItemArray;



/**
 * Class to represent all parsing errors.
 * @param {*=} opt_msg An optional error message.
 * @constructor
 * @extends {goog.debug.Error}
 */
vsaq.questionnaire.items.ParseError = function(opt_msg) {
  goog.base(this, opt_msg);
};
goog.inherits(vsaq.questionnaire.items.ParseError, goog.debug.Error);



/**
 * Base class for all questionnaire items.
 * <p>All items derived from this base class need to have a property
 * `TYPE`, which holds the identifier that is used for the particular item
 * kind in the serialized format.</p>
 * @param {?string} id An ID uniquely identifying the question.
 * @param {?string} conditions A string containing conditions which must be met
 *     for the item to be visible to the user.
 * @constructor
 */
vsaq.questionnaire.items.Item = function(id, conditions) {
  /**
   * An array that keeps track of item properties. As such a property can be
   * for example mandatory or metadata (has no effect on item layout). Those
   * information are used for the questionnaire editor.
   * @type {!goog.structs.LinkedMap}
   */
  this.propertiesInformation = new goog.structs.LinkedMap();

  /**
   * A string containing the item type e.g. checkbox.
   * @type {string}
   */
  this.type = '';
  var propertyInformation = {
    nameInClass: 'type',
    mandatory: true,
    unchangeable: true,
    metadata: true
  };
  this.addPropertyInformation('type', propertyInformation);

  /**
   * Id as it originally appeared in the template.
   * @type {?string}
   */
  this.templateItemId = id;
  propertyInformation = {
    nameInClass: 'templateItemId',
    metadata: true
  };
  this.addPropertyInformation('id', propertyInformation);

  /**
   * A string uniquely identifying the question.
   * @type {string}
   */
  this.id = goog.string.makeSafe(id) || goog.string.createUniqueString();



  /**
   * Conditions to evaluate whether the item should be visible to the user.
   * Conditions can only be provided as a single string with a boolean
   * expression in Javascript style.
   * @type {string}
   */
  this.conditions = conditions || '';
  propertyInformation = {
    nameInClass: 'conditions',
    metadata: true
  };
  this.addPropertyInformation('cond', propertyInformation);

  /**
   * The container this item is part of. If this item is the root of the
   * questionnaire, this property is undefined;
   * @type {vsaq.questionnaire.items.ContainerItem}
   */
  this.parentItem;

  /**
   * The item's HTML Element.
   * @type {!Element}
   */
  this.container = goog.dom.createElement('div');

  /**
   * The HTML Element containing info options (normally not used).
   * @type {?Element}
   */
  this.editItemPrefix = null;

  /**
   * The HTML Element containing edit options (normally not used).
   * @type {?Element}
   */
  this.editItemSuffix = null;

  /**
   * Used to dispatch events relevant to the item.
   * @type {!goog.events.EventTarget}
   */
  this.eventDispatcher = new goog.events.EventTarget();
};


/**
 * Render the HTML for this item.
 */
vsaq.questionnaire.items.Item.prototype.render = goog.abstractMethod;


/**
 * All possible item properties that can be set and their default values.
 * @type {Object.<string, *>}
 * @const
 */
vsaq.questionnaire.items.Item.POSSIBLE_PROPERTY_INFORMATION = {
  nameInClass: '',
  mandatory: false,
  unchangeable: false,
  metadata: false,
  defaultValues: {}
};


/**
 * Add information about a new item property.
 * Note: setting information for properties is optional since an undefined
 * property is regarded as false in this context.
 * @param {string} propertyName The name of the property within the template.
 * @param {Object} propertyInformation An object containing all property
 *     information.
 */
vsaq.questionnaire.items.Item.prototype.addPropertyInformation = function(
    propertyName, propertyInformation) {
  // Ensure that the property is accessible even after mingling.
  goog.exportProperty(this, propertyInformation.nameInClass,
      this[propertyInformation.nameInClass]);

  var newPropertyInformation = {};
  goog.object.forEach(
      vsaq.questionnaire.items.Item.POSSIBLE_PROPERTY_INFORMATION,
      function(propertyDefaultValue, propertyKey) {
        if (!propertyInformation.hasOwnProperty(propertyKey))
          return;
        var newPropertyValue = propertyInformation[propertyKey];
        if (!(typeof propertyDefaultValue === typeof newPropertyValue))
          throw new vsaq.questionnaire.items.ParseError(
              'Found invalid property type in passed property information...');
        newPropertyInformation[propertyKey] = newPropertyValue;
      }
  );
  this.propertiesInformation.set(propertyName, newPropertyInformation);
};


/**
 * Get information about an item property either by providing its template name
 * or its class name.
 * @param {string} propertyName The name of the property within the template.
 * @param {string=} opt_nameInClass The name of the property in the class.
 * @return {Object} An object containing all property information.
 */
vsaq.questionnaire.items.Item.prototype.getPropertyInformation = function(
    propertyName, opt_nameInClass) {

  if (opt_nameInClass) {
    var resolvedPropertyInformation = null;
    this.propertiesInformation.some(function(propertyAttributes, propertyKey) {
      if (propertyAttributes.nameInClass == opt_nameInClass) {
        resolvedPropertyInformation = propertyAttributes;
        return true;
      } else {
        return false;
      }
    }, this);
    return resolvedPropertyInformation;
  }
  return this.propertiesInformation.get(propertyName);
};


/**
 * Update the current values of the item to be exported and return the
 * corresponding (updated) property information.
 * @return {!goog.structs.LinkedMap}
 * @throws {vsaq.questionnaire.items.ParseError}
 */
vsaq.questionnaire.items.Item.prototype.getPropertiesInformation = function() {
  this.propertiesInformation.forEach(function(propertyAttributes) {
    if (!this.hasOwnProperty(propertyAttributes.nameInClass))
      throw new vsaq.questionnaire.items.ParseError(
          'Invalid property to be exported detected...');
    propertyAttributes.value = this[propertyAttributes.nameInClass];
    // If value is a boolean we need to lookup the template translation.
    // For example true could be "yes" and false could be "no" in the template.
    if (typeof propertyAttributes.value === 'boolean') {
      var booleanString = propertyAttributes.value.toString();
      var defaultValues = propertyAttributes.defaultValues;
      if (defaultValues)
        propertyAttributes.value = defaultValues[booleanString];
    } else if (propertyAttributes.defaultValues) {
      var translatedEntry = goog.object.findValue(
          propertyAttributes.defaultValues,
          function(value, key) {
            return (key === propertyAttributes.value);
          }, this);
      if (typeof translatedEntry !== 'undefined')
        propertyAttributes.value = translatedEntry;
    }
  }, this);
  return this.propertiesInformation;
};


/**
 * Evaluates whether the conditions set for this item are met based on the
 * state of the other items in the questionnaire.
 * @param {!Object.<string, (!vsaq.questionnaire.items.Item|!Object)>} items A
 *     dictionary with all items in the questionnaire. The keys of the
 *     dictionary are the item IDs, the values the items.
 * @return {boolean} Whether the conditions of the item evaluate to true.
 * @throws {vsaq.questionnaire.items.ParseError}
 */
vsaq.questionnaire.items.Item.prototype.evaluateConditions = function(items) {
  var resolver = function(id) {
    if (id == 'false') return false;

    var refId = id.replace(/^[\^]?/, '').replace(/(\/yes|\/no|\/value)$/, '');
    var refItem = items[refId];
    if (!refItem)
      throw new vsaq.questionnaire.items.ParseError(
          'Could not parse condition of item ' + this.id);

    if (refItem instanceof vsaq.questionnaire.items.ValueItem &&
        id.indexOf('/value') > -1) {
      return refItem.getValue();
    }

    // Handle Visibility operator ^.
    if (id.charAt(0) == '^')
      return refItem.isVisible();

    var blockVisible = true;
    if (refItem.parentItem)
      blockVisible = refItem.parentItem.evaluateConditions(items);

    if (!blockVisible || !refItem.evaluateConditions(items))
      return false;

    if (refItem instanceof vsaq.questionnaire.items.ValueItem) {
      return refItem.isChecked(id);

    } else if (typeof refItem.getValue == 'function') {
      return refItem.getValue();

    } else {
      throw new vsaq.questionnaire.items.ParseError(
          'Operator illegal in conditions of item ' + this.id);
    }
  };

  var cond = /** @type {string} */(this.conditions);
  return vsaq.questionnaire.utils.evalExpression(cond, resolver);
};


/**
 * Event type for events sent out when an item's answer changed.
 * @type {string}
 */
vsaq.questionnaire.items.Item.CHANGED =
    'vsaq.questionnaire.items.Item.CHANGED';


/**
 * Event type for events sent out when an item becomes hidden.
 * @type {string}
 */
vsaq.questionnaire.items.Item.HIDDEN =
    'vsaq.questionnaire.items.Item.HIDDEN';


/**
 * Event type for events sent out when an item becomes shown.
 * @type {string}
 */
vsaq.questionnaire.items.Item.SHOWN =
    'vsaq.questionnaire.items.Item.SHOWN';


/**
 * Type of the question. This is used to distinguish questions in serialized
 * format.
 * @type {string}
 * @const
 */
vsaq.questionnaire.items.Item.TYPE;


/**
 * Parses questionnaire items. A questionnaire is typically stored as
 * a Json structure. This function takes the first element from the passed
 * array of serialized questionnaire items, and returns the parsed item.
 * If an error is encountered parsing the top item, the function will throw a
 * `vsaq.questionnaire.items.ParseError`.
 * @param {!Array.<qjson.QuestionnaireItem> | !Array.<!Object>} questionStack
 *     Array of serialized questionnaire items.
 * @return {!vsaq.questionnaire.items.Item} A single parsed item.
 * @throws vsaq.questionnaire.items.ParseError
 */
vsaq.questionnaire.items.Item.parse = function(questionStack) {
  if (questionStack.length == 0)
    throw new vsaq.questionnaire.items.ParseError('No questions in stack.');

  var question = questionStack[0];
  var parser = vsaq.questionnaire.items.factory.parsers[question.type];
  if (parser) {
    var item =
        /** @type {!vsaq.questionnaire.items.Item} */
        (parser(questionStack));
    if (question.className)
      goog.dom.classlist.add(item.container, question.className);
    if (question['default'] &&
        item instanceof vsaq.questionnaire.items.ValueItem) {
      // Use setInternalValue to avoid triggering an event for default values.
      item.setInternalValue(question['default']);
    }
    item.type = question.type;
    return item;
  }

  throw new vsaq.questionnaire.items.ParseError(
      'No renderer registered for type ' + question.type);
};


/**
 * Sets whether the item is visible or hidden and dispatches the HIDDEN or SHOWN
 * event. If the item has not been rendered yet, or it's already in the desired
 * state this function does nothing.
 * @param {boolean} visible True if the item should be displayed.
 */
vsaq.questionnaire.items.Item.prototype.setVisibility = function(visible) {
  if (this.container) {
    var ev;
    var isVisible = !(this.container.style.display == 'none');
    if (isVisible && !visible) {
      this.container.style.display = 'none';
      ev = {
        type: vsaq.questionnaire.items.Item.HIDDEN,
        source: this
      };
    } else if (!isVisible && visible) {
      this.container.style.display = 'block';
      ev = {
        type: vsaq.questionnaire.items.Item.SHOWN,
        source: this
      };
    }
    if (ev) {
      this.eventDispatcher.dispatchEvent(ev);
    }
  }
};


/**
 * Returns whether or not the current item is visible. If an item's parent
 * block is not visible, neither can it be.
 * @return {boolean} Whether or not the item is visible.
 */
vsaq.questionnaire.items.Item.prototype.isVisible = function() {
  if (this.container && this.container.style.display == 'none') {
    return false;
  } else if (this.parentItem) {
    return this.parentItem.isVisible();
  }
  return true;
};


/**
 * This function is called whenever an item is added to a container item.
 * The item can optionally take action based on the container it is in.
 * By default this is a no-on, unless the item class overrides this function.
 * @param {!vsaq.questionnaire.items.ContainerItem} parentItem The container the
 *     item was added to.
 */
vsaq.questionnaire.items.Item.prototype.parentItemSet = function(parentItem) {
  this.parentItem = parentItem;
};


/**
 * Returns the template representation of the current item.
 * @return {Object} An object that is conform to the template layout.
 */
vsaq.questionnaire.items.Item.prototype.exportItem = function() {
  var propertiesInformation = this.getPropertiesInformation();
  var exportProperties = new goog.structs.LinkedMap();
  propertiesInformation.forEach(
      function(propertyAttributes, propertyName) {
        // We ignore all variables that are empty strings, null or undefined.
        if (!propertyAttributes.value &&
            !(typeof propertyAttributes.value === 'boolean'))
          return;
        exportProperties.set(propertyName, propertyAttributes.value);
      },
      this);
  return exportProperties;
};



/**
 * Base class for all questionnaire items that may carry a value.
 * @param {string} id An ID uniquely identifying the question.
 * @param {?string} conditions A string containing conditions which must be met
 *     for the item to be visible to the user.
 * @param {string} text Text associated with the ValueItem.
 * @param {string=} opt_placeholder The placeholder text, displayed in place of
 *     the value.
 * @param {string=} opt_inputPattern HTML5 pattern attribute value for the input
 *     field. See {@link
 *     https://html.spec.whatwg.org/multipage/forms.html#the-pattern-attribute}.
 * @param {string=} opt_inputTitle HTML5 title attribute value for the input
 *     field. See {@link
 *     https://html.spec.whatwg.org/multipage/forms.html#attr-input-title}.
 * @param {boolean=} opt_isRequired If true, the item value is required.
 * @param {number=} opt_maxlength HTML maxlength attribute value for the input
 *     field. See {@link
 *     https://html.spec.whatwg.org/multipage/forms.html#attr-fe-maxlength}
 * @param {string=} opt_auth If "readonly", this ValueItem cannot be modified.
 * @extends {vsaq.questionnaire.items.Item}
 * @constructor
 */
vsaq.questionnaire.items.ValueItem = function(id, conditions, text,
    opt_placeholder, opt_inputPattern, opt_inputTitle, opt_isRequired,
    opt_maxlength, opt_auth) {
  if (!id)
    throw new vsaq.questionnaire.items.ParseError('ValueItem must have an ID.');

  goog.base(this, id, conditions);
  var propertyInformation = {
    nameInClass: 'id',
    mandatory: true,
    metadata: true
  };
  this.addPropertyInformation('id', propertyInformation);

  /**
   * Text associated with the ValueItem.
   * @type {string}
   */
  this.text = goog.string.makeSafe(text);
  propertyInformation = {
    nameInClass: 'text',
    mandatory: true
  };
  this.addPropertyInformation('text', propertyInformation);
  /**
   * The placeholder text, displayed in place of the value.
   * @type {string|undefined}
   */
  this.placeholder = opt_placeholder;
  /**
   * If true, the value is required.
   * @type {boolean}
   */
  this.required = Boolean(opt_isRequired);
  /**
   * HTML5 pattern attribute value for the input field.
   * @type {string|undefined}
   */
  this.inputPattern = opt_inputPattern;
  /**
   * HTML5 title attribute value for the input field.
   * @type {string|undefined}
   */
  this.inputTitle = opt_inputTitle;
  /**
   * HTML5 title attribute value for the input field.
   * @type {number|undefined}
   */
  this.maxlength = opt_maxlength;

  if (opt_auth == 'readonly')
    /**
     * If 'readonly', the ValueItem cannot be modified.
     * @type {string|undefined}
     */
    this.auth = 'readonly';
};
goog.inherits(vsaq.questionnaire.items.ValueItem,
              vsaq.questionnaire.items.Item);


/**
 * Handles changes to the item and dispatches an
 * `vsaq.questionnaire.items.Item.CHANGED` event for this item.
 * @protected
 */
vsaq.questionnaire.items.ValueItem.prototype.answerChanged = function() {
  var changes = {};
  changes[this.id] = this.getValue();
  var ev = {
    type: vsaq.questionnaire.items.Item.CHANGED,
    source: this,
    changes: changes
  };
  this.eventDispatcher.dispatchEvent(ev);
};


/**
 * Returns true if the item is checked. If multiple values are possible,
 * opt_value can be passed to verify whether that specific option has been
 * checked.
 * @param {string=} opt_value The selected value.
 * @return {boolean} Whether or not the item is checked.
 */
vsaq.questionnaire.items.ValueItem.prototype.isChecked = function(opt_value) {
  return false;
};


/**
 * Return true if the item is marked required in template,
 * meets all conditions (thus visible) and not yet answered, false otherwise.
 * It can be useful to decide if a valid questionnaire is ready to submit.
 * @return {boolean} Whether the item needs to be filled in order to
 * submit the questionnaire.
 */
vsaq.questionnaire.items.ValueItem.prototype.isUnfilled = function() {
  return this.isVisible() && this.required && !this.isAnswered();
};


/**
 * Sets the value of the item and triggers an answer changed event.
 * @param {string|boolean} value The value the item should be set to.
 */
vsaq.questionnaire.items.ValueItem.prototype.setValue = function(value) {
  this.setInternalValue(value);
  this.answerChanged();
};


/**
 * Sets the value of the item. If the value has not been rendered yet,
 * the function does nothing.
 * @param {string|boolean} value The value the item should be set to.
 * @protected
 */
vsaq.questionnaire.items.ValueItem.prototype.setInternalValue =
    goog.abstractMethod;


/**
 * Returns the string value of the item that can be used in the answer JSON
 * structure. If the item has not been rendered yet, the function returns null.
 * @return {?string} Current value of the item.
 */
vsaq.questionnaire.items.ValueItem.prototype.getValue = goog.abstractMethod;


/**
 * Sets or unsets readonly-mode for the item (i.e., if set, the item cannot be
 * changed by the user.
 * @param {boolean} readOnly If true, the item will be set read-only. If
 *     false, it will be set read-write.
 */
vsaq.questionnaire.items.ValueItem.prototype.setReadOnly = goog.abstractMethod;


/**
 * Returns true if the question has been answered. This is useful to determine
 * how many questions are left unanswered in the questionnaire.
 * @return {boolean} Whether the question has been answered already.
 */
vsaq.questionnaire.items.ValueItem.prototype.isAnswered = goog.abstractMethod;


/**
 * Array containing all parsers for questionnaire items.
 * @type {!Object.<string, function(!Array.<qjson.QuestionnaireItem>):
 *     (!vsaq.questionnaire.items.Item)>}
 */
vsaq.questionnaire.items.factory.parsers = {};


/**
 * Adds the parser for a questionnaire item to the factory.
 * @param {string} type indicates the type of a questionnaire.
 * @param {function(!Array.<qjson.QuestionnaireItem>):
 *     (!vsaq.questionnaire.items.Item)} parser A function that is able
 *     to parse questionnaire items of the given type.
 */
vsaq.questionnaire.items.factory.add = function(type, parser) {
  vsaq.questionnaire.items.factory.parsers[type] = parser;
};


/**
 * Clears all parsers from the factory.
 */
vsaq.questionnaire.items.factory.clear = function() {
  vsaq.questionnaire.items.factory.parsers = {};
};

