const { describe, it } = require("node:test")
const assert = require("node:assert").strict
const { ClientSideUrlParser } = require("../src/client-side-url-parser.js")

let { checkForColocatedVariables, 
      checkForDuplicateVariables, 
      tokenizeQueries,
      tokenizeString,
      parseUrlString } = new ClientSideUrlParser().testFunctions

function expectExactToken(token, expectedText, expectedStart, expectedStop) {
    assert.strictEqual(token.type, "exact")
    assert.strictEqual(token.text, expectedText)
    assert.strictEqual(token.startIndex, expectedStart)
    assert.strictEqual(token.stopIndex, expectedStop)
}

function expectVarToken(token, expectedId, expectedStart, expectedStop) {
    assert.strictEqual(token.type, "var")
    assert.strictEqual(token.id, expectedId)
    assert.strictEqual(token.startIndex, expectedStart)
    assert.strictEqual(token.stopIndex, expectedStop)
}

describe("parses url", () => {

    let parser = new ClientSideUrlParser()

    it("fails on non-string", () => {
        assert.throws(() => { parser.parseUrl({}, "https://localhost:3000/test")}, { message:/Argument 'urlTemplate' expects string that is not undefined, null or empty./ })
        assert.throws(() => { parser.parseUrl("/test", {})}, { message:/Argument 'url' expects string that is not undefined, null or empty./ })
    })

    it("fails on invalid option", () => {
        assert.throws(() => { parser.parseUrl("/test", "https://localhost:3000/test", { a:5 } ) }, { message:/^Argument 'options' contains one or more invalid options./ })
    })

    it("ignoreTrailingSlash option fails on invalid type", () => {
        assert.throws(() => { parser.parseUrl("/test", "https://localhost:3000/test", { ignoreTrailingSlash:"abc" }) }, { message:/Argument 'options.ignoreTrailingSlash' expects bool./ })
    })

    it("succeeds on simple path", () => {
        let result = parser.parseUrl("/path1/path2/", "https://localhost:3000/path1/path2/")
        assert.strictEqual(result.success, true)
        assert.strictEqual(result.variables.size, 0)
    })

    if("fails on different case", () => {
        let result = parser.parseUrl("/PATH1/path2", "https://localhost:3000/path1/PATH2")
        assert.strictEqual(result.success, false)
    })

    it("succeeds on a simple path with mismatched trailing slashes", () => {
        //Succeeds because the template does not require a final slash.
        let result = parser.parseUrl("/path1/path2", "https://localhost:3000/path1/path2/")
        assert.strictEqual(result.success, true)
    })

    it("fails on a simple path with mismatched trailing slashes", () => {
        //Fails because the template requires a final slash.
        let result = parser.parseUrl("/path1/path2/", "https://localhost:3000/path1/path2")
        assert.strictEqual(result.success, false)
    })

    it("succeeds on ignoreTrailingSlash", () => {
        let result = parser.parseUrl("/path1/path2/", "https://localhost:3000/path1/path2", { ignoreTrailingSlash: true })
        assert.strictEqual(result.success, true)
    })

    it("succeeds on missing preceding slash", () => {
        let result = parser.parseUrl("path1/path2", "https://localhost:3000/path1/path2")
        assert.strictEqual(result.success, true)
    })

    it("success on encoded url", () => {
        let result = parser.parseUrl("/path1/another path/path3", "https://locahost:3000/path1/another%20path/path3")
        assert.strictEqual(result.success, true)
    })

    it("succeeds on end of string path var", () => {
        //End of string variable parsing
        let result = parser.parseUrl("/path1/{id}", "https://localhost:3000/path1/123")
        assert.strictEqual(result.success, true)
        assert.strictEqual(result.variables.get("id"), "123")
    })
      
    it("succeeds on not end of string path var", () => {
        //Not end of string parsing
        let result = parser.parseUrl("/path1/{id}/path2/", "https://localhost:3000/path1/123/path2/")
        assert.strictEqual(result.success, true)
        assert.strictEqual(result.variables.get("id"), "123")
    })

    it("succeeds on compound path var", () => {
        //Compound variable
        let result = parser.parseUrl("/path1/test-{id}/path2/", "https://localhost:3000/path1/test-123/path2/")
        assert.strictEqual(result.success, true)
        assert.strictEqual(result.variables.get("id"), "123")
    })

    it("succeeds on simple query", () => {
        let result = parser.parseUrl("/?q=1", "https://localhost:3000/?q=1")
        assert.strictEqual(result.success, true)
    })

    it("succeeds on var query", () => {
        let result = parser.parseUrl("?q={var}", "https://localhost:3000/?q=abcdef")
        assert.strictEqual(result.success, true)
        assert.strictEqual(result.variables.get("var"), "abcdef")
    })

    it("succeeds on multiple var queries", () => {
        let result = parser.parseUrl("?q={var}&r=1&s={var2}", "https://localhost:3000/?q=abc&r=1&s=def")
        assert.strictEqual(result.success, true)
        assert.strictEqual(result.variables.get("var"), "abc")
        assert.strictEqual(result.variables.get("var2"), "def")
    })

    it("succeeds on hash", () => {
        let result = parser.parseUrl("/#{var}", "https://localhost:3000/#link1")
        assert.strictEqual(result.success, true)
        assert.strictEqual(result.variables.get("var"), "link1")
    })

    it("succeeds on compound hash", () => {
        let result = parser.parseUrl("/#id-{var}", "https://localhost:3000/#id-link1")
        assert.strictEqual(result.success, true)
        assert.strictEqual(result.variables.get("var"), "link1")
    })

    it("fails on mismatched compound hash", () => {
        let result = parser.parseUrl("/#id-{var}", "https://localhost:3000/#chapter-link1")
        assert.strictEqual(result.success, false)
    })

    it("succeeds on compound url", () => {
        let result = parser.parseUrl("path1/{var1}/path2-{var2}/{var3}?a={var4}&b={var5}#{var6}",
              "https://localhost:3000/path1/123456/path2-abcdef/hello1?a=hello2&b=hello3#hello4")

        assert.strictEqual(result.success, true)
        assert.strictEqual(result.variables.get("var1"), "123456")
        assert.strictEqual(result.variables.get("var2"), "abcdef")
        assert.strictEqual(result.variables.get("var3"), "hello1")
        assert.strictEqual(result.variables.get("var4"), "hello2")
        assert.strictEqual(result.variables.get("var5"), "hello3")
        assert.strictEqual(result.variables.get("var6"), "hello4")
    })

    it("succeeds on missing query string variable", () => {
        let result = parser.parseUrl("/?q={var}&b=1", "https://localhost:3000/?q=&b=1")
        assert.strictEqual(result.success, true)
        assert.strictEqual(result.variables.get("var"), "")
    })

    it("succeeds on missing path variable", () => {
        let result = parser.parseUrl("/1/{var}/2", "https://localhost:3000/1//2")
        assert.strictEqual(result.success, true)
        assert.strictEqual(result.variables.get("var"), "")
    })

    it("succeeds on using built-in URL to generate absolute url", () => {
        let url = new URL("/path1/path2", "https://localhost:3000")
        let result = parser.parseUrl("/path1/path2", url.href)
        assert.strictEqual(result.success, true)
    })
})

describe("tokenizes string", () => {

    it("expects string, number arguments", () => {
        assert.throws(() => { tokenizeString({}, 0) },
            { message:/^Argument 'str' expects type string./ })

        assert.throws(() => { tokenizeString("str", "index") },
            { message:/^Argument 'number' expects type number./})
    })

    it("tokenizes string without leading slash", () => {
        let str = "path1/path2/"
        let tokens = tokenizeString(str, 0)
        expectExactToken(tokens[0], "path1/path2/", 0, 11)
    })

    it("tokenizes string with leading slash", () => {
        let str = "/path1/path2/"
        let tokens = tokenizeString(str, 0)
        expectExactToken(tokens[0], "/path1/path2/", 0, 12)
    })

    it("adds start index", () => {
        let str = "/path1"
        let tokens = tokenizeString(str, 10)
        expectExactToken(tokens[0], "/path1", 10, 15)
    })

    it("tokenizes path (leading slash with variable)", () => {
        let str = "/path1/{var}"
        let tokens = tokenizeString(str, 0)
        expectExactToken(tokens[0], "/path1/", 0, 6)
        expectVarToken(tokens[1], "var", 7, 11)
    })

    it("tokenizes path (leading slash, variable, exact last token)", () => {
        let str = "/path1/{var}/path3"
        let tokens = tokenizeString(str, 0)
        expectExactToken(tokens[0], "/path1/", 0, 6)
        expectVarToken(tokens[1], "var", 7, 11)
        expectExactToken(tokens[2], "/path3", 12, 17)
    })

    it("tokenizes path (no leading slash, variable last token", () => {
        let str = "path1/{var}" //no leading slash
        let tokens = tokenizeString(str, 0)
        expectExactToken(tokens[0], "path1/", 0, 5)
        expectVarToken(tokens[1], "var", 6, 10)
    })

    it("tokenizes path (no leading slash, variable, exact last token)", () => {
        let str = "path1/{var}/path3" //no leading slash
        let tokens = tokenizeString(str, 0)
        expectExactToken(tokens[0], "path1/", 0, 5)
        expectVarToken(tokens[1], "var", 6, 10)
        expectExactToken(tokens[2], "/path3", 11, 16)
    })

    it("produces exact token on variable spaces", () => {
        //The presence of a space indicates that a token is not a variable, which
        //means that the string will be a single, exact token encompassing the entire string.
        let str = "/path1/{variable test}/path2"
        let tokens = tokenizeString(str, 0)
        expectExactToken(tokens[0], str, 0, str.length - 1)
    })

    it("succeeds on space plus exact tokens", () => {
        let str = "/path1/{variable test}/{var}/path2"
        let tokens = tokenizeString(str, 0)
        let expectedToken0 = "/path1/{variable test}/"
        let expectedToken1 = "var"
        let expectedToken2 = "/path2"
        expectExactToken(tokens[0], expectedToken0, 0, expectedToken0.length - 1) //22
        let token1end = expectedToken0.length + expectedToken1.length + 2 - 1 //the +2 is because the var token takes up space that includes the { } characters
        expectVarToken(tokens[1], expectedToken1, expectedToken0.length, token1end)
        expectExactToken(tokens[2], expectedToken2, token1end + 1, token1end + expectedToken2.length)
    })


})

describe("tokenizes queries", () => {

    it("tokenizes queries", () => {
        let queries = new Map()
        queries.set("query", "1")
        queries.set("query2", "2")
        queries.set("query3", "abc")
        let tokens = tokenizeQueries(queries, 0)

        expectExactToken(tokens[0], "?query=", 0, 6)
        expectExactToken(tokens[1], "1", 7, 7)
        expectExactToken(tokens[2], "&query2=", 8, 15)
        expectExactToken(tokens[3], "2", 16, 16)
        expectExactToken(tokens[4], "&query3=", 17, 24)
        expectExactToken(tokens[5], "abc", 25, 27)

        queries.clear()

        queries.set("a", "{var}")
        queries.set("b", "3")
        tokens = tokenizeQueries(queries)
        expectExactToken(tokens[0], "?a=", 0, 2)
        expectVarToken(tokens[1], "var", 3, 7)
        expectExactToken(tokens[2], "&b=", 8, 10)
        expectExactToken(tokens[3], "3", 11, 11)
    })

    it("increments index based on startIndex", () => {
        let queries = new Map()
        queries.set("a", "b")
        let tokens = tokenizeQueries(queries, 10)
        expectExactToken(tokens[0], "?a=", 10, 12)
        expectExactToken(tokens[1], "b", 13, 13)
    })
})

describe("colocated variables", () => {

    it("fails when two variables are side by side", () => {
        assert.throws(() => { checkForColocatedVariables([ { type:"var" }, { type: "var" } ]) },
            { message:/^{variable} tokens cannot be placed together/ })
    })

    it("succeeds when two variables are separated by an exact token", () => {
        assert.doesNotThrow(() => checkForColocatedVariables([ { type:"var" }, { type:"exact" }, { type: "var" }]))
    },)

})

describe("duplicate variables", () => {
    it("fails when two variables have the same id", () => {
        assert.throws(() => { checkForDuplicateVariables([ { type:"var", id:"a" }, { type:"var", id:"a" }]) },
           { message:/Duplicate variable id/ })
    })

    it("succeeds when two variables have different ids", () => {
        assert.doesNotThrow(() => checkForDuplicateVariables([{ type:"var", id:"a" }, { type:"var", id:"b" }]))
    })
})

describe("url parsing", () => {
    it("returns relative when url is relative", () => {
        let result = parseUrlString("/test")
        assert.strictEqual(result.type, "relative") 
    })

    it("returns absolute when url is absolute", () => {
        let result = parseUrlString("https://localhost:3000/test")
        assert.strictEqual(result.type, "absolute")
    })

})