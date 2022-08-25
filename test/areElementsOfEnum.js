
const { describe, it } = require("node:test")
const assert = require("node:assert").strict
const { ClientSideUrlParser } = require("../src/client-side-url-parser.js")

let { areElementsOfEnum } = new ClientSideUrlParser().testFunctions

describe("areElementsOfEnum", () => {
    it("fails when provided values are not an array of string", () => {
        assert.throws(() => {
            areElementsOfEnum([2], ["flag1", "flag2"])
        }, {
            message:/^Argument 'array' expected an array of strings./
        })
    })

    it("fails when expected values are not an array of strings", () => {
        assert.throws(() => {
            areElementsOfEnum(["flag1"], [2, 3])
        }, {
            message:/^Argument 'values' expected an array of strings./
        })
    })

    it("succeeds when all provided values match expected values", () => {
        assert.strictEqual(areElementsOfEnum(["flag1", "flag2"], ["flag2", "flag1"]), true)
    })

    it("fails when one or more provided values don't match expected values", () => {
        assert.strictEqual(areElementsOfEnum(["flag1", "flag2", "flag3"], ["flag1", "flag2"]), false)
    })
})