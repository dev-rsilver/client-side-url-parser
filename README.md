# Client Side URL Parser

Script for client-side parsing and validation of a URL that takes a URL, such as window.location.href, and compares against a provided template, extracting any specified variables within the string. For example, a template like "/products/{productId}" will cause the value provided for productId to be extracted.

## Usage

```javascript
let parser = new ClientSideUrlParser()
parser.parseUrl(templateUrl, url, options)
```

e.g., parser.parseUrl("/all/{category}/{product}/", window.location.href, { ignoreTrailingSlash: true })

## Template/URL Format

Template URL must be a relative URL, with or without leading or trailing slashes.

URL to compare must be an absolute url, containing an origin, with or without a trailing slash. Typical expected use is with window.location.href. If trying to parse a relative url, consider using the browser's built-in URL(relative, base) method to create a URL with an origin. URL matching is case-sensitive, except for the origin which is ignored.

## Variables

Variables cannot contain whitespace. If whitespace is contained between braces, such as {my variable}, it will be interpreted as an exact match portion of the string.

Variables cannot be directly adjacent to one another, as in "/{var1}{var2}/{var3}"

Variables cannot share the same id.

## Parsing

All characters that are not part of a variable are matched exactly and must be present. Matching occurs up to the length of the template. If the url matches the template and also has extraneous characters, this case is still considered a match. For example, template "/path1/{var}/path2" and url "/path1/123/path2?q=hello" successfully match even with the presence of "?q=hello".

## Returns

If parsing fails, returns:

```javascript
{
    success:false
}
```

If parsing succeeds, returns:

```javascript
{
    success:true,
    variables:Map()
}
```
where variables contains the names and values of the parsed variables.

To retrieve a variable, use the get() function of the map, such as:

```javascript
result.variables.get("productId")
```

Note that variable names are case sensitive.

All variables are returned as strings. Note that variables may be **empty strings** if values are not supplied. For example, if a template expects "path1/{var}/path2" and the provided url is "path1//path2", the "var" variable will be an empty string. As a result, consuming applications should handle empty values.

## Options

An options argument can be applied to parseUrl, which currently consists of:

```javascript
{
    ignoreTrailingSlash: true | false
}
```

IgnoreTrailingSlash enables matching when either the template or url has a slash and the other does not, such as when a template is "path1/" and a url is "path1".

## Tests

Tests utilize the Node test runner. Inside the project root, run:

```
node --test
````

Note: Tests require a version of Node that implements test runner.
