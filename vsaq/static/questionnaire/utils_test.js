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
 * @fileoverview Tests for vsaq.questionnaire.utils.
 */

goog.provide('vsaq.questionnaire.items.UtilsTests');
goog.setTestOnly('vsaq.questionnaire.items.UtilsTests');

goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('vsaq.questionnaire.utils');


/**
 * Tests tokenizing expressions.
 */
function testTokenizeExpression() {
  var exp1 = 'a&&b';
  var exp1b = 'a &&b';
  var exp1c = 'a && b';
  var exp1_tok = ['a', '&', 'b'];

  var exp2 = '(a&&(b))';
  var exp2_tok = [['a', '&', ['b']]];

  var exp3 = '(a&&b)';
  var exp3_tok = [['a', '&', 'b']];

  var exp4 = '((aa)) && b';
  var exp4_tok = [[['aa']], '&', 'b'];

  var exp5 = '((aa)&&(aa||bb))';
  var exp5_tok = [[['aa'], '&', ['aa', '|', 'bb']]];

  var exp6 = 'a&&(b||c&&!(!d||(e&&f)))&&(g||h)';
  var exp6_tok =
      ['a', '&', ['b', '|', 'c', '&', '!', ['!', 'd', '|', ['e', '&', 'f']]],
       '&', ['g', '|', 'h']];

  var exp7 = 'a&&b&&c(d,e)';
  var exp7_tok =
      ['a', '&', 'b', '&', 'c', ['d', ',', 'e']];

  var exp8 = 'a||"b"||c';
  var exp8_tok =
      ['a', '|', '"b"', '|', 'c'];

  var exp9 = '"a\\"b\\\\\\"c\\\\"';
  var exp9_tok =
      ['"a\\"b\\\\\\"c\\\\"'];

  var invalid_exp1 = 'a!&&b';
  var invalid_exp2 = 'a&&(c||d';
  var invalid_exp3 = 'a&b';
  var invalid_exp4 = 'a&&b&&(c';
  var invalid_exp5 = 'a&&b&&c)';
  var invalid_exp6 = 'a&&b&&c(d';
  var invalid_exp7 = 'a&&b&&c(d,';
  var invalid_exp8 = 'a&&b&&c(d e)';
  var invalid_exp9 = 'a(b(c)';
  var invalid_expA = '"a';
  var invalid_expB = '"\\"';
  var invalid_expC = 'a "';
  var invalid_expD = 'a "b';


  var tokenize = vsaq.questionnaire.utils.tokenizeExpression;

  assertArrayEquals(exp1_tok, tokenize(exp1));
  assertArrayEquals(exp1_tok, tokenize(exp1b));
  assertArrayEquals(exp1_tok, tokenize(exp1c));

  assertArrayEquals(exp2_tok, tokenize(exp2));
  assertArrayEquals(exp3_tok, tokenize(exp3));
  assertArrayEquals(exp4_tok, tokenize(exp4));
  assertArrayEquals(exp5_tok, tokenize(exp5));
  assertArrayEquals(exp6_tok, tokenize(exp6));
  assertArrayEquals(exp7_tok, tokenize(exp7));
  assertArrayEquals(exp8_tok, tokenize(exp8));
  assertArrayEquals(exp9_tok, tokenize(exp9));

  assertThrows(function() { tokenize(invalid_exp1) });
  assertThrows(function() { tokenize(invalid_exp2) });
  assertThrows(function() { tokenize(invalid_exp3) });
  assertThrows(function() { tokenize(invalid_exp4) });
  assertThrows(function() { tokenize(invalid_exp5) });
  assertThrows(function() { tokenize(invalid_exp6) });
  assertThrows(function() { tokenize(invalid_exp7) });
  assertThrows(function() { tokenize(invalid_exp8) });
  assertThrows(function() { tokenize(invalid_exp9) });
  assertThrows(function() { tokenize(invalid_expA) });
  assertThrows(function() { tokenize(invalid_expB) });
  assertThrows(function() { tokenize(invalid_expC) });
  assertThrows(function() { tokenize(invalid_expD) });
}


/**
 * Tests evaluating expressions.
 */
function testEvalExpression() {
  var resolver = function(variable) {
    return variable == 'true';
  };
  var evalExp = vsaq.questionnaire.utils.evalExpression;

  var fexp1 = 'true && false';
  var fexp2 = '(true && false)';
  var fexp3 = 'false && false';
  var fexp4 = 'false || false';
  var fexp5 = 'true && (false && !true)';
  var fexp6 = 'contains("abc", "b") && contains("abc", "d")';

  var texp1 = 'true && true';
  var texp2 = 'true && (true || false)';
  var texp3 = 'false || !false';
  var texp4 = 'true && (false || (!true)) || (true && true)';
  var texp5 = 'matches("a\\"b\\\\\\"c\\\\", "^(z|[a]).(?:b{1,})..[asxdc].$")';
  var texp6 = 'matches("abc", "B", "i")';
  var texp7 = '!(matches("abc", "d"))';
  var texp8 = 'contains("abc", "b")';
  var texp9 = '!(contains("abc", "d"))';
  var texp10 = 'contains("abc", "b") && contains("abc", "c")';

  assertEquals(false, evalExp(fexp1, resolver));
  assertEquals(false, evalExp(fexp2, resolver));
  assertEquals(false, evalExp(fexp3, resolver));
  assertEquals(false, evalExp(fexp4, resolver));
  assertEquals(false, evalExp(fexp5, resolver));
  assertEquals(false, evalExp(fexp6, resolver));

  assertEquals(true, evalExp(texp1, resolver));
  assertEquals(true, evalExp(texp2, resolver));
  assertEquals(true, evalExp(texp3, resolver));
  assertEquals(true, evalExp(texp4, resolver));
  assertEquals(true, evalExp(texp5, resolver));
  assertEquals(true, evalExp(texp6, resolver));
  assertEquals(true, evalExp(texp7, resolver));
  assertEquals(true, evalExp(texp8, resolver));
  assertEquals(true, evalExp(texp9, resolver));
  assertEquals(true, evalExp(texp10, resolver));
}
