
const { describe, it } = require("node:test")
const assert = require("node:assert").strict
const { ClientSideUrlParser } = require("../src/client-side-url-parser.js")

let { areElementsOfType } = new ClientSideUrlParser().testFunctions

describe("areElementsOfType", () => {
  
    it("must be an array", () => {
        assert.throws(() => { areElementsOfType(12) }, { message:/Argument 'array' expected an array./ })
    })

    it("must only contain elements that are not null, empty or undefined", () => {
        assert.throws(() => { areElementsOfType([null]) }, { message:/Element to be checked cannot be null, empty or undefined/ })
        assert.throws(() => { areElementsOfType([""]) }, { message:/Element to be checked cannot be null, empty or undefined/ })
        assert.throws(() => { areElementsOfType([undefined]) }, { message:/Element to be checked cannot be null, empty or undefined/ })
    })

    it("succeeds when all elements match the provided type", () => {
        assert.strictEqual(areElementsOfType([1, 2], "number"), true)
        assert.strictEqual(areElementsOfType(["test", "test"], "string"), true)
        assert.strictEqual(areElementsOfType([{ a:5 }, { b:1 }, { c:4 }], "object"), true)
        assert.strictEqual(areElementsOfType([[1,2], [2,3]], "array"), true)
    })

    it("fails when not all elements are populated", () => {
        assert.throws(() => {
            assert.strictEqual(areElementsOfType(["test", []], "string"), false)
            assert.strictEqual(areElementsOfType(["test", {}], "object"), false)
        }, { message:/^Element to be checked cannot be null, empty or undefined./ })
    })

    it("fails when not all elements match the provided type", () => {
        assert.strictEqual(areElementsOfType(["test", [1]], "string"), false)
        assert.strictEqual(areElementsOfType(["test", { "test": "test" }], "object"), false)
    })

    it("fails when an element is of unhandled type", () => {
        assert.throws(() => areElementsOfType(Symbol()), { message:/^Could not find a rule/})
    })

})