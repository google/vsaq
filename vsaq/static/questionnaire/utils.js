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
 * @fileoverview Utility functions for the questionnaire.
 */

goog.provide('vsaq.questionnaire.utils');
goog.provide('vsaq.questionnaire.utils.InvalidExpressionError');
goog.provide('vsaq.questionnaire.utils.globals');

goog.require('goog.array');
goog.require('goog.debug.Error');
goog.require('goog.dom');


/**
 * Looks through the children of the given element to see whether one of the
 * children matches the given ID. If yes, that element is returned.
 * @param {Element} element The element to search.
 * @param {string} id The id to find.
 * @return {Element} The element with the given ID, if it exists.
 */
vsaq.questionnaire.utils.findById = function(element, id) {
  return /** @type {Element} */ (goog.dom.findNode(element, function(d) {
    return d.id == id;
  }));
};



/**
 * Exception used when an invalid expression is parsed.
 * @param {string=} opt_message The message with the error details.
 * @constructor
 * @extends {goog.debug.Error}
*/
vsaq.questionnaire.utils.InvalidExpressionError = function(opt_message) {
  opt_message = 'Invalid expression' || opt_message;
  goog.base(this, opt_message);
};
goog.inherits(vsaq.questionnaire.utils.InvalidExpressionError,
    goog.debug.Error);


/**
 * Returns true if the character passed to the function is a boolean operator.
 * Valid operators are '&', '|' and '!'.
 * @param {string} character The character tested for being an operator.
 * @return {boolean} true if the character is an operator.
 * @private
 */
vsaq.questionnaire.utils.isOperator_ = function(character) {
  if (!character || character.length > 1)
    return false;
  return ('&|!,'.indexOf(character) > -1);
};


/**
 * Evaluates a string that is a boolean expression. The boolean expression can
 * contain the operators AND ('&&'), OR ('||') and NOT ('!'). Variables may be
 * used in the expression. These variables will be resolved by passing them to
 * the resolver function.
 * @param {string} expression The boolean expression.
 * @param {function(string): *} resolver A function that resolves variables
 *     used in the expression.
 * @return {boolean} The result of evaluating the expression.
 */
vsaq.questionnaire.utils.evalExpression = function(expression, resolver) {
  var token = vsaq.questionnaire.utils.tokenizeExpression(expression);
  return !!vsaq.questionnaire.utils.evalTokenizedExpression_(token, resolver);
};


/**
 * Evaluates a tokenized boolean expression. Variables may be used in the
 * expression. These variables will be resolved by passing them to the resolver
 * function.
 * @param {Array} expression The boolean expression.
 * @param {function(string): *} resolver A function that resolves variables
 *     used in the expression.
 * @return {*} The result of evaluating the expression.
 * @throws {vsaq.questionnaire.utils.InvalidExpressionError}
 * @private
 */
vsaq.questionnaire.utils.evalTokenizedExpression_ = function(
    expression, resolver) {

  // an empty expression always evaluates to true
  if (!expression.length) return true;

  var results = [];
  // Resolve variables and flatten the expression into a 1-dimensional array.
  goog.array.forEach(expression, function(item) {
    if (goog.isArray(item)) {
      results.push(
          vsaq.questionnaire.utils.evalTokenizedExpression_(item, resolver));
    } else {
      if (item[0] == '"') {
        results.push(item);
      } else if (vsaq.questionnaire.utils.isOperator_(item)) {
        results.push(item);
      } else {
        if (vsaq.questionnaire.utils.globals.hasOwnProperty(item)) {
          results.push(vsaq.questionnaire.utils.globals[item]);
        } else {
          results.push(resolver(item));
        }
      }
    }
  });

  // Resolve not (!) operator.
  var results2 = [];
  for (var i = 0; i < results.length; i++) {
    if (results[i] == '!') {
      results2.push(!results[++i]);
    } else {
      results2.push(results[i]);
    }
  }

  // Resolve functions
  var results3 = [];
  for (var i = 0; i < results2.length; i++) {
    var item = results2[i];
    if (typeof item == 'function') {
      var args = results2[++i];
      if (!goog.isArray(args)) {
        args = [args];
      }
      args = goog.array.map(args, function(arg) {
        if (typeof arg == 'string') {
          return arg.replace(/\\(.)|^"|"$/g, '$1');
        }
        return arg;
      });
      results3.push(item.apply(null, args));
    } else {
      results3.push(results2[i]);
    }
  }

  // Get final result
  var result = results3[0];
  var collection = [result];
  var returnValue;
  for (var i = 0; i < results3.length; i++) {
    var item = results3[i];
    if (vsaq.questionnaire.utils.isOperator_(item)) {
      var arg = results3[++i];
      switch (item) {
        case '&':
          result = result && arg;
          break;
        case '|':
          result = result || arg;
          break;
        case ',':
          returnValue = collection;
          break;
      }
      collection.push(arg);
    } else if (i) {
      throw new vsaq.questionnaire.utils.InvalidExpressionError();
    }
  }
  if (returnValue)
    return returnValue;
  return result;
};


/**
 * List of global symbols.
 * @type {Object.<function(...*):boolean>}
 */
vsaq.questionnaire.utils.globals = {
  /** @return {boolean} */
  'matches': function(string, regexp, flags) {
    return !!string.match(new RegExp(regexp, flags));
  },
  /** @return {boolean} */
  'contains': function(string, needle) {
    return string.indexOf(needle) != -1;
  }
};


/**
 * Parses a string with a boolean expression and converts it into an
 * array, grouping expressions by parenthesis. For example, passing
 * ((a&&b)||(c||(d&&a))) returns:
 * [ [ 'a', AND, 'b' ], OR, [ 'c', OR, [ 'd', AND, 'a' ] ] ]
 * If an invalid expression string is passed to the function, an exception is
 * thrown.
 * @param {string} expression The string containing the expression.
 * @return {Array} An array with the parsed expression.
 * @throws {vsaq.questionnaire.utils.InvalidExpressionError}
 */
vsaq.questionnaire.utils.tokenizeExpression = function(expression) {
  var token = vsaq.questionnaire.utils.tokenizeExpression_(expression, 0);
  return token[0];
};


/**
 * Recursively parses a string with a boolean expression and converts it into an
 * array, grouping expressions by parenthesis. It returns an array with two
 * items: An array of tokens, and the position where parsing should continue.
 * @param {string} expression The string containing the expression.
 * @param {number} position The position where to start parsing the expression.
 * @return {Array} An array with the parsed expression.
 * @throws {vsaq.questionnaire.utils.InvalidExpressionError}
 * @private
 */
vsaq.questionnaire.utils.tokenizeExpression_ = function(expression, position) {
  var specialChars = ' ()!&|,';
  var group = [];
  var currentVar = '';

  for (var i = position; i < expression.length; i++) {
    if (expression[i] == '"' && !currentVar) {
      currentVar += vsaq.questionnaire.utils.consumeString_(expression, i);
      i += currentVar.length - 1;
    } else if (specialChars.indexOf(expression[i]) == -1) {
      currentVar += expression[i];
    } else {
      if (currentVar) {
        if (!goog.array.isEmpty(group) &&
            !vsaq.questionnaire.utils.isOperator_(group[group.length - 1]))
          throw new vsaq.questionnaire.utils.InvalidExpressionError();
        group.push(currentVar);
        currentVar = '';
      }
      switch (expression[i]) {
        case '(':
          if (!goog.array.isEmpty(group) &&
              !vsaq.questionnaire.utils.isOperator_(group[group.length - 1]) &&
              !group[group.length - 1]) {
            throw new vsaq.questionnaire.utils.InvalidExpressionError();
          }
          var newGroup = vsaq.questionnaire.utils.tokenizeExpression_(
              expression, i + 1);
          group.push(newGroup[0]);
          i = newGroup[1];
          if (i == -1)
            throw new vsaq.questionnaire.utils.InvalidExpressionError();
          break;
        case ')':
          if (expression[position - 1] != '(')
            throw new vsaq.questionnaire.utils.InvalidExpressionError();
          if (position)
            return [group, i];
          break;
        case '&':
        case '|':
          if (expression[i] != expression[++i])
            throw new vsaq.questionnaire.utils.InvalidExpressionError();
        case ',':
          if (vsaq.questionnaire.utils.isOperator_(group[group.length - 1]))
            throw new vsaq.questionnaire.utils.InvalidExpressionError();
        case '!':
          group.push(expression[i]);
      }
    }
  }

  currentVar && group.push(currentVar);
  return [group, -1];
};


/**
 * Consumes a string from a expression an returns it.
 * @param {string} expression The string containing the expression.
 * @param {number} position The position where to start parsing the expression.
 * @return {string} The string that it parsed.
 * @throws {vsaq.questionnaire.utils.InvalidExpressionError}
 * @private
 */
vsaq.questionnaire.utils.consumeString_ = function(expression, position) {
  if (expression[position] != '"') {
    throw new vsaq.questionnaire.utils.InvalidExpressionError();
  }
  var string = '"';
  for (var i = position + 1; i < expression.length; i++) {
    switch (expression[i]) {
      default:
        string += expression[i];
        break;
      case '"':
        return string + '"';
      case '\\':
        string += expression[i] + expression[++i];
    }
  }
  throw new vsaq.questionnaire.utils.InvalidExpressionError();
};
