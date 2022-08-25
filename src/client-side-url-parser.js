function ClientSideUrlParser() {

    /**
     * Contains private functions to export for testing. Intended for utilization
     * by testing framework.
     */
    this.testFunctions = new Object({})

    /**
     * Assigns internal functions to an object that can be utilized for testing.
     */
    let assignTestFunctions = function(functions) {
        this.testFunctions = Object.assign(this.testFunctions, functions)
    }.bind(this)

    /**
     * Validates and parses a url into variables, e.g., templateUrl -> "/books/{bookid}/{chapter}/?author={author}". 
     * Url must at least match template but extraneous characters are ignored.
     * Urls are case sensitive.
     * Origin is ignored.
     * Variables are valid in path, querystring and hash.
     * Variables cannot contain whitespace.
     * The value of parsed variables may be an empty string and the consuming application should handle empty string
     * values accordingly.
     * 
     * @param urlTemplate A string in form of a relative url with {variable} placeholders
     * @param url A string in the form of a url to be parsed, typically window.location.href, which must include url origin.
     * @param options An options object, containing one or more options:
     *     ignoreTrailingSlash: true | false
     * @returns Object { success: true, variables:Map() } or { success:false }. Individual variables may be empty strings.
     */
    this.parseUrl = function(urlTemplate, url, options = {}) {

        if(!isObjectOfType(urlTemplate, "string")) {
            throw new Error("Argument 'urlTemplate' expects string that is not undefined, null or empty.")
        }

        if(!isObjectOfType(url, "string")) {
            throw new Error("Argument 'url' expects string that is not undefined, null or empty.")
        }

        let urlResult = parseUrlString(url)

        if(urlResult.type !== "absolute") {
            throw new Error("Url is invalid. Url must start with an origin in the format of protocol://hostname:port")
        }

        let urlObject = urlResult.URL
        
        if(!isObjectOfType(options, "object", true)) {
            //Only checks that options is an object if it's actually provided.
            throw new Error("Argument 'options' expects an object.")
        }

        let validOptions = ["ignoreTrailingSlash"]

        if(!isNullEmptyOrUndefined(options)) {
        
            if(!areElementsOfEnum(Object.getOwnPropertyNames(options), validOptions)) {
                throw new Error(`Argument 'options' contains one or more invalid options. Valid options are ${validOptions.join(", ")}`)
            }

            if(!isNullEmptyOrUndefined(options["ignoreTrailingSlash"]) && !isObjectOfType(options["ignoreTrailingSlash"], "boolean")) {
                throw new Error("Argument 'options.ignoreTrailingSlash' expects boolean.")
            }
        }

        if(options.ignoreTrailingSlash) {
            //Ignore trailing slash by adding a slash to both the template and url

            let hasUrlSlash = url.endsWith("/")
            let hasTemplateSlash = urlTemplate.endsWith("/")

            if(hasUrlSlash && !hasTemplateSlash) {
                urlTemplate = urlTemplate + "/"
            }

            if(!hasUrlSlash && hasTemplateSlash) {
                url = url + "/"
            }

            //Parse url again because the url may have changed.
            urlObject = new URL(url)
        }

        urlTemplate = urlTemplate.replace(urlObject.origin, "")
        urlTemplate = urlTemplate.startsWith("/") ? urlTemplate : "/" + urlTemplate

        //Tokenize the template into "exact" and "variable" parts, which will later
        //be used to determine what's in the actual url.
        
        let templateTokens = []

        let templateURL = new URL(urlObject.origin + urlTemplate)
        let templateUrlPath = decodeURI(templateURL.pathname)
        let templateUrlHash = decodeURI(templateURL.hash)
        let templateUrlQueries = new URLSearchParams(templateURL.search)
        let templateUrlQueriesString = decodeURI(templateURL.search)

        //First, tokenize path.
        templateTokens.push(...tokenizeString(templateUrlPath, 0))

        //Next, tokenize query string.
        templateTokens.push(...tokenizeQueries(templateUrlQueries, templateUrlPath.length))

        //Finally, tokenize hash. Note that hash may also contain multiple variables, such as url#{chapter}-{paragraph}
        if(templateUrlHash.length > 0) {
            templateTokens.push(...tokenizeString(templateUrlHash, templateUrlPath.length + templateUrlQueriesString.length))
        }

        checkForColocatedVariables(templateTokens)
        checkForDuplicateVariables(templateTokens)

        //Removing origin leaves path + querystring + hash
        let currentUrl = decodeURI(url.replace(urlObject.origin, ""))

        //To locate the variables in the url, match to exact tokens and infer the variable
        //value from the text located between those exact tokens (or end of string, as appropriate,
        //if the last template token is a variable rather than an exact match).
        //e.g. /path1/?pid={productid} will need to be matched to the end of string

        let substrings = []
        let variables = new Map()
        let tokenPos = 0

        /**
         * Returns the cumulative length of all items in the array.
         * @param {array} array an array
         */
        function accumulatedArrayLength(array) {

            if(!isObjectOfType(array, "array", true)) {
                throw new Error("Argument 'array' expects type array.")
            }

            let len = 0
            for(let i = 0; i < array.length; i++) {
                len += array[i].length
            }
            return len
        }

        function invalidStatusResult() {
            return { success: false }
        }

        function validStatusResult(returnVariables) {
            return {
                success:true,
                variables:returnVariables
            }
        }

        for(let i = 0; i < templateTokens.length; i++) {

            let variableValue = ""
            let currentLength = accumulatedArrayLength(substrings)

            switch(templateTokens[i].type) {
                case "exact":
                    tokenPos = currentUrl.indexOf(templateTokens[i].text, currentLength)

                    if(tokenPos < 0) {
                        return invalidStatusResult()
                    }
                    
                    substrings.push(currentUrl.substring(tokenPos, tokenPos + templateTokens[i].text.length))
                    break
                case "var":
                    
                    let isLastToken = i >= templateTokens.length - 1

                    if(isLastToken) {
                        //If the variable is the last token, there's nothing left to match against,
                        //so the variable will be the remainder of the string.
                        substrings.push(currentUrl.substring(currentLength, currentUrl.length))
                        variables.set(templateTokens[i].id, substrings[substrings.length-1])
                    } else {

                        let nextExactToken = undefined

                        for(let k = i + 1; k < templateTokens.length; k++) {
                            if(templateTokens[k].type === "exact") {
                                nextExactToken = templateTokens[k]
                                break
                            }
                        }

                        if(nextExactToken === undefined) {
                            throw new Error("NextExactToken must be defined because two side-by-side {variable} tokens are disallowed and it's not the last token.")
                        }

                        //Start the search for the next token from the accumulated length of the previous tokens.

                        let nextTokenIndex = currentUrl.indexOf(nextExactToken.text, currentLength)
                        
                        if(nextTokenIndex < 0) {
                            return invalidStatusResult()
                        }

                        variableValue = currentUrl.substring(currentLength, nextTokenIndex)

                        substrings.push(variableValue)
                        
                        variables.set(templateTokens[i].id, variableValue)
                    }


                    break
            }
        }

        return validStatusResult(variables)
    }


    //Regex for tokenization expects variables in the form of {variable},
    //no whitespace allowed. match[0] will be the full {variable} string,
    //while match[1] will be the id inside the braces only
    const variableRegex = /{(\S*?)}/ig

    /**
     * Tokenizes a string based on {variable}s located within it.
     * @param {string} str A string in which to find tokens
     * @param {number} strStartIndex Adds a fixed amount to the start and stop index of each token
     * @returns An array of tokens
     */
    function tokenizeString(str, strStartIndex) {
        
        if(!isObjectOfType(str, "string")) {
            throw new Error("Argument 'str' expects type string.")
        }

        if(!isObjectOfType(strStartIndex, "number")) {
            throw new Error("Argument 'number' expects type number.")
        }

        let tokens = []

        let count = 0

        let matches = Array.from(str.matchAll(variableRegex))

        let start = 0
        for(let i = 0; i < matches.length; i++) {

            let currentToken = matches[i]
            let currentTokenText = matches[i][0]
            let currentTokenId = matches[i][1]
            let nextToken = matches[i + 1]

            //Get anything that *precedes* the *current* token.
            
            stop = currentToken.index - 1
            
            let preTokenString = str.substring(start, stop + 1) //substring stop position is exclusive, so add 1

            if(preTokenString.length > 0) {

                let preTokenStart = strStartIndex + start
                let preTokenStop = strStartIndex + stop

                tokens.push({
                    type:"exact",
                    text:preTokenString,
                    startIndex:preTokenStart,
                    stopIndex:preTokenStop 
                })

                count += preTokenStop - preTokenStart + 1
            }

            //Get the current token.
            let tokenStart = strStartIndex + currentToken.index
            let tokenStop = strStartIndex + currentToken.index + currentTokenText.length - 1

            //The token itself.
            tokens.push({
                type:"var",
                id:currentTokenId,
                startIndex:tokenStart,
                stopIndex:tokenStop
            })

            count += tokenStop - tokenStart + 1

            start = currentToken.index + currentTokenText.length

            //Get anything that follows the token, until either the next token or end of string.
            
            stop = i >= matches.length - 1 ? str.length - 1 : nextToken.index - 1

            let postTokenString = str.substring(start, stop + 1) //exclusive stop so +1

            if(postTokenString.length > 0) {
                //May be an empty string if the variable falls at the end of the string.
                
                let postTokenStart = strStartIndex + start
                let postTokenStop = strStartIndex + stop

                tokens.push({
                    type:"exact",
                    text:postTokenString,
                    startIndex:strStartIndex + start,
                    stopIndex:strStartIndex + stop 
                })

                count += postTokenStop - postTokenStart + 1
            }

            //Set for next iteration
            start = stop + 1
        }

        if(matches.length <= 0) {
          
            //If no matches, then the string is the whole match.

            tokens.push({
                type:"exact",
                text:str,
                startIndex:strStartIndex,
                stopIndex:strStartIndex + (str.length - 1)
            })

            count += str.length
        }

        if(count !== str.length) {
            throw new Error("Tokenization failed.")
        }

        return tokens
    }

    /**
     * Parses query string parameters.
     * @param {*} queries A URLSearchParams object obtained via URL().search
     * @param {number} startIndex Adds a fixed amount to the start and stop index of each token
     * @returns An array of tokens
     */
    function tokenizeQueries(queries, startIndex = 0) {

        //Each key is an "exact" token
        //Each value can be an exact token (?q=1), a variable (?q={var}) or a combination (?q=product-{id})
        //Note that queries.entries() preserves the ordering of query string entries.

        let tokens = []

        let start = 0

        let hasRootQuery = false

        for(let query of queries.entries()) {

            let queryName = query[0]
            let queryValue = query[1]
            
            //Note that query string operators (?, &, =) must be treated as part of a single
            //token comprising those operators plus the query name because, if they're treated
            //as separate tokens, parsing the url can fail if the value of a {variable} consists 
            //of those tokens. e.g., template includes (?q={var}&r=1) and url is (?q=&&&&r=1)

            if(hasRootQuery) { 
                queryName = "&" + queryName
                start++
            } else {
                queryName = "?" + queryName
                hasRootQuery = true
            }

            tokens.push({
                type:"exact",
                text:queryName + "=",
                startIndex:startIndex + start,
                stopIndex:startIndex + start + queryName.length
            })

            start += queryName.length + 1

            if(queryValue.length > 0) {
                let queryTokens = tokenizeString(queryValue, startIndex + start)
                tokens.push(...queryTokens)
                start += queryTokens[queryTokens.length-1].stopIndex - queryTokens[0].startIndex
            }
        }

        return tokens
    }

    /**
     * Attempts to convert a string into a URL object.
     * @param {string} url A relative or absolute url
     * @returns an object of { type:"relative" } if a relative url, or { type:"absolute", URL:URL } if absolute 
     */
    function parseUrlString(url) {
        let urlObject = undefined
        try {
            urlObject = new URL(url)
        } catch {
            return { type:"relative" }
        }

        return { type:"absolute", URL:urlObject }
    }


    /**
     * Checks whether two variables are side-by-side, which is disallowed.
     * @param {array} tokens An array of tokens as returned by tokenizeString or tokenizeQueries
     * @result Throws an error if invalid
     */
    function checkForColocatedVariables(tokens) {
        //Two variable tokens must be separated by an exact token
        for(let i = 0; i <= tokens.length - 2; i++) {
            if(tokens[i].type === "var" && tokens[i+1].type === "var") {
                throw new Error("{variable} tokens cannot be placed together")
            }
        }
    }

    /**
     * Checks whether two variables have the same id, which is disallowed.
     * @param {array} tokens An array of tokens as returned by tokenizeString or tokenizeQueries
     * @result Throws an error if invalid
     */
    function checkForDuplicateVariables(tokens) 
    {
        let names = new Map()

        //Two variable tokens must be separated by an exact token
        for(let i = 0; i < tokens.length; i++) {
            if(tokens[i].type === "var") {
                if(names.has(tokens[i].id)) {
                    throw new Error("Duplicate variable id")
                } else {
                    names.set(tokens[i].id)
                }
            }
        }
    }


    /**
     * Determines whether a value is null, empty or undefined.
     * @param value String, object, array, number or boolean
     * @results Returns true or false
     */
    function isNullEmptyOrUndefined(value) {
        
        function undefinedOrNull(value) {
            return value === undefined || value === null
        }

        let rules = {
            string: function() { return value.trim().length <= 0 },
            object: function() { return Object.getOwnPropertyNames(value).length <= 0 },
            array: function() { return value.length <= 0 },
            number: function() { return false },
            boolean: function() { return false }
        }

        if(undefinedOrNull(value)) {
            return true
        }

        let type = typeof(value)

        if(Array.isArray(value)) {
            type = "array"
        }

        let rule = rules[type]

        if(rule === undefined) {
            throw new Error(`Could not find a rule to determine whether object of type '${typeof(value)}' is null, empty or undefined.`)
        }

        return rule()
    }

    /**
     * Verifies that, in an array of strings, all elements are not null, empty
     * or undefined and that each element is one of the values present in the provided
     * values array.
     * @param array An array of strings to match.
     * @param values An array of strings containing the allowed values for each entry in the array.
     * @returns 
     */
    function areElementsOfEnum(array, allowedValues) {

        if(!isObjectOfType(array, "array") || !areElementsOfType(array, "string")) {
            throw new Error("Argument 'array' expected an array of strings.")
        }

        if(!isObjectOfType(allowedValues, "array") || !areElementsOfType(allowedValues, "string")) {
            throw new Error("Argument 'values' expected an array of strings.")
        }

        //Create a copy to prevent mutating the allowedValues
        let values = Array.from(allowedValues).map((value) => { return value.toUpperCase() })
        
        for(let i = 0; i < values.length; i++) {
            values[i] = values[i].toUpperCase()
        }

        for(element of array) {

            if(isNullEmptyOrUndefined(element)) {
                throw new Error("Elements to be checked cannot be null, empty or undefined.")
            }

            if(!values.includes(element.toUpperCase())) {
                return false
            }
        }

        return true
    }

    /**
     * Verifies that all elements in an array are of a specified type. If any null, 
     * empty or undefined elements are present, will throw error.
     * @param {array} array 
     * @param {string} objectType 
     */
    function areElementsOfType(array, objectType) {
        if(!isObjectOfType(array, "array")) {
            throw new Error("Argument 'array' expected an array.")
        }

        for(element of array) {

            if(isNullEmptyOrUndefined(element)) {
                throw new Error("Element to be checked cannot be null, empty or undefined.")
            }

            if(!isObjectOfType(element, objectType)) {
                return false
            }
        }

        return true
    }

    /**
     * Verifies that an object conforms to an expected type and is not null, empty or undefined.
     * @param {string} objectType A string that is one of: "string", "object", "array", "number", or "boolean"
     * @param {Boolean} allowNullEmptyOrUndefined If true, the object can be null, empty or undefined.
     */
    function isObjectOfType(object, objectType, allowNullEmptyOrUndefined = false) {
        
        if(allowNullEmptyOrUndefined && isNullEmptyOrUndefined(object)) {
            return true
        } 

        if(!allowNullEmptyOrUndefined && isNullEmptyOrUndefined(object)) {
            return false
        }

        if(isNullEmptyOrUndefined(objectType)) {
            throw new Error("Argument 'objectType' cannot be null, empty or undefined.")
        }

        if(typeof(objectType) !== "string") {
            throw new Error("Argument 'objectType' expects string.")
        }

        let types = {
            string: function() { return typeof(object) === "string"  },
            object: function() { return typeof(object) === "object" },
            array: function() { return typeof(object) === "array" || Array.isArray(object) },
            number: function() { return typeof(object) === "number" },
            boolean: function() { return typeof(object) === "boolean" }
        }

        let typeRule = types[objectType.toLowerCase()]

        if(typeRule === undefined) {
            throw new Error(`Invalid ${objectType}.`)
        }

        return typeRule()
    }

    /**
     * Exports private functions for testing. Only test runner should call these functions.
     */
    assignTestFunctions({
        tokenizeString,
        tokenizeQueries,
        checkForColocatedVariables,
        checkForDuplicateVariables,
        isObjectOfType,
        areElementsOfType,
        areElementsOfEnum,
        isNullEmptyOrUndefined,
        parseUrlString: parseUrlString
    })
}

if(!this.window) {
    module.exports = { ClientSideUrlParser }
}