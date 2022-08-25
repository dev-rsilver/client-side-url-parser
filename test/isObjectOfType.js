
const { describe, it } = require("node:test")
const assert = require("node:assert").strict
const { ClientSideUrlParser } = require("../src/client-side-url-parser.js")

let { isObjectOfType } = new ClientSideUrlParser().testFunctions

describe("isObjectOfType", () => {
    
    it("returns false on null, empty, or undefined", () => {
        assert.strictEqual(isObjectOfType(null), false)
        assert.strictEqual(isObjectOfType({}), false)
        assert.strictEqual(isObjectOfType(""), false)
        assert.strictEqual(isObjectOfType(undefined), false)
    })

    it("returns true on null, empty or undefined with specified option", () => {
        //Third argument, true, sets allowNullEmptyOrUndefined
        assert.strictEqual(isObjectOfType(null, "string", true), true)
        assert.strictEqual(isObjectOfType({}, "string", true), true)
        assert.strictEqual(isObjectOfType("", "string", true), true)
        assert.strictEqual(isObjectOfType(undefined, "string", true), true)
    })

    it("is invalid if objectType is null, empty, undefined or not a string", () => {
        assert.throws(() => { isObjectOfType("a", "") }, { message:/Argument 'objectType' cannot be null, empty or undefined./ })
        assert.throws(() => { isObjectOfType("a", null) }, { message:/Argument 'objectType' cannot be null, empty or undefined./ })
        assert.throws(() => { isObjectOfType("a", undefined) }, { message:/Argument 'objectType' cannot be null, empty or undefined./ })
        assert.throws(() => { isObjectOfType("a", { b:5 }) }, { message:/Argument 'objectType' expects string./ })
    })

    it("is a string on string", () => {
        assert.strictEqual(isObjectOfType("test", "string"), true)
    })

    it("is not a string if not a string", () => {
        assert.strictEqual(isObjectOfType({}, "string"), false)
    })

    it("is a number on number", () => {
        assert.strictEqual(isObjectOfType(12, "number"), true)
    })

    it("is not a number if not a number", () => {
        assert.strictEqual(isObjectOfType("test", "number"), false)
    })

    it("is an array on array", () => {
        assert.strictEqual(isObjectOfType([1,2], "array"), true)
    })

    it("is not an array if not an array", () => {
        assert.strictEqual(isObjectOfType("test", "array"), false)
    })

    it("is an object on populated object", () => {
        assert.strictEqual(isObjectOfType({ a:5 }, "object"), true)
    })

    it("fails on an empty object", () => {
        assert.strictEqual(isObjectOfType({}, "object"), false)
    })

    it("is not an object if not an object", () => {
        assert.strictEqual(isObjectOfType("test", "object"), false)
    })

    it("is a bool on a bool", () => {
        assert.strictEqual(isObjectOfType(true, "boolean"), true)
    })

    it("is not a bool if not a bool", () => {
        assert.strictEqual(isObjectOfType("abc", "boolean"), false)
    })

    it("is an invalid type", () => {

        //Currently, anything that's an invalid type for isObjectOfType is also an invalid
        //type for isNullEmptyOrUndefined, which is called at the beginning of isObjectOfType,
        //so trying to test type handling will fail on that initial check. If this test fails, 
        //then that check has been removed and isObjectOfType's own type check should be tested.

        assert.throws(() => { isObjectOfType(Symbol(), "string") }, { message:/^Could not find/ })
    })
})