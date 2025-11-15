var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../.wrangler/tmp/bundle-cqmrdT/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// api/estimates/[[route]].js
function decodeJWT(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
    const jsonPayload = atob(paddedBase64);
    return JSON.parse(jsonPayload);
  } catch (e) {
    throw new Error("Failed to decode JWT: " + e.message);
  }
}
__name(decodeJWT, "decodeJWT");
function getUserFromRequest(request) {
  let email = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (email) {
    return email;
  }
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    return "dev@localhost";
  }
  const cookies = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    cookies[name] = rest.join("=");
  });
  const token = cookies["CF_Authorization"];
  if (!token) {
    return "dev@localhost";
  }
  const payload = decodeJWT(token);
  email = payload.email;
  if (!email) {
    throw new Error("No email found in authentication token");
  }
  return email;
}
__name(getUserFromRequest, "getUserFromRequest");
async function ensureUser(db, email) {
  let user = await db.prepare("SELECT id, email FROM users WHERE email = ?").bind(email).first();
  if (!user) {
    const result = await db.prepare(
      "INSERT INTO users (email, created_at, last_login) VALUES (?, unixepoch(), unixepoch())"
    ).bind(email).run();
    user = { id: result.meta.last_row_id, email };
  } else {
    await db.prepare("UPDATE users SET last_login = unixepoch() WHERE id = ?").bind(user.id).run();
  }
  return user;
}
__name(ensureUser, "ensureUser");
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(jsonResponse, "jsonResponse");
function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}
__name(errorResponse, "errorResponse");
async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const method = request.method;
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  try {
    const email = getUserFromRequest(request);
    const user = await ensureUser(env.DB, email);
    const route = params.route ? params.route.join("/") : "";
    if (method === "GET" && !route) {
      const ownedEstimates = await env.DB.prepare(
        "SELECT id, name, created_at, updated_at FROM estimates WHERE user_id = ? ORDER BY updated_at DESC"
      ).bind(user.id).all();
      const sharedEstimates = await env.DB.prepare(`
                SELECT e.id, e.name, e.created_at, e.updated_at, u.email as owner_email
                FROM estimates e
                INNER JOIN estimate_shares s ON e.id = s.estimate_id
                INNER JOIN users u ON e.user_id = u.id
                WHERE s.shared_with_user_id = ?
                ORDER BY e.updated_at DESC
            `).bind(user.id).all();
      return jsonResponse({
        owned: ownedEstimates.results.map((est) => ({
          id: est.id,
          name: est.name,
          createdAt: est.created_at,
          updatedAt: est.updated_at,
          isOwner: true
        })),
        shared: sharedEstimates.results.map((est) => ({
          id: est.id,
          name: est.name,
          createdAt: est.created_at,
          updatedAt: est.updated_at,
          isOwner: false,
          ownerEmail: est.owner_email
        }))
      });
    }
    if (method === "GET" && route && !route.includes("/")) {
      const estimateId = route;
      const estimate = await env.DB.prepare(`
                SELECT e.*, u.email as owner_email,
                       CASE WHEN e.user_id = ? THEN 1 ELSE 0 END as is_owner
                FROM estimates e
                LEFT JOIN estimate_shares s ON e.id = s.estimate_id AND s.shared_with_user_id = ?
                LEFT JOIN users u ON e.user_id = u.id
                WHERE e.id = ? AND (e.user_id = ? OR s.id IS NOT NULL)
            `).bind(user.id, user.id, estimateId, user.id).first();
      if (!estimate) {
        return errorResponse("Estimate not found", 404);
      }
      const response = {
        id: estimate.id,
        name: estimate.name,
        data: JSON.parse(estimate.estimate_data),
        createdAt: estimate.created_at,
        updatedAt: estimate.updated_at,
        isOwner: estimate.is_owner === 1
      };
      if (!response.isOwner) {
        response.ownerEmail = estimate.owner_email;
      }
      return jsonResponse(response);
    }
    if (method === "POST" && !route) {
      const body = await request.json();
      if (!body.name || !body.data) {
        return errorResponse("Missing required fields: name, data");
      }
      const estimateId = `est_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await env.DB.prepare(
        "INSERT INTO estimates (id, user_id, name, estimate_data, created_at, updated_at) VALUES (?, ?, ?, ?, unixepoch(), unixepoch())"
      ).bind(
        estimateId,
        user.id,
        body.name,
        JSON.stringify(body.data)
      ).run();
      return jsonResponse({
        id: estimateId,
        name: body.name,
        createdAt: Math.floor(Date.now() / 1e3),
        updatedAt: Math.floor(Date.now() / 1e3)
      }, 201);
    }
    if (method === "PUT" && route) {
      const estimateId = route;
      const body = await request.json();
      if (!body.name && !body.data) {
        return errorResponse("Must provide name or data to update");
      }
      const existing = await env.DB.prepare(
        "SELECT id FROM estimates WHERE id = ? AND user_id = ?"
      ).bind(estimateId, user.id).first();
      if (!existing) {
        return errorResponse("Estimate not found", 404);
      }
      const updates = [];
      const values = [];
      if (body.name) {
        updates.push("name = ?");
        values.push(body.name);
      }
      if (body.data) {
        updates.push("estimate_data = ?");
        values.push(JSON.stringify(body.data));
      }
      updates.push("updated_at = unixepoch()");
      values.push(estimateId, user.id);
      await env.DB.prepare(
        `UPDATE estimates SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`
      ).bind(...values).run();
      return jsonResponse({
        id: estimateId,
        name: body.name,
        updatedAt: Math.floor(Date.now() / 1e3)
      });
    }
    if (method === "DELETE" && route && !route.includes("/")) {
      const estimateId = route;
      const result = await env.DB.prepare(
        "DELETE FROM estimates WHERE id = ? AND user_id = ?"
      ).bind(estimateId, user.id).run();
      if (result.meta.changes === 0) {
        return errorResponse("Estimate not found", 404);
      }
      return jsonResponse({ success: true });
    }
    if (method === "POST" && route.endsWith("/share")) {
      const estimateId = route.replace("/share", "");
      const body = await request.json();
      if (!body.email) {
        return errorResponse("Email is required");
      }
      const estimate = await env.DB.prepare(
        "SELECT id FROM estimates WHERE id = ? AND user_id = ?"
      ).bind(estimateId, user.id).first();
      if (!estimate) {
        return errorResponse("Estimate not found or you do not have permission to share it", 403);
      }
      if (body.email.toLowerCase() === email.toLowerCase()) {
        return errorResponse("Cannot share estimate with yourself", 400);
      }
      const recipient = await ensureUser(env.DB, body.email);
      await env.DB.prepare(
        "INSERT OR IGNORE INTO estimate_shares (estimate_id, owner_user_id, shared_with_user_id) VALUES (?, ?, ?)"
      ).bind(estimateId, user.id, recipient.id).run();
      return jsonResponse({
        success: true,
        sharedWith: body.email
      });
    }
    if (method === "DELETE" && route.includes("/share/")) {
      const parts = route.split("/");
      const estimateId = parts[0];
      const sharedEmail = decodeURIComponent(parts[2]);
      const estimate = await env.DB.prepare(
        "SELECT id FROM estimates WHERE id = ? AND user_id = ?"
      ).bind(estimateId, user.id).first();
      if (!estimate) {
        return errorResponse("Estimate not found or you do not have permission to manage sharing", 403);
      }
      const recipient = await env.DB.prepare(
        "SELECT id FROM users WHERE email = ?"
      ).bind(sharedEmail).first();
      if (!recipient) {
        return errorResponse("User not found", 404);
      }
      await env.DB.prepare(
        "DELETE FROM estimate_shares WHERE estimate_id = ? AND owner_user_id = ? AND shared_with_user_id = ?"
      ).bind(estimateId, user.id, recipient.id).run();
      return jsonResponse({ success: true });
    }
    if (method === "GET" && route.endsWith("/shares")) {
      const estimateId = route.replace("/shares", "");
      const estimate = await env.DB.prepare(
        "SELECT id FROM estimates WHERE id = ? AND user_id = ?"
      ).bind(estimateId, user.id).first();
      if (!estimate) {
        return errorResponse("Estimate not found or you do not have permission to view sharing", 403);
      }
      const shares = await env.DB.prepare(`
                SELECT u.email, s.shared_at
                FROM estimate_shares s
                INNER JOIN users u ON s.shared_with_user_id = u.id
                WHERE s.estimate_id = ? AND s.owner_user_id = ?
                ORDER BY s.shared_at DESC
            `).bind(estimateId, user.id).all();
      return jsonResponse({
        shares: shares.results.map((share) => ({
          email: share.email,
          sharedAt: share.shared_at
        }))
      });
    }
    if (method === "POST" && route.endsWith("/copy")) {
      const estimateId = route.replace("/copy", "");
      const estimate = await env.DB.prepare(`
                SELECT e.*
                FROM estimates e
                LEFT JOIN estimate_shares s ON e.id = s.estimate_id AND s.shared_with_user_id = ?
                WHERE e.id = ? AND (e.user_id = ? OR s.id IS NOT NULL)
            `).bind(user.id, estimateId, user.id).first();
      if (!estimate) {
        return errorResponse("Estimate not found or you do not have access to it", 404);
      }
      const newEstimateId = `est_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newName = `Copy of ${estimate.name}`;
      await env.DB.prepare(
        "INSERT INTO estimates (id, user_id, name, estimate_data, created_at, updated_at) VALUES (?, ?, ?, ?, unixepoch(), unixepoch())"
      ).bind(
        newEstimateId,
        user.id,
        newName,
        estimate.estimate_data
      ).run();
      return jsonResponse({
        id: newEstimateId,
        name: newName,
        createdAt: Math.floor(Date.now() / 1e3),
        updatedAt: Math.floor(Date.now() / 1e3)
      }, 201);
    }
    return errorResponse("Method not allowed", 405);
  } catch (error) {
    console.error("API Error:", error);
    return errorResponse(error.message || "Internal server error", 500);
  }
}
__name(onRequest, "onRequest");

// ../.wrangler/tmp/pages-BgtqJv/functionsRoutes-0.060875246872991395.mjs
var routes = [
  {
    routePath: "/api/estimates/:route*",
    mountPath: "/api/estimates",
    method: "",
    middlewares: [],
    modules: [onRequest]
  }
];

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-cqmrdT/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-cqmrdT/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.42273005788029305.mjs.map
