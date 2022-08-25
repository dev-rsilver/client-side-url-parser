
const { describe, it } = require("node:test")
const assert = require("node:assert").strict
const { ClientSideUrlParser } = require("../src/client-side-url-parser.js")

let { isNullEmptyOrUndefined } = new ClientSideUrlParser().testFunctions

describe("isNullEmptyOrUndefined", () => {
    
    it("is true on null, empty or undefined", () => {
        assert.strictEqual(isNullEmptyOrUndefined(null), true)
        assert.strictEqual(isNullEmptyOrUndefined(""), true)
        assert.strictEqual(isNullEmptyOrUndefined(undefined), true)
    })

    it("is valid on populated string", () => {
        assert.strictEqual(isNullEmptyOrUndefined("test"), false)
    })

    it("is valid on populated object", () => {
        assert.strictEqual(isNullEmptyOrUndefined({ a:5 }), false)
    })

    it("is empty on an empty object", () => {
        assert.strictEqual(isNullEmptyOrUndefined({}), true)
    })

    it("is valid on a populated array", () => {
        assert.strictEqual(isNullEmptyOrUndefined([1,2]), false)
    })

    it("is empty on an empty array", () => {
        assert.strictEqual(isNullEmptyOrUndefined([]), true)
    })
    
    it("is valid on number", () => {
        assert.strictEqual(isNullEmptyOrUndefined(12), false)
    })

    it("should error on unhandled type", () => {
        assert.throws(() => { isNullEmptyOrUndefined(Symbol()) }, /^Error: Could not find/ )
    })

})
