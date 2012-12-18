





WebInspector.RequestView = function(request)
{
WebInspector.View.call(this);
this.registerRequiredCSS("resourceView.css");

this.element.addStyleClass("resource-view");
this.request = request;
}

WebInspector.RequestView.prototype = {
hasContent: function()
{
return false;
},

__proto__: WebInspector.View.prototype
}


WebInspector.RequestView.hasTextContent = function(request)
{
if (request.type.isTextType())
return true; 
if (request.type === WebInspector.resourceTypes.Other || request.hasErrorStatusCode())
return request.content && !request.contentEncoded;
return false;
}


WebInspector.RequestView.nonSourceViewForRequest = function(request)
{
switch (request.type) {
case WebInspector.resourceTypes.Image:
return new WebInspector.ImageView(request);
case WebInspector.resourceTypes.Font:
return new WebInspector.FontView(request);
default:
return new WebInspector.RequestView(request);
}
}
;



WebInspector.NetworkItemView = function(request)
{
WebInspector.TabbedPane.call(this);
this.element.addStyleClass("network-item-view");

var headersView = new WebInspector.RequestHeadersView(request);
this.appendTab("headers", WebInspector.UIString("Headers"), headersView);

this.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);

if (request.frames().length > 0) {
var frameView = new WebInspector.ResourceWebSocketFrameView(request);
this.appendTab("webSocketFrames", WebInspector.UIString("Frames"), frameView);
return;
}

var responseView = new WebInspector.RequestResponseView(request);
var previewView = new WebInspector.RequestPreviewView(request, responseView);
this.appendTab("preview", WebInspector.UIString("Preview"), previewView);
this.appendTab("response", WebInspector.UIString("Response"), responseView);

if (request.requestCookies || request.responseCookies) {
this._cookiesView = new WebInspector.RequestCookiesView(request);
this.appendTab("cookies", WebInspector.UIString("Cookies"), this._cookiesView);
}

if (request.timing) {
var timingView = new WebInspector.RequestTimingView(request);
this.appendTab("timing", WebInspector.UIString("Timing"), timingView);
}
this._request = request;
}

WebInspector.NetworkItemView.prototype = {
wasShown: function()
{
WebInspector.TabbedPane.prototype.wasShown.call(this);
this._selectTab();
},


_selectTab: function(tabId)
{
if (!tabId)
tabId = WebInspector.settings.resourceViewTab.get();

if (!this.selectTab(tabId)) {
this._isInFallbackSelection = true;
this.selectTab("headers");
delete this._isInFallbackSelection;
}
},

_tabSelected: function(event)
{
if (event.data.isUserGesture)
WebInspector.settings.resourceViewTab.set(event.data.tabId);
},


request: function()
{
return this._request;
},

__proto__: WebInspector.TabbedPane.prototype
}


WebInspector.RequestContentView = function(request)
{
WebInspector.RequestView.call(this, request);
}

WebInspector.RequestContentView.prototype = {
hasContent: function()
{
return true;
},

get innerView()
{
return this._innerView;
},

set innerView(innerView)
{
this._innerView = innerView;
},

wasShown: function()
{
this._ensureInnerViewShown();
},

_ensureInnerViewShown: function()
{
if (this._innerViewShowRequested)
return;
this._innerViewShowRequested = true;


function callback(content, contentEncoded, mimeType)
{
this._innerViewShowRequested = false;
this.contentLoaded();
}

this.request.requestContent(callback.bind(this));
},

contentLoaded: function()
{

},

canHighlightLine: function()
{
return this._innerView && this._innerView.canHighlightLine();
},

highlightLine: function(line)
{
if (this.canHighlightLine())
this._innerView.highlightLine(line);
},

__proto__: WebInspector.RequestView.prototype
}
;



WebInspector.RequestCookiesView = function(request)
{
WebInspector.View.call(this);
this.element.addStyleClass("resource-cookies-view");

this._request = request;

request.addEventListener(WebInspector.NetworkRequest.Events.RequestHeadersChanged, this._refreshCookies, this);
request.addEventListener(WebInspector.NetworkRequest.Events.ResponseHeadersChanged, this._refreshCookies, this);
}

WebInspector.RequestCookiesView.prototype = {
wasShown: function()
{
if (!this._gotCookies) {
if (!this._emptyView) {
this._emptyView = new WebInspector.EmptyView(WebInspector.UIString("This request has no cookies."));
this._emptyView.show(this.element);
}
return;
}

if (!this._cookiesTable)
this._buildCookiesTable();
},

get _gotCookies()
{
return (this._request.requestCookies && this._request.requestCookies.length) || (this._request.responseCookies && this._request.responseCookies.length);
},

_buildCookiesTable: function()
{
this.detachChildViews();

this._cookiesTable = new WebInspector.CookiesTable(null, true);
this._cookiesTable.addCookiesFolder(WebInspector.UIString("Request Cookies"), this._request.requestCookies);
this._cookiesTable.addCookiesFolder(WebInspector.UIString("Response Cookies"), this._request.responseCookies);
this._cookiesTable.show(this.element);
},

_refreshCookies: function()
{
delete this._cookiesTable;
if (!this._gotCookies || !this.isShowing())
return;
this._buildCookiesTable();
this._cookiesTable.updateWidths();
},

__proto__: WebInspector.View.prototype
}
;



WebInspector.RequestHeadersView = function(request)
{
WebInspector.View.call(this);
this.registerRequiredCSS("resourceView.css");
this.element.addStyleClass("resource-headers-view");

this._request = request;

this._headersListElement = document.createElement("ol");
this._headersListElement.className = "outline-disclosure";
this.element.appendChild(this._headersListElement);

this._headersTreeOutline = new TreeOutline(this._headersListElement);
this._headersTreeOutline.expandTreeElementsWhenArrowing = true;

this._urlTreeElement = new TreeElement("", null, false);
this._urlTreeElement.selectable = false;
this._headersTreeOutline.appendChild(this._urlTreeElement);

this._requestMethodTreeElement = new TreeElement("", null, false);
this._requestMethodTreeElement.selectable = false;
this._headersTreeOutline.appendChild(this._requestMethodTreeElement);

this._statusCodeTreeElement = new TreeElement("", null, false);
this._statusCodeTreeElement.selectable = false;
this._headersTreeOutline.appendChild(this._statusCodeTreeElement);

this._requestHeadersTreeElement = new TreeElement("", null, true);
this._requestHeadersTreeElement.expanded = true;
this._requestHeadersTreeElement.selectable = false;
this._headersTreeOutline.appendChild(this._requestHeadersTreeElement);

this._decodeRequestParameters = true;

this._showRequestHeadersText = false;
this._showResponseHeadersText = false;

this._queryStringTreeElement = new TreeElement("", null, true);
this._queryStringTreeElement.expanded = true;
this._queryStringTreeElement.selectable = false;
this._queryStringTreeElement.hidden = true;
this._headersTreeOutline.appendChild(this._queryStringTreeElement);

this._urlFragmentTreeElement = new TreeElement("", null, true);
this._urlFragmentTreeElement.expanded = true;
this._urlFragmentTreeElement.selectable = false;
this._urlFragmentTreeElement.hidden = true;
this._headersTreeOutline.appendChild(this._urlFragmentTreeElement);

this._formDataTreeElement = new TreeElement("", null, true);
this._formDataTreeElement.expanded = true;
this._formDataTreeElement.selectable = false;
this._formDataTreeElement.hidden = true;
this._headersTreeOutline.appendChild(this._formDataTreeElement);

this._requestPayloadTreeElement = new TreeElement(WebInspector.UIString("Request Payload"), null, true);
this._requestPayloadTreeElement.expanded = true;
this._requestPayloadTreeElement.selectable = false;
this._requestPayloadTreeElement.hidden = true;
this._headersTreeOutline.appendChild(this._requestPayloadTreeElement);

this._responseHeadersTreeElement = new TreeElement("", null, true);
this._responseHeadersTreeElement.expanded = true;
this._responseHeadersTreeElement.selectable = false;
this._headersTreeOutline.appendChild(this._responseHeadersTreeElement);

request.addEventListener(WebInspector.NetworkRequest.Events.RequestHeadersChanged, this._refreshRequestHeaders, this);
request.addEventListener(WebInspector.NetworkRequest.Events.ResponseHeadersChanged, this._refreshResponseHeaders, this);
request.addEventListener(WebInspector.NetworkRequest.Events.FinishedLoading, this._refreshHTTPInformation, this);

this._refreshURL();
this._refreshQueryString();
this._refreshUrlFragment();
this._refreshRequestHeaders();
this._refreshResponseHeaders();
this._refreshHTTPInformation();
}

WebInspector.RequestHeadersView.prototype = {

_formatHeader: function(name, value)
{
var fragment = document.createDocumentFragment();
fragment.createChild("div", "header-name").textContent = name + ":";
fragment.createChild("div", "header-value source-code").textContent = value;

return fragment;
},


_formatParameter: function(value, className, decodeParameters)
{
var errorDecoding = false;

if (decodeParameters) {
value = value.replace(/\+/g, " ");
if (value.indexOf("%") >= 0) {
try {
value = decodeURIComponent(value);
} catch(e) {
errorDecoding = true;
}
}
}
var div = document.createElement("div");
div.className = className;
if (errorDecoding)
div.createChild("span", "error-message").textContent = WebInspector.UIString("(unable to decode value)");
else
div.textContent = value;
return div;
},

_refreshURL: function()
{
this._urlTreeElement.title = this._formatHeader(WebInspector.UIString("Request URL"), this._request.url);
},

_refreshQueryString: function()
{
var queryString = this._request.queryString();
var queryParameters = this._request.queryParameters;
this._queryStringTreeElement.hidden = !queryParameters;
if (queryParameters)
this._refreshParams(WebInspector.UIString("Query String Parameters"), queryParameters, queryString, this._queryStringTreeElement);
},

_refreshUrlFragment: function()
{
var urlFragment = this._request.parsedURL.fragment;
this._urlFragmentTreeElement.hidden = !urlFragment;

if (!urlFragment)
return;

var sectionTitle = WebInspector.UIString("URL fragment");

this._urlFragmentTreeElement.removeChildren();
this._urlFragmentTreeElement.listItemElement.removeChildren();
this._urlFragmentTreeElement.listItemElement.appendChild(document.createTextNode(sectionTitle));

var fragmentTreeElement = new TreeElement(null, null, false);
fragmentTreeElement.title = this._formatHeader("#", urlFragment);
fragmentTreeElement.selectable = false;
this._urlFragmentTreeElement.appendChild(fragmentTreeElement);
},

_refreshFormData: function()
{
this._formDataTreeElement.hidden = true;
this._requestPayloadTreeElement.hidden = true;

var formData = this._request.requestFormData;
if (!formData)
return;

var formParameters = this._request.formParameters;
if (formParameters) {
this._formDataTreeElement.hidden = false;
this._refreshParams(WebInspector.UIString("Form Data"), formParameters, formData, this._formDataTreeElement);
} else {
this._requestPayloadTreeElement.hidden = false;
this._populateTreeElementWithSourceText(this._requestPayloadTreeElement, formData)
}
},

_populateTreeElementWithSourceText: function(treeElement, sourceText)
{
treeElement.removeChildren();

var sourceTreeElement = new TreeElement(null, null, false);
sourceTreeElement.selectable = false;
treeElement.appendChild(sourceTreeElement);

var sourceTextElement = document.createElement("span");
sourceTextElement.addStyleClass("header-value");
sourceTextElement.addStyleClass("source-code");
sourceTextElement.textContent = String(sourceText).trim();
sourceTreeElement.listItemElement.appendChild(sourceTextElement);
},

_refreshParams: function(title, params, sourceText, paramsTreeElement)
{
paramsTreeElement.removeChildren();

paramsTreeElement.listItemElement.removeChildren();
paramsTreeElement.listItemElement.appendChild(document.createTextNode(title));

var headerCount = document.createElement("span");
headerCount.addStyleClass("header-count");
headerCount.textContent = WebInspector.UIString(" (%d)", params.length);
paramsTreeElement.listItemElement.appendChild(headerCount);

function toggleViewSource()
{
paramsTreeElement._viewSource = !paramsTreeElement._viewSource;
this._refreshParams(title, params, sourceText, paramsTreeElement);
}

var viewSourceToggleTitle = paramsTreeElement._viewSource ? WebInspector.UIString("view parsed") : WebInspector.UIString("view source");
var viewSourceToggleButton = this._createToggleButton(viewSourceToggleTitle);
viewSourceToggleButton.addEventListener("click", toggleViewSource.bind(this));
paramsTreeElement.listItemElement.appendChild(viewSourceToggleButton);

if (paramsTreeElement._viewSource) {
this._populateTreeElementWithSourceText(paramsTreeElement, sourceText);
return;
}

var toggleTitle = this._decodeRequestParameters ? WebInspector.UIString("view URL encoded") : WebInspector.UIString("view decoded");
var toggleButton = this._createToggleButton(toggleTitle);
toggleButton.addEventListener("click", this._toggleURLDecoding.bind(this));
paramsTreeElement.listItemElement.appendChild(toggleButton);

for (var i = 0; i < params.length; ++i) {
var paramNameValue = document.createDocumentFragment();
var name = this._formatParameter(params[i].name + ":", "header-name", this._decodeRequestParameters);
var value = this._formatParameter(params[i].value, "header-value source-code", this._decodeRequestParameters);
paramNameValue.appendChild(name);
paramNameValue.appendChild(value);

var parmTreeElement = new TreeElement(paramNameValue, null, false);
parmTreeElement.selectable = false;
paramsTreeElement.appendChild(parmTreeElement);
}
},

_toggleURLDecoding: function(event)
{
this._decodeRequestParameters = !this._decodeRequestParameters;
this._refreshQueryString();
this._refreshFormData();
},

_getHeaderValue: function(headers, key)
{
var lowerKey = key.toLowerCase();
for (var testKey in headers) {
if (testKey.toLowerCase() === lowerKey)
return headers[testKey];
}
},

_refreshRequestHeaders: function()
{
var additionalRow = null;
if (typeof this._request.webSocketRequestKey3 !== "undefined")
additionalRow = {name: "(Key3)", value: this._request.webSocketRequestKey3};
if (this._showRequestHeadersText)
this._refreshHeadersText(WebInspector.UIString("Request Headers"), this._request.sortedRequestHeaders, this._request.requestHeadersText, this._requestHeadersTreeElement);
else
this._refreshHeaders(WebInspector.UIString("Request Headers"), this._request.sortedRequestHeaders, additionalRow, this._requestHeadersTreeElement);

if (this._request.requestHeadersText) {
var toggleButton = this._createHeadersToggleButton(this._showRequestHeadersText);
toggleButton.addEventListener("click", this._toggleRequestHeadersText.bind(this));
this._requestHeadersTreeElement.listItemElement.appendChild(toggleButton);
}

this._refreshFormData();
},

_refreshResponseHeaders: function()
{
var additionalRow = null;
if (typeof this._request.webSocketChallengeResponse !== "undefined")
additionalRow = {name: "(Challenge Response)", value: this._request.webSocketChallengeResponse};
if (this._showResponseHeadersText)
this._refreshHeadersText(WebInspector.UIString("Response Headers"), this._request.sortedResponseHeaders, this._request.responseHeadersText, this._responseHeadersTreeElement);
else
this._refreshHeaders(WebInspector.UIString("Response Headers"), this._request.sortedResponseHeaders, additionalRow, this._responseHeadersTreeElement);

if (this._request.responseHeadersText) {
var toggleButton = this._createHeadersToggleButton(this._showResponseHeadersText);
toggleButton.addEventListener("click", this._toggleResponseHeadersText.bind(this));
this._responseHeadersTreeElement.listItemElement.appendChild(toggleButton);
}
},

_refreshHTTPInformation: function()
{
var requestMethodElement = this._requestMethodTreeElement;
requestMethodElement.hidden = !this._request.statusCode;
var statusCodeElement = this._statusCodeTreeElement;
statusCodeElement.hidden = !this._request.statusCode;

if (this._request.statusCode) {
var statusImageSource = "";
if (this._request.statusCode < 300 || this._request.statusCode === 304)
statusImageSource = "Images/successGreenDot.png";
else if (this._request.statusCode < 400)
statusImageSource = "Images/warningOrangeDot.png";
else
statusImageSource = "Images/errorRedDot.png";

requestMethodElement.title = this._formatHeader(WebInspector.UIString("Request Method"), this._request.requestMethod);

var statusCodeFragment = document.createDocumentFragment();
statusCodeFragment.createChild("div", "header-name").textContent = WebInspector.UIString("Status Code") + ":";

var statusCodeImage = statusCodeFragment.createChild("img", "resource-status-image");
statusCodeImage.src = statusImageSource;
statusCodeImage.title = this._request.statusCode + " " + this._request.statusText;
var value = statusCodeFragment.createChild("div", "header-value source-code");
value.textContent = this._request.statusCode + " " + this._request.statusText;
if (this._request.cached)
value.createChild("span", "status-from-cache").textContent = " " + WebInspector.UIString("(from cache)");

statusCodeElement.title = statusCodeFragment;
}
},

_refreshHeadersTitle: function(title, headersTreeElement, headersLength)
{
headersTreeElement.listItemElement.removeChildren();
headersTreeElement.listItemElement.appendChild(document.createTextNode(title));

var headerCount = document.createElement("span");
headerCount.addStyleClass("header-count");
headerCount.textContent = WebInspector.UIString(" (%d)", headersLength);
headersTreeElement.listItemElement.appendChild(headerCount);
},

_refreshHeaders: function(title, headers, additionalRow, headersTreeElement)
{
headersTreeElement.removeChildren();

var length = headers.length;
this._refreshHeadersTitle(title, headersTreeElement, length);
headersTreeElement.hidden = !length;
for (var i = 0; i < length; ++i) {
var headerTreeElement = new TreeElement(null, null, false);
headerTreeElement.title = this._formatHeader(headers[i].name, headers[i].value);
headerTreeElement.selectable = false;
headersTreeElement.appendChild(headerTreeElement);
}

if (additionalRow) {
var headerTreeElement = new TreeElement(null, null, false);
headerTreeElement.title = this._formatHeader(additionalRow.name, additionalRow.value);
headerTreeElement.selectable = false;
headersTreeElement.appendChild(headerTreeElement);
}
},

_refreshHeadersText: function(title, headers, headersText, headersTreeElement)
{
this._populateTreeElementWithSourceText(headersTreeElement, headersText);
this._refreshHeadersTitle(title, headersTreeElement, headers.length);
},

_toggleRequestHeadersText: function(event)
{
this._showRequestHeadersText = !this._showRequestHeadersText;
this._refreshRequestHeaders();
},

_toggleResponseHeadersText: function(event)
{
this._showResponseHeadersText = !this._showResponseHeadersText;
this._refreshResponseHeaders();
},

_createToggleButton: function(title)
{
var button = document.createElement("span");
button.addStyleClass("header-toggle");
button.textContent = title;
return button;
},

_createHeadersToggleButton: function(isHeadersTextShown)
{
var toggleTitle = isHeadersTextShown ? WebInspector.UIString("view parsed") : WebInspector.UIString("view source");
return this._createToggleButton(toggleTitle);
},

__proto__: WebInspector.View.prototype
}
;



WebInspector.RequestHTMLView = function(request, dataURL)
{
WebInspector.RequestView.call(this, request);
this._dataURL = dataURL;
this.element.addStyleClass("html");
}

WebInspector.RequestHTMLView.prototype = {
hasContent: function()
{
return true;
},

wasShown: function()
{
this._createIFrame();
},

willHide: function(parentElement)
{
this.element.removeChildren();
},

_createIFrame: function()
{


this.element.removeChildren();
var iframe = document.createElement("iframe");
iframe.setAttribute("sandbox", ""); 
iframe.setAttribute("src", this._dataURL);
this.element.appendChild(iframe);
},

__proto__: WebInspector.RequestView.prototype
}
;



WebInspector.RequestJSONView = function(request, parsedJSON)
{
WebInspector.RequestView.call(this, request);
this._parsedJSON = parsedJSON;
this.element.addStyleClass("json");
}

WebInspector.RequestJSONView.parseJSON = function(text)
{
var prefix = "";


var start = /[{[]/.exec(text);
if (start && start.index) {
prefix = text.substring(0, start.index);
text = text.substring(start.index);
}

try {
return new WebInspector.ParsedJSON(JSON.parse(text), prefix, "");
} catch (e) {
return;
}
}

WebInspector.RequestJSONView.parseJSONP = function(text)
{

var start = text.indexOf("(");
var end = text.lastIndexOf(")");
if (start == -1 || end == -1 || end < start)
return;

var prefix = text.substring(0, start + 1);
var suffix = text.substring(end);
text = text.substring(start + 1, end);

try {
return new WebInspector.ParsedJSON(JSON.parse(text), prefix, suffix);
} catch (e) {
return;
}
}

WebInspector.RequestJSONView.prototype = {
hasContent: function()
{
return true;
},

wasShown: function()
{
this._initialize();
},

_initialize: function()
{
if (this._initialized)
return;
this._initialized = true;

var obj = WebInspector.RemoteObject.fromLocalObject(this._parsedJSON.data);
var title = this._parsedJSON.prefix + obj.description + this._parsedJSON.suffix;
var section = new WebInspector.ObjectPropertiesSection(obj, title);
section.expand();
section.editable = false;
this.element.appendChild(section.element);
},

__proto__: WebInspector.RequestView.prototype
}


WebInspector.ParsedJSON = function(data, prefix, suffix)
{
this.data = data;
this.prefix = prefix;
this.suffix = suffix;
}
;



WebInspector.RequestPreviewView = function(request, responseView)
{
WebInspector.RequestContentView.call(this, request);
this._responseView = responseView;
}

WebInspector.RequestPreviewView.prototype = {
contentLoaded: function()
{
if (!this.request.content) {
if (!this._emptyView) {
this._emptyView = this._createEmptyView();
this._emptyView.show(this.element);
this.innerView = this._emptyView;
}
} else {
if (this._emptyView) {
this._emptyView.detach();
delete this._emptyView;
}

if (!this._previewView)
this._previewView = this._createPreviewView();
this._previewView.show(this.element);
this.innerView = this._previewView;
}
},

_createEmptyView: function()
{
return new WebInspector.EmptyView(WebInspector.UIString("This request has no preview available."));
},

_createPreviewView: function()
{
if (this.request.content) {
if (this.request.hasErrorStatusCode() || (this.request.type === WebInspector.resourceTypes.XHR && this.request.mimeType === "text/html")) {
var dataURL = this.request.asDataURL();
if (dataURL !== null)
return new WebInspector.RequestHTMLView(this.request, dataURL);
}
}

if (this.request.type === WebInspector.resourceTypes.XHR && this.request.content) {
var parsedJSON = WebInspector.RequestJSONView.parseJSON(this.request.content);
if (parsedJSON)
return new WebInspector.RequestJSONView(this.request, parsedJSON);
}

if (this.request.content && this.request.type === WebInspector.resourceTypes.Script && this.request.mimeType === "application/json") {
var parsedJSONP = WebInspector.RequestJSONView.parseJSONP(this.request.content);
if (parsedJSONP)
return new WebInspector.RequestJSONView(this.request, parsedJSONP);
}

if (this._responseView.sourceView)
return this._responseView.sourceView;

if (this.request.type === WebInspector.resourceTypes.Other)
return this._createEmptyView();

return WebInspector.RequestView.nonSourceViewForRequest(this.request);
},

__proto__: WebInspector.RequestContentView.prototype
}
;



WebInspector.RequestResponseView = function(request)
{
WebInspector.RequestContentView.call(this, request);
}

WebInspector.RequestResponseView.prototype = {
get sourceView()
{
if (!this._sourceView && WebInspector.RequestView.hasTextContent(this.request))
this._sourceView = new WebInspector.ResourceSourceFrame(this.request);
return this._sourceView;
},

contentLoaded: function()
{
if (!this.request.content || !this.sourceView) {
if (!this._emptyView) {
this._emptyView = new WebInspector.EmptyView(WebInspector.UIString("This request has no response data available."));
this._emptyView.show(this.element);
this.innerView = this._emptyView;
}
} else {
if (this._emptyView) {
this._emptyView.detach();
delete this._emptyView;
}

this.sourceView.show(this.element);
this.innerView = this.sourceView;
}
},

__proto__: WebInspector.RequestContentView.prototype
}
;



WebInspector.RequestTimingView = function(request)
{
WebInspector.View.call(this);
this.element.addStyleClass("resource-timing-view");

this._request = request;

request.addEventListener(WebInspector.NetworkRequest.Events.TimingChanged, this._refresh, this);
}

WebInspector.RequestTimingView.prototype = {
wasShown: function()
{
if (!this._request.timing) {
if (!this._emptyView) {
this._emptyView = new WebInspector.EmptyView(WebInspector.UIString("This request has no detailed timing info."));
this._emptyView.show(this.element);
this.innerView = this._emptyView;
}
return;
}

if (this._emptyView) {
this._emptyView.detach();
delete this._emptyView;
}

this._refresh();
},

_refresh: function()
{
if (this._tableElement)
this._tableElement.parentElement.removeChild(this._tableElement);

this._tableElement = WebInspector.RequestTimingView.createTimingTable(this._request);
this.element.appendChild(this._tableElement);
},

__proto__: WebInspector.View.prototype
}


WebInspector.RequestTimingView.createTimingTable = function(request)
{
var tableElement = document.createElement("table");
var rows = [];

function addRow(title, className, start, end)
{
var row = {};
row.title = title;
row.className = className;
row.start = start;
row.end = end;
rows.push(row);
}

if (request.timing.proxyStart !== -1)
addRow(WebInspector.UIString("Proxy"), "proxy", request.timing.proxyStart, request.timing.proxyEnd);

if (request.timing.dnsStart !== -1)
addRow(WebInspector.UIString("DNS Lookup"), "dns", request.timing.dnsStart, request.timing.dnsEnd);

if (request.timing.connectStart !== -1) {
if (request.connectionReused)
addRow(WebInspector.UIString("Blocking"), "connecting", request.timing.connectStart, request.timing.connectEnd);
else {
var connectStart = request.timing.connectStart;

if (request.timing.dnsStart !== -1)
connectStart += request.timing.dnsEnd - request.timing.dnsStart;
addRow(WebInspector.UIString("Connecting"), "connecting", connectStart, request.timing.connectEnd);
}
}

if (request.timing.sslStart !== -1)
addRow(WebInspector.UIString("SSL"), "ssl", request.timing.sslStart, request.timing.sslEnd);

var sendStart = request.timing.sendStart;
if (request.timing.sslStart !== -1)
sendStart += request.timing.sslEnd - request.timing.sslStart;

addRow(WebInspector.UIString("Sending"), "sending", request.timing.sendStart, request.timing.sendEnd);
addRow(WebInspector.UIString("Waiting"), "waiting", request.timing.sendEnd, request.timing.receiveHeadersEnd);
addRow(WebInspector.UIString("Receiving"), "receiving", (request.responseReceivedTime - request.timing.requestTime) * 1000, (request.endTime - request.timing.requestTime) * 1000);

const chartWidth = 200;
var total = (request.endTime - request.timing.requestTime) * 1000;
var scale = chartWidth / total;

for (var i = 0; i < rows.length; ++i) {
var tr = document.createElement("tr");
tableElement.appendChild(tr);

var td = document.createElement("td");
td.textContent = rows[i].title;
tr.appendChild(td);

td = document.createElement("td");
td.width = chartWidth + "px";

var row = document.createElement("div");
row.className = "network-timing-row";
td.appendChild(row);

var bar = document.createElement("span");
bar.className = "network-timing-bar " + rows[i].className;
bar.style.left = scale * rows[i].start + "px";
bar.style.right = scale * (total - rows[i].end) + "px";
bar.style.backgroundColor = rows[i].color;
bar.textContent = "\u200B"; 
row.appendChild(bar);

var title = document.createElement("span");
title.className = "network-timing-bar-title";
if (total - rows[i].end < rows[i].start)
title.style.right = (scale * (total - rows[i].end) + 3) + "px";
else
title.style.left = (scale * rows[i].start + 3) + "px";
title.textContent = Number.secondsToString((rows[i].end - rows[i].start) / 1000);
row.appendChild(title);

tr.appendChild(td);
}
return tableElement;
}
;



WebInspector.ResourceWebSocketFrameView = function(resource)
{
WebInspector.View.call(this);
this.element.addStyleClass("resource-websocket");
this.resource = resource;
this.element.removeChildren();

var dataGrid = new WebInspector.DataGrid({
data: {title: WebInspector.UIString("Data"), sortable: false},
length: {title: WebInspector.UIString("Length"), sortable: false, aligned: "right", width: "50px"},
time: {title: WebInspector.UIString("Time"), width: "70px"}
});

var frames = this.resource.frames();
for (var i = 0; i < frames.length; i++) {
var payload = frames[i];

var date = new Date(payload.time * 1000);
var row = {
data: "",
length: payload.payloadData.length.toString(),
time: date.toLocaleTimeString()
};

var rowClass = "";
if (payload.errorMessage) {
rowClass = "error";
row.data = payload.errorMessage;
} else if (payload.opcode == WebInspector.ResourceWebSocketFrameView.OpCodes.TextFrame) {
if (payload.sent)
rowClass = "outcoming";

row.data = payload.payloadData;
} else {
rowClass = "opcode";
var opcodeMeaning = "";
switch (payload.opcode) {
case WebInspector.ResourceWebSocketFrameView.OpCodes.ContinuationFrame:
opcodeMeaning = WebInspector.UIString("Continuation Frame");
break;
case WebInspector.ResourceWebSocketFrameView.OpCodes.BinaryFrame:
opcodeMeaning = WebInspector.UIString("Binary Frame");
break;
case WebInspector.ResourceWebSocketFrameView.OpCodes.ConnectionCloseFrame:
opcodeMeaning = WebInspector.UIString("Connection Close Frame");
break;
case WebInspector.ResourceWebSocketFrameView.OpCodes.PingFrame:
opcodeMeaning = WebInspector.UIString("Ping Frame");
break;
case WebInspector.ResourceWebSocketFrameView.OpCodes.PongFrame:
opcodeMeaning = WebInspector.UIString("Pong Frame");
break;
}
row.data = WebInspector.UIString("%s (Opcode %d%s)", opcodeMeaning, payload.opcode, (payload.mask ? ", mask" : ""));
}

var node = new WebInspector.DataGridNode(row, false);
dataGrid.rootNode().appendChild(node);

if (rowClass)
node.element.classList.add("resource-websocket-row-" + rowClass);

}
dataGrid.show(this.element);
}

WebInspector.ResourceWebSocketFrameView.OpCodes = {
ContinuationFrame: 0,
TextFrame: 1,
BinaryFrame: 2,
ConnectionCloseFrame: 8,
PingFrame: 9,
PongFrame: 10
};

WebInspector.ResourceWebSocketFrameView.prototype = {
__proto__: WebInspector.View.prototype
}
;


WebInspector.NetworkLogView = function()
{
WebInspector.View.call(this);
this.registerRequiredCSS("networkLogView.css");

this._allowRequestSelection = false;
this._requests = [];
this._requestsById = {};
this._requestsByURL = {};
this._staleRequests = {};
this._requestGridNodes = {};
this._lastRequestGridNodeId = 0;
this._mainRequestLoadTime = -1;
this._mainRequestDOMContentTime = -1;
this._hiddenCategories = {};
this._matchedRequests = [];
this._filteredOutRequests = new Map();

this._matchedRequestsMap = {};
this._currentMatchedRequestIndex = -1;

this._createStatusbarButtons();
this._createStatusBarItems();
this._linkifier = new WebInspector.Linkifier();

WebInspector.networkManager.addEventListener(WebInspector.NetworkManager.EventTypes.RequestStarted, this._onRequestStarted, this);
WebInspector.networkManager.addEventListener(WebInspector.NetworkManager.EventTypes.RequestUpdated, this._onRequestUpdated, this);
WebInspector.networkManager.addEventListener(WebInspector.NetworkManager.EventTypes.RequestFinished, this._onRequestUpdated, this);

WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated, this._mainFrameNavigated, this);
WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.OnLoad, this._onLoadEventFired, this);
WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.DOMContentLoaded, this._domContentLoadedEventFired, this);

this._initializeView();
function onCanClearBrowserCache(error, result)
{
this._canClearBrowserCache = result;
}
NetworkAgent.canClearBrowserCache(onCanClearBrowserCache.bind(this));

function onCanClearBrowserCookies(error, result)
{
this._canClearBrowserCookies = result;
}
NetworkAgent.canClearBrowserCookies(onCanClearBrowserCookies.bind(this));

WebInspector.networkLog.requests.forEach(this._appendRequest.bind(this));
}

WebInspector.NetworkLogView.prototype = {
_initializeView: function()
{
this.element.id = "network-container";

this._createSortingFunctions();
this._createTable();
this._createTimelineGrid();
this._createSummaryBar();

if (!this.useLargeRows)
this._setLargerRequests(this.useLargeRows);

this._allowPopover = true;
this._popoverHelper = new WebInspector.PopoverHelper(this.element, this._getPopoverAnchor.bind(this), this._showPopover.bind(this));

this._popoverHelper.setTimeout(100);

this.calculator = new WebInspector.NetworkTransferTimeCalculator();
this._filter(this._filterAllElement, false);

this.switchToDetailedView();
},

get statusBarItems()
{
return [this._largerRequestsButton.element, this._preserveLogToggle.element, this._clearButton.element, this._filterBarElement, this._progressBarContainer];
},

get useLargeRows()
{
return WebInspector.settings.resourcesLargeRows.get();
},

set allowPopover(flag)
{
this._allowPopover = flag;
},

elementsToRestoreScrollPositionsFor: function()
{
if (!this._dataGrid) 
return [];
return [this._dataGrid.scrollContainer];
},

onResize: function()
{
this._updateOffscreenRows();
},

_createTimelineGrid: function()
{
this._timelineGrid = new WebInspector.TimelineGrid();
this._timelineGrid.element.addStyleClass("network-timeline-grid");
this._dataGrid.element.appendChild(this._timelineGrid.element);
},

_createTable: function()
{
var columns = {name: {}, method: {}, status: {}, type: {}, initiator: {}, size: {}, time: {}, timeline: {}};

columns.name.titleDOMFragment = this._makeHeaderFragment(WebInspector.UIString("Name"), WebInspector.UIString("Path"));
columns.name.sortable = true;
columns.name.width = "20%";
columns.name.disclosure = true;

columns.method.title = WebInspector.UIString("Method");
columns.method.sortable = true;
columns.method.width = "6%";

columns.status.titleDOMFragment = this._makeHeaderFragment(WebInspector.UIString("Status"), WebInspector.UIString("Text"));
columns.status.sortable = true;
columns.status.width = "6%";

columns.type.title = WebInspector.UIString("Type");
columns.type.sortable = true;
columns.type.width = "6%";

columns.initiator.title = WebInspector.UIString("Initiator");
columns.initiator.sortable = true;
columns.initiator.width = "10%";

columns.size.titleDOMFragment = this._makeHeaderFragment(WebInspector.UIString("Size"), WebInspector.UIString("Content"));
columns.size.sortable = true;
columns.size.width = "6%";
columns.size.aligned = "right";

columns.time.titleDOMFragment = this._makeHeaderFragment(WebInspector.UIString("Time"), WebInspector.UIString("Latency"));
columns.time.sortable = true;
columns.time.width = "6%";
columns.time.aligned = "right";

columns.timeline.title = "";
columns.timeline.sortable = false;
columns.timeline.width = "40%";
columns.timeline.sort = "ascending";

this._dataGrid = new WebInspector.DataGrid(columns);
this._dataGrid.resizeMethod = WebInspector.DataGrid.ResizeMethod.Last;
this._dataGrid.element.addStyleClass("network-log-grid");
this._dataGrid.element.addEventListener("contextmenu", this._contextMenu.bind(this), true);
this._dataGrid.show(this.element);


this._dataGrid.addEventListener("sorting changed", this._sortItems, this);
this._dataGrid.addEventListener("width changed", this._updateDividersIfNeeded, this);
this._dataGrid.scrollContainer.addEventListener("scroll", this._updateOffscreenRows.bind(this));

this._patchTimelineHeader();
},

_makeHeaderFragment: function(title, subtitle)
{
var fragment = document.createDocumentFragment();
fragment.appendChild(document.createTextNode(title));
var subtitleDiv = document.createElement("div");
subtitleDiv.className = "network-header-subtitle";
subtitleDiv.textContent = subtitle;
fragment.appendChild(subtitleDiv);
return fragment;
},

_patchTimelineHeader: function()
{
var timelineSorting = document.createElement("select");

var option = document.createElement("option");
option.value = "startTime";
option.label = WebInspector.UIString("Timeline");
timelineSorting.appendChild(option);

option = document.createElement("option");
option.value = "startTime";
option.label = WebInspector.UIString("Start Time");
timelineSorting.appendChild(option);

option = document.createElement("option");
option.value = "responseTime";
option.label = WebInspector.UIString("Response Time");
timelineSorting.appendChild(option);

option = document.createElement("option");
option.value = "endTime";
option.label = WebInspector.UIString("End Time");
timelineSorting.appendChild(option);

option = document.createElement("option");
option.value = "duration";
option.label = WebInspector.UIString("Duration");
timelineSorting.appendChild(option);

option = document.createElement("option");
option.value = "latency";
option.label = WebInspector.UIString("Latency");
timelineSorting.appendChild(option);

var header = this._dataGrid.headerTableHeader("timeline");
header.replaceChild(timelineSorting, header.firstChild);

timelineSorting.addEventListener("click", function(event) { event.consume() }, false);
timelineSorting.addEventListener("change", this._sortByTimeline.bind(this), false);
this._timelineSortSelector = timelineSorting;
},

_createSortingFunctions: function()
{
this._sortingFunctions = {};
this._sortingFunctions.name = WebInspector.NetworkDataGridNode.NameComparator;
this._sortingFunctions.method = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "method", false);
this._sortingFunctions.status = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "statusCode", false);
this._sortingFunctions.type = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "mimeType", false);
this._sortingFunctions.initiator = WebInspector.NetworkDataGridNode.InitiatorComparator;
this._sortingFunctions.size = WebInspector.NetworkDataGridNode.SizeComparator;
this._sortingFunctions.time = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "duration", false);
this._sortingFunctions.timeline = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "startTime", false);
this._sortingFunctions.startTime = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "startTime", false);
this._sortingFunctions.endTime = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "endTime", false);
this._sortingFunctions.responseTime = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "responseReceivedTime", false);
this._sortingFunctions.duration = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "duration", true);
this._sortingFunctions.latency = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "latency", true);

var timeCalculator = new WebInspector.NetworkTransferTimeCalculator();
var durationCalculator = new WebInspector.NetworkTransferDurationCalculator();

this._calculators = {};
this._calculators.timeline = timeCalculator;
this._calculators.startTime = timeCalculator;
this._calculators.endTime = timeCalculator;
this._calculators.responseTime = timeCalculator;
this._calculators.duration = durationCalculator;
this._calculators.latency = durationCalculator;
},

_sortItems: function()
{
this._removeAllNodeHighlights();
var columnIdentifier = this._dataGrid.sortColumnIdentifier;
if (columnIdentifier === "timeline") {
this._sortByTimeline();
return;
}
var sortingFunction = this._sortingFunctions[columnIdentifier];
if (!sortingFunction)
return;

this._dataGrid.sortNodes(sortingFunction, this._dataGrid.sortOrder === "descending");
this._timelineSortSelector.selectedIndex = 0;
this._updateOffscreenRows();

this.searchCanceled();
},

_sortByTimeline: function()
{
this._removeAllNodeHighlights();
var selectedIndex = this._timelineSortSelector.selectedIndex;
if (!selectedIndex)
selectedIndex = 1; 
var selectedOption = this._timelineSortSelector[selectedIndex];
var value = selectedOption.value;

var sortingFunction = this._sortingFunctions[value];
this._dataGrid.sortNodes(sortingFunction);
this.calculator = this._calculators[value];
if (this.calculator.startAtZero)
this._timelineGrid.hideEventDividers();
else
this._timelineGrid.showEventDividers();
this._dataGrid.markColumnAsSortedBy("timeline", "ascending");
this._updateOffscreenRows();
},

_createStatusBarItems: function()
{
var filterBarElement = document.createElement("div");
filterBarElement.className = "scope-bar status-bar-item";


function createFilterElement(typeName, label)
{
var categoryElement = document.createElement("li");
categoryElement.typeName = typeName;
categoryElement.className = typeName;
categoryElement.appendChild(document.createTextNode(label));
categoryElement.addEventListener("click", this._updateFilter.bind(this), false);
filterBarElement.appendChild(categoryElement);

return categoryElement;
}

this._filterAllElement = createFilterElement.call(this, "all", WebInspector.UIString("All"));


var dividerElement = document.createElement("div");
dividerElement.addStyleClass("scope-bar-divider");
filterBarElement.appendChild(dividerElement);

for (var typeId in WebInspector.resourceTypes) {
var type = WebInspector.resourceTypes[typeId];
createFilterElement.call(this, type.name(), type.categoryTitle());
}
this._filterBarElement = filterBarElement;
this._progressBarContainer = document.createElement("div");
this._progressBarContainer.className = "status-bar-item";
},

_createSummaryBar: function()
{
var tbody = this._dataGrid.dataTableBody;
var tfoot = document.createElement("tfoot");
var tr = tfoot.createChild("tr", "revealed network-summary-bar");
var td = tr.createChild("td");
td.setAttribute("colspan", 7);
tbody.parentNode.insertBefore(tfoot, tbody);
this._summaryBarElement = td;
},

_updateSummaryBar: function()
{
var requestsNumber = this._requests.length;

if (!requestsNumber) {
if (this._summaryBarElement._isDisplayingWarning)
return;
this._summaryBarElement._isDisplayingWarning = true;

var img = document.createElement("img");
img.src = "Images/warningIcon.png";
this._summaryBarElement.removeChildren();
this._summaryBarElement.appendChild(img);
this._summaryBarElement.appendChild(document.createTextNode(
WebInspector.UIString("No requests captured. Reload the page to see detailed information on the network activity.")));
return;
}
delete this._summaryBarElement._isDisplayingWarning;

var transferSize = 0;
var selectedRequestsNumber = 0;
var selectedTransferSize = 0;
var baseTime = -1;
var maxTime = -1;
for (var i = 0; i < this._requests.length; ++i) {
var request = this._requests[i];
var requestTransferSize = (request.cached || !request.transferSize) ? 0 : request.transferSize;
transferSize += requestTransferSize;
if ((!this._hiddenCategories.all || !this._hiddenCategories[request.type.name()]) && !this._filteredOutRequests.get(request)) {
selectedRequestsNumber++;
selectedTransferSize += requestTransferSize;
}
if (request.url === WebInspector.inspectedPageURL)
baseTime = request.startTime;
if (request.endTime > maxTime)
maxTime = request.endTime;
}
var text = "";
if (selectedRequestsNumber !== requestsNumber) {
text += String.sprintf(WebInspector.UIString("%d / %d requests"), selectedRequestsNumber, requestsNumber);
text += "  \u2758  " + String.sprintf(WebInspector.UIString("%s / %s transferred"), Number.bytesToString(selectedTransferSize), Number.bytesToString(transferSize));
} else {
text += String.sprintf(WebInspector.UIString("%d requests"), requestsNumber);
text += "  \u2758  " + String.sprintf(WebInspector.UIString("%s transferred"), Number.bytesToString(transferSize));
}
if (baseTime !== -1 && this._mainRequestLoadTime !== -1 && this._mainRequestDOMContentTime !== -1 && this._mainRequestDOMContentTime > baseTime) {
text += "  \u2758  " + String.sprintf(WebInspector.UIString("%s (onload: %s, DOMContentLoaded: %s)"),
Number.secondsToString(maxTime - baseTime),
Number.secondsToString(this._mainRequestLoadTime - baseTime),
Number.secondsToString(this._mainRequestDOMContentTime - baseTime));
}
this._summaryBarElement.textContent = text;
},

_showCategory: function(typeName)
{
this._dataGrid.element.addStyleClass("filter-" + typeName);
delete this._hiddenCategories[typeName];
},

_hideCategory: function(typeName)
{
this._dataGrid.element.removeStyleClass("filter-" + typeName);
this._hiddenCategories[typeName] = true;
},

_updateFilter: function(e)
{
this._removeAllNodeHighlights();
var isMac = WebInspector.isMac();
var selectMultiple = false;
if (isMac && e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey)
selectMultiple = true;
if (!isMac && e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey)
selectMultiple = true;

this._filter(e.target, selectMultiple);
this.searchCanceled();
this._updateSummaryBar();
},

_filter: function(target, selectMultiple)
{
function unselectAll()
{
for (var i = 0; i < this._filterBarElement.childNodes.length; ++i) {
var child = this._filterBarElement.childNodes[i];
if (!child.typeName)
continue;

child.removeStyleClass("selected");
this._hideCategory(child.typeName);
}
}

if (target === this._filterAllElement) {
if (target.hasStyleClass("selected")) {

return;
}


unselectAll.call(this);
} else {

if (this._filterAllElement.hasStyleClass("selected")) {
this._filterAllElement.removeStyleClass("selected");
this._hideCategory("all");
}
}

if (!selectMultiple) {


unselectAll.call(this);

target.addStyleClass("selected");
this._showCategory(target.typeName);
this._updateOffscreenRows();
return;
}

if (target.hasStyleClass("selected")) {


target.removeStyleClass("selected");
this._hideCategory(target.typeName);
} else {


target.addStyleClass("selected");
this._showCategory(target.typeName);
}
this._updateOffscreenRows();
},

_defaultRefreshDelay: 500,

_scheduleRefresh: function()
{
if (this._needsRefresh)
return;

this._needsRefresh = true;

if (this.isShowing() && !this._refreshTimeout)
this._refreshTimeout = setTimeout(this.refresh.bind(this), this._defaultRefreshDelay);
},

_updateDividersIfNeeded: function()
{
if (!this._dataGrid)
return;
var timelineColumn = this._dataGrid.columns.timeline;
for (var i = 0; i < this._dataGrid.resizers.length; ++i) {
if (timelineColumn.ordinal === this._dataGrid.resizers[i].rightNeighboringColumnID) {

this._timelineGrid.element.style.left = this._dataGrid.resizers[i].style.left;
this._timelineGrid.element.style.right = "18px";
}
}

var proceed = true;
if (!this.isShowing()) {
this._scheduleRefresh();
proceed = false;
} else {
this.calculator.setDisplayWindow(this._timelineGrid.element.clientWidth);
proceed = this._timelineGrid.updateDividers(this.calculator);
}
if (!proceed)
return;

if (this.calculator.startAtZero || !this.calculator.computePercentageFromEventTime) {






return;
}

this._timelineGrid.removeEventDividers();
if (this._mainRequestLoadTime !== -1) {
var percent = this.calculator.computePercentageFromEventTime(this._mainRequestLoadTime);

var loadDivider = document.createElement("div");
loadDivider.className = "network-event-divider network-red-divider";

var loadDividerPadding = document.createElement("div");
loadDividerPadding.className = "network-event-divider-padding";
loadDividerPadding.title = WebInspector.UIString("Load event fired");
loadDividerPadding.appendChild(loadDivider);
loadDividerPadding.style.left = percent + "%";
this._timelineGrid.addEventDivider(loadDividerPadding);
}

if (this._mainRequestDOMContentTime !== -1) {
var percent = this.calculator.computePercentageFromEventTime(this._mainRequestDOMContentTime);

var domContentDivider = document.createElement("div");
domContentDivider.className = "network-event-divider network-blue-divider";

var domContentDividerPadding = document.createElement("div");
domContentDividerPadding.className = "network-event-divider-padding";
domContentDividerPadding.title = WebInspector.UIString("DOMContent event fired");
domContentDividerPadding.appendChild(domContentDivider);
domContentDividerPadding.style.left = percent + "%";
this._timelineGrid.addEventDivider(domContentDividerPadding);
}
},

_refreshIfNeeded: function()
{
if (this._needsRefresh)
this.refresh();
},

_invalidateAllItems: function()
{
for (var i = 0; i < this._requests.length; ++i) {
var request = this._requests[i];
this._staleRequests[request.requestId] = request;
}
},

get calculator()
{
return this._calculator;
},

set calculator(x)
{
if (!x || this._calculator === x)
return;

this._calculator = x;
this._calculator.reset();

this._invalidateAllItems();
this.refresh();
},

_requestGridNode: function(request)
{
return this._requestGridNodes[request.__gridNodeId];
},

_createRequestGridNode: function(request)
{
var node = new WebInspector.NetworkDataGridNode(this, request);
request.__gridNodeId = this._lastRequestGridNodeId++;
this._requestGridNodes[request.__gridNodeId] = node;
return node;
},

_createStatusbarButtons: function()
{
this._preserveLogToggle = new WebInspector.StatusBarButton(WebInspector.UIString("Preserve Log upon Navigation"), "record-profile-status-bar-item");
this._preserveLogToggle.addEventListener("click", this._onPreserveLogClicked, this);

this._clearButton = new WebInspector.StatusBarButton(WebInspector.UIString("Clear"), "clear-status-bar-item");
this._clearButton.addEventListener("click", this._reset, this);

this._largerRequestsButton = new WebInspector.StatusBarButton(WebInspector.UIString("Use small resource rows."), "network-larger-resources-status-bar-item");
this._largerRequestsButton.toggled = WebInspector.settings.resourcesLargeRows.get();
this._largerRequestsButton.addEventListener("click", this._toggleLargerRequests, this);
},

_onLoadEventFired: function(event)
{
this._mainRequestLoadTime = event.data || -1;

this._scheduleRefresh();
},

_domContentLoadedEventFired: function(event)
{
this._mainRequestDOMContentTime = event.data || -1;

this._scheduleRefresh();
},

wasShown: function()
{
this._refreshIfNeeded();
},

willHide: function()
{
this._popoverHelper.hidePopover();
},

refresh: function()
{
this._needsRefresh = false;
if (this._refreshTimeout) {
clearTimeout(this._refreshTimeout);
delete this._refreshTimeout;
}

this._removeAllNodeHighlights();
var wasScrolledToLastRow = this._dataGrid.isScrolledToLastRow();
var boundariesChanged = false;
if (this.calculator.updateBoundariesForEventTime) {
boundariesChanged = this.calculator.updateBoundariesForEventTime(this._mainRequestLoadTime) || boundariesChanged;
boundariesChanged = this.calculator.updateBoundariesForEventTime(this._mainRequestDOMContentTime) || boundariesChanged;
}

for (var requestId in this._staleRequests) {
var request = this._staleRequests[requestId];
var node = this._requestGridNode(request);
if (!node) {

node = this._createRequestGridNode(request);
this._dataGrid.rootNode().appendChild(node);
}
node.refreshRequest();

if (this.calculator.updateBoundaries(request))
boundariesChanged = true;

if (!node.isFilteredOut())
this._updateHighlightIfMatched(request);
}

if (boundariesChanged) {

this._invalidateAllItems();
}

for (var requestId in this._staleRequests)
this._requestGridNode(this._staleRequests[requestId]).refreshGraph(this.calculator);

this._staleRequests = {};
this._sortItems();
this._updateSummaryBar();
this._dataGrid.updateWidths();

if (wasScrolledToLastRow)
this._dataGrid.scrollToLastRow();
},

_onPreserveLogClicked: function(e)
{
this._preserveLogToggle.toggled = !this._preserveLogToggle.toggled;
},

_reset: function()
{
this.dispatchEventToListeners(WebInspector.NetworkLogView.EventTypes.ViewCleared);

this._clearSearchMatchedList();
if (this._popoverHelper)
this._popoverHelper.hidePopover();

if (this._calculator)
this._calculator.reset();

this._requests = [];
this._requestsById = {};
this._requestsByURL = {};
this._staleRequests = {};
this._requestGridNodes = {};

if (this._dataGrid) {
this._dataGrid.rootNode().removeChildren();
this._updateDividersIfNeeded();
this._updateSummaryBar();
}

this._mainRequestLoadTime = -1;
this._mainRequestDOMContentTime = -1;
this._linkifier.reset();
},

get requests()
{
return this._requests;
},

requestById: function(id)
{
return this._requestsById[id];
},

_onRequestStarted: function(event)
{
this._appendRequest(event.data);
},

_appendRequest: function(request)
{
this._requests.push(request);



if (this._requestsById[request.requestId]) {
var oldRequest = request.redirects[request.redirects.length - 1];
this._requestsById[oldRequest.requestId] = oldRequest;

this._updateSearchMatchedListAfterRequestIdChanged(request.requestId, oldRequest.requestId);
}
this._requestsById[request.requestId] = request;

this._requestsByURL[request.url] = request;


if (request.redirects) {
for (var i = 0; i < request.redirects.length; ++i)
this._refreshRequest(request.redirects[i]);
}

this._refreshRequest(request);
},


_onRequestUpdated: function(event)
{
var request =   (event.data);
this._refreshRequest(request);
},


_refreshRequest: function(request)
{
this._staleRequests[request.requestId] = request;
this._scheduleRefresh();
},

clear: function()
{
if (this._preserveLogToggle.toggled)
return;
this._reset();
},

_mainFrameNavigated: function(event)
{
if (this._preserveLogToggle.toggled)
return;

var frame =   (event.data);
var loaderId = frame.loaderId;


var requestsToPreserve = [];
for (var i = 0; i < this._requests.length; ++i) {
var request = this._requests[i];
if (request.loaderId === loaderId)
requestsToPreserve.push(request);
}

this._reset();


for (var i = 0; i < requestsToPreserve.length; ++i)
this._appendRequest(requestsToPreserve[i]);
},

switchToDetailedView: function()
{
if (!this._dataGrid)
return;
if (this._dataGrid.selectedNode)
this._dataGrid.selectedNode.selected = false;

this.element.removeStyleClass("brief-mode");

this._dataGrid.showColumn("method");
this._dataGrid.showColumn("status");
this._dataGrid.showColumn("type");
this._dataGrid.showColumn("initiator");
this._dataGrid.showColumn("size");
this._dataGrid.showColumn("time");
this._dataGrid.showColumn("timeline");

var widths = {};
widths.name = 20;
widths.method = 6;
widths.status = 6;
widths.type = 6;
widths.initiator = 10;
widths.size = 6;
widths.time = 6;
widths.timeline = 40;

this._dataGrid.applyColumnWidthsMap(widths);
},

switchToBriefView: function()
{
this.element.addStyleClass("brief-mode");
this._removeAllNodeHighlights();

this._dataGrid.hideColumn("method");
this._dataGrid.hideColumn("status");
this._dataGrid.hideColumn("type");
this._dataGrid.hideColumn("initiator");
this._dataGrid.hideColumn("size");
this._dataGrid.hideColumn("time");
this._dataGrid.hideColumn("timeline");

var widths = {};
widths.name = 100;
this._dataGrid.applyColumnWidthsMap(widths);

this._popoverHelper.hidePopover();
},

_toggleLargerRequests: function()
{
WebInspector.settings.resourcesLargeRows.set(!WebInspector.settings.resourcesLargeRows.get());
this._setLargerRequests(WebInspector.settings.resourcesLargeRows.get());
},

_setLargerRequests: function(enabled)
{
this._largerRequestsButton.toggled = enabled;
if (!enabled) {
this._largerRequestsButton.title = WebInspector.UIString("Use large resource rows.");
this._dataGrid.element.addStyleClass("small");
this._timelineGrid.element.addStyleClass("small");
} else {
this._largerRequestsButton.title = WebInspector.UIString("Use small resource rows.");
this._dataGrid.element.removeStyleClass("small");
this._timelineGrid.element.removeStyleClass("small");
}
this.dispatchEventToListeners(WebInspector.NetworkLogView.EventTypes.RowSizeChanged, { largeRows: enabled });
this._updateOffscreenRows();
},

_getPopoverAnchor: function(element)
{
if (!this._allowPopover)
return;
var anchor = element.enclosingNodeOrSelfWithClass("network-graph-bar") || element.enclosingNodeOrSelfWithClass("network-graph-label");
if (!anchor)
return null;
var request = anchor.parentElement.request;
return request && request.timing ? anchor : null;
},


_showPopover: function(anchor, popover)
{
var request = anchor.parentElement.request;
var tableElement = WebInspector.RequestTimingView.createTimingTable(request);
popover.show(tableElement, anchor);
},

_contextMenu: function(event)
{
var contextMenu = new WebInspector.ContextMenu(event);
var gridNode = this._dataGrid.dataGridNodeFromNode(event.target);
var request = gridNode && gridNode._request;

if (request) {
contextMenu.appendItem(WebInspector.openLinkExternallyLabel(), WebInspector.openResource.bind(WebInspector, request.url, false));
contextMenu.appendSeparator();
contextMenu.appendItem(WebInspector.copyLinkAddressLabel(), this._copyLocation.bind(this, request));
if (request.requestHeadersText)
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Copy request headers" : "Copy Request Headers"), this._copyRequestHeaders.bind(this, request));
if (request.responseHeadersText)
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Copy response headers" : "Copy Response Headers"), this._copyResponseHeaders.bind(this, request));
}
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Copy all as HAR" : "Copy All as HAR"), this._copyAll.bind(this));

if (InspectorFrontendHost.canSave()) {
contextMenu.appendSeparator();
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Save as HAR with content" : "Save as HAR with Content"), this._exportAll.bind(this));
}

if (this._canClearBrowserCache || this._canClearBrowserCookies)
contextMenu.appendSeparator();
if (this._canClearBrowserCache)
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Clear browser cache" : "Clear Browser Cache"), this._clearBrowserCache.bind(this));
if (this._canClearBrowserCookies)
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Clear browser cookies" : "Clear Browser Cookies"), this._clearBrowserCookies.bind(this));


if (request && request.type === WebInspector.resourceTypes.XHR) {
contextMenu.appendSeparator();
contextMenu.appendItem(WebInspector.UIString("Replay XHR"), this._replayXHR.bind(this, request.requestId));
contextMenu.appendSeparator();
}

contextMenu.show();
},

_replayXHR: function(requestId)
{
NetworkAgent.replayXHR(requestId);
},


_copyAll: function()
{
var harArchive = {
log: (new WebInspector.HARLog(this._requests)).build()
};
InspectorFrontendHost.copyText(JSON.stringify(harArchive, null, 2));
},

_copyLocation: function(request)
{
InspectorFrontendHost.copyText(request.url);
},

_copyRequestHeaders: function(request)
{
InspectorFrontendHost.copyText(request.requestHeadersText);
},

_copyResponseHeaders: function(request)
{
InspectorFrontendHost.copyText(request.responseHeadersText);
},

_exportAll: function()
{
var filename = WebInspector.inspectedPageDomain + ".har";
var stream = new WebInspector.FileOutputStream();
stream.open(filename, openCallback.bind(this));
function openCallback()
{
var progressIndicator = new WebInspector.ProgressIndicator();
this._progressBarContainer.appendChild(progressIndicator.element);
var harWriter = new WebInspector.HARWriter();
harWriter.write(stream, this._requests, progressIndicator);
}
},

_clearBrowserCache: function(event)
{
if (confirm(WebInspector.UIString("Are you sure you want to clear browser cache?")))
NetworkAgent.clearBrowserCache();
},

_clearBrowserCookies: function(event)
{
if (confirm(WebInspector.UIString("Are you sure you want to clear browser cookies?")))
NetworkAgent.clearBrowserCookies();
},

_updateOffscreenRows: function()
{
var dataTableBody = this._dataGrid.dataTableBody;
var rows = dataTableBody.children;
var recordsCount = rows.length;
if (recordsCount < 2)
return;  

var visibleTop = this._dataGrid.scrollContainer.scrollTop;
var visibleBottom = visibleTop + this._dataGrid.scrollContainer.offsetHeight;

var rowHeight = 0;


var unfilteredRowIndex = 0;
for (var i = 0; i < recordsCount - 1; ++i) {
var row = rows[i];

var dataGridNode = this._dataGrid.dataGridNodeFromNode(row);
if (dataGridNode.isFilteredOut()) {
row.removeStyleClass("offscreen");
continue;
}

if (!rowHeight)
rowHeight = row.offsetHeight;

var rowIsVisible = unfilteredRowIndex * rowHeight < visibleBottom && (unfilteredRowIndex + 1) * rowHeight > visibleTop;
if (rowIsVisible !== row.rowIsVisible) {
if (rowIsVisible)
row.removeStyleClass("offscreen");
else
row.addStyleClass("offscreen");
row.rowIsVisible = rowIsVisible;
}
unfilteredRowIndex++;
}
},

_matchRequest: function(request)
{
if (!this._searchRegExp)
return -1;

if (!request.name().match(this._searchRegExp) && !request.path().match(this._searchRegExp))
return -1;

if (request.requestId in this._matchedRequestsMap)
return this._matchedRequestsMap[request.requestId];

var matchedRequestIndex = this._matchedRequests.length;
this._matchedRequestsMap[request.requestId] = matchedRequestIndex;
this._matchedRequests.push(request.requestId);

return matchedRequestIndex;
},

_clearSearchMatchedList: function()
{
delete this._searchRegExp;
this._matchedRequests = [];
this._matchedRequestsMap = {};
this._removeAllHighlights();
},

_updateSearchMatchedListAfterRequestIdChanged: function(oldRequestId, newRequestId)
{
var requestIndex = this._matchedRequestsMap[oldRequestId];
if (requestIndex) {
delete this._matchedRequestsMap[oldRequestId];
this._matchedRequestsMap[newRequestId] = requestIndex;
this._matchedRequests[requestIndex] = newRequestId;
}
},

_updateHighlightIfMatched: function(request)
{
var matchedRequestIndex = this._matchRequest(request);
if (matchedRequestIndex === -1)
return;

this.dispatchEventToListeners(WebInspector.NetworkLogView.EventTypes.SearchCountUpdated, this._matchedRequests.length);

if (this._currentMatchedRequestIndex !== -1 && this._currentMatchedRequestIndex !== matchedRequestIndex)
return;

this._highlightNthMatchedRequestForSearch(matchedRequestIndex, false);
},

_removeAllHighlights: function()
{
if (this._highlightedSubstringChanges) {
for (var i = 0; i < this._highlightedSubstringChanges.length; ++i)
WebInspector.revertDomChanges(this._highlightedSubstringChanges[i]);
this._highlightedSubstringChanges = null;
}
},


_highlightMatchedRequests: function(requests, reveal, regExp)
{
this._highlightedSubstringChanges = [];
for (var i = 0; i < requests.length; ++i) {
var request = requests[i];
var node = this._requestGridNode(request);
if (node) {
var nameMatched = request.name().match(regExp);
var pathMatched = request.path().match(regExp);
if (!nameMatched && pathMatched && !this._largerRequestsButton.toggled)
this._toggleLargerRequests();
var highlightedSubstringChanges = node._highlightMatchedSubstring(regExp);
this._highlightedSubstringChanges.push(highlightedSubstringChanges);
if (reveal)
node.reveal();
}
}
},


_highlightNthMatchedRequestForSearch: function(matchedRequestIndex, reveal)
{
var request = this.requestById(this._matchedRequests[matchedRequestIndex]);
if (!request)
return;
this._removeAllHighlights();
this._highlightMatchedRequests([request], reveal, this._searchRegExp);
var node = this._requestGridNode(request);
if (node)
this._currentMatchedRequestIndex = matchedRequestIndex;

this.dispatchEventToListeners(WebInspector.NetworkLogView.EventTypes.SearchIndexUpdated, this._currentMatchedRequestIndex);
},

performSearch: function(searchQuery)
{
var newMatchedRequestIndex = 0;
var currentMatchedRequestId;
if (this._currentMatchedRequestIndex !== -1)
currentMatchedRequestId = this._matchedRequests[this._currentMatchedRequestIndex];

this._clearSearchMatchedList();
this._searchRegExp = createPlainTextSearchRegex(searchQuery, "i");

var childNodes = this._dataGrid.dataTableBody.childNodes;
var requestNodes = Array.prototype.slice.call(childNodes, 0, childNodes.length - 1); 

for (var i = 0; i < requestNodes.length; ++i) {
var dataGridNode = this._dataGrid.dataGridNodeFromNode(requestNodes[i]);
if (dataGridNode.isFilteredOut())
continue;
if (this._matchRequest(dataGridNode._request) !== -1 && dataGridNode._request.requestId === currentMatchedRequestId)
newMatchedRequestIndex = this._matchedRequests.length - 1;
}

this.dispatchEventToListeners(WebInspector.NetworkLogView.EventTypes.SearchCountUpdated, this._matchedRequests.length);
this._highlightNthMatchedRequestForSearch(newMatchedRequestIndex, false);
},


performFilter: function(query)
{
this._filteredOutRequests.clear();
var filterRegExp = createPlainTextSearchRegex(query, "i");
var shownRequests = [];
for (var i = 0; i < this._dataGrid.rootNode().children.length; ++i) {
var node = this._dataGrid.rootNode().children[i];
node.element.removeStyleClass("filtered-out");
var nameMatched = node._request.name().match(filterRegExp);
var pathMatched = node._request.path().match(filterRegExp);
if (!nameMatched && !pathMatched) {
node.element.addStyleClass("filtered-out");
this._filteredOutRequests.put(this._requests[i], true);
} else 
shownRequests.push(node._request);
}
this._removeAllHighlights();
if (query)
this._highlightMatchedRequests(shownRequests, false, filterRegExp);
this._updateSummaryBar();
this._updateOffscreenRows();
},

jumpToPreviousSearchResult: function()
{
if (!this._matchedRequests.length)
return;
this._highlightNthMatchedRequestForSearch((this._currentMatchedRequestIndex + this._matchedRequests.length - 1) % this._matchedRequests.length, true);
},

jumpToNextSearchResult: function()
{
if (!this._matchedRequests.length)
return;
this._highlightNthMatchedRequestForSearch((this._currentMatchedRequestIndex + 1) % this._matchedRequests.length, true);
},

searchCanceled: function()
{
this._clearSearchMatchedList();
this.dispatchEventToListeners(WebInspector.NetworkLogView.EventTypes.SearchCountUpdated, 0);
},

revealAndHighlightRequest: function(request)
{
this._removeAllNodeHighlights();

var node = this._requestGridNode(request);
if (node) {
this._dataGrid.element.focus();
node.reveal();
this._highlightNode(node);
}
},

_removeAllNodeHighlights: function()
{
if (this._highlightedNode) {
this._highlightedNode.element.removeStyleClass("highlighted-row");
delete this._highlightedNode;
}
},

_highlightNode: function(node)
{
node.element.addStyleClass("highlighted-row");
this._highlightedNode = node;
},

__proto__: WebInspector.View.prototype
}


WebInspector.NetworkLogView.EventTypes = {
ViewCleared: "ViewCleared",
RowSizeChanged: "RowSizeChanged",
RequestSelected: "RequestSelected",
SearchCountUpdated: "SearchCountUpdated",
SearchIndexUpdated: "SearchIndexUpdated"
};


WebInspector.NetworkPanel = function()
{
WebInspector.Panel.call(this, "network");
this.registerRequiredCSS("networkPanel.css");

this.createSidebarView();
this.splitView.hideMainElement();

this._networkLogView = new WebInspector.NetworkLogView();
this._networkLogView.show(this.sidebarElement);

this._viewsContainerElement = this.splitView.mainElement;
this._viewsContainerElement.id = "network-views";
this._viewsContainerElement.addStyleClass("hidden");
if (!this._networkLogView.useLargeRows)
this._viewsContainerElement.addStyleClass("small");

this._networkLogView.addEventListener(WebInspector.NetworkLogView.EventTypes.ViewCleared, this._onViewCleared, this);
this._networkLogView.addEventListener(WebInspector.NetworkLogView.EventTypes.RowSizeChanged, this._onRowSizeChanged, this);
this._networkLogView.addEventListener(WebInspector.NetworkLogView.EventTypes.RequestSelected, this._onRequestSelected, this);
this._networkLogView.addEventListener(WebInspector.NetworkLogView.EventTypes.SearchCountUpdated, this._onSearchCountUpdated, this);
this._networkLogView.addEventListener(WebInspector.NetworkLogView.EventTypes.SearchIndexUpdated, this._onSearchIndexUpdated, this);

this._closeButtonElement = document.createElement("button");
this._closeButtonElement.id = "network-close-button";
this._closeButtonElement.addEventListener("click", this._toggleGridMode.bind(this), false);
this._viewsContainerElement.appendChild(this._closeButtonElement);

function viewGetter()
{
return this.visibleView;
}
WebInspector.GoToLineDialog.install(this, viewGetter.bind(this));
}

WebInspector.NetworkPanel.prototype = {
get statusBarItems()
{
return this._networkLogView.statusBarItems;
},

elementsToRestoreScrollPositionsFor: function()
{
return this._networkLogView.elementsToRestoreScrollPositionsFor();
},


_reset: function()
{
this._networkLogView._reset();
},

handleShortcut: function(event)
{
if (this._viewingRequestMode && event.keyCode === WebInspector.KeyboardShortcut.Keys.Esc.code) {
this._toggleGridMode();
event.handled = true;
return;
}

WebInspector.Panel.prototype.handleShortcut.call(this, event);
},

wasShown: function()
{
WebInspector.Panel.prototype.wasShown.call(this);
},

get requests()
{
return this._networkLogView.requests;
},

requestById: function(id)
{
return this._networkLogView.requestById(id);
},

_requestByAnchor: function(anchor)
{
return anchor.requestId ? this.requestById(anchor.requestId) : this._networkLogView._requestsByURL[anchor.href];
},

canShowAnchorLocation: function(anchor)
{
return !!this._requestByAnchor(anchor);
},

showAnchorLocation: function(anchor)
{
var request = this._requestByAnchor(anchor);
this.revealAndHighlightRequest(request)
},

revealAndHighlightRequest: function(request)
{
this._toggleGridMode();
if (request)
this._networkLogView.revealAndHighlightRequest(request);
},

_onViewCleared: function(event)
{
this._closeVisibleRequest();
this._toggleGridMode();
this._viewsContainerElement.removeChildren();
this._viewsContainerElement.appendChild(this._closeButtonElement);
},

_onRowSizeChanged: function(event)
{
if (event.data.largeRows)
this._viewsContainerElement.removeStyleClass("small");
else
this._viewsContainerElement.addStyleClass("small");
},

_onSearchCountUpdated: function(event)
{
WebInspector.searchController.updateSearchMatchesCount(event.data, this);
},

_onSearchIndexUpdated: function(event)
{
WebInspector.searchController.updateCurrentMatchIndex(event.data, this);
},

_onRequestSelected: function(event)
{
this._showRequest(event.data);
},

_showRequest: function(request)
{
if (!request)
return;

this._toggleViewingRequestMode();

if (this.visibleView) {
this.visibleView.detach();
delete this.visibleView;
}

var view = new WebInspector.NetworkItemView(request);
view.show(this._viewsContainerElement);
this.visibleView = view;
},

_closeVisibleRequest: function()
{
this.element.removeStyleClass("viewing-resource");

if (this.visibleView) {
this.visibleView.detach();
delete this.visibleView;
}
},

_toggleGridMode: function()
{
if (this._viewingRequestMode) {
this._viewingRequestMode = false;
this.element.removeStyleClass("viewing-resource");
this.splitView.hideMainElement();
}

this._networkLogView.switchToDetailedView();
this._networkLogView.allowPopover = true;
this._networkLogView._allowRequestSelection = false;
},

_toggleViewingRequestMode: function()
{
if (this._viewingRequestMode)
return;
this._viewingRequestMode = true;

this.element.addStyleClass("viewing-resource");
this.splitView.showMainElement();
this._networkLogView.allowPopover = false;
this._networkLogView._allowRequestSelection = true;
this._networkLogView.switchToBriefView();
},


performSearch: function(searchQuery)
{
this._networkLogView.performSearch(searchQuery);
},


canFilter: function()
{
return true;
},


performFilter: function(query)
{
this._networkLogView.performFilter(query);
},

jumpToPreviousSearchResult: function()
{
this._networkLogView.jumpToPreviousSearchResult();
},

jumpToNextSearchResult: function()
{
this._networkLogView.jumpToNextSearchResult();
},

searchCanceled: function()
{
this._networkLogView.searchCanceled();
},


appendApplicableItems: function(event, contextMenu, target)
{
if (!(target instanceof WebInspector.NetworkRequest))
return;
if (this.visibleView && this.visibleView.isShowing() && this.visibleView.request() === target)
return;

function reveal()
{
WebInspector.inspectorView.setCurrentPanel(this);
this.revealAndHighlightRequest(  (target));
}
contextMenu.appendItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Reveal in network panel" : "Reveal in Network Panel"), reveal.bind(this));
},

__proto__: WebInspector.Panel.prototype
}


WebInspector.NetworkBaseCalculator = function()
{
}

WebInspector.NetworkBaseCalculator.prototype = {
computePosition: function(time)
{
return (time - this._minimumBoundary) / this.boundarySpan() * this._workingArea;
},

computeBarGraphPercentages: function(item)
{
return {start: 0, middle: 0, end: (this._value(item) / this.boundarySpan()) * 100};
},

computeBarGraphLabels: function(item)
{
const label = this.formatTime(this._value(item));
return {left: label, right: label, tooltip: label};
},

boundarySpan: function()
{
return this._maximumBoundary - this._minimumBoundary;
},

updateBoundaries: function(item)
{
this._minimumBoundary = 0;

var value = this._value(item);
if (typeof this._maximumBoundary === "undefined" || value > this._maximumBoundary) {
this._maximumBoundary = value;
return true;
}
return false;
},

reset: function()
{
delete this._minimumBoundary;
delete this._maximumBoundary;
},

maximumBoundary: function()
{
return this._maximumBoundary;
},

minimumBoundary: function()
{
return this._minimumBoundary;
},

_value: function(item)
{
return 0;
},

formatTime: function(value)
{
return value.toString();
},

setDisplayWindow: function(clientWidth)
{
this._workingArea = clientWidth;
this.paddingLeft = 0;
}
}


WebInspector.NetworkTimeCalculator = function(startAtZero)
{
WebInspector.NetworkBaseCalculator.call(this);
this.startAtZero = startAtZero;
}

WebInspector.NetworkTimeCalculator.prototype = {
computeBarGraphPercentages: function(request)
{
if (request.startTime !== -1)
var start = ((request.startTime - this._minimumBoundary) / this.boundarySpan()) * 100;
else
var start = 0;

if (request.responseReceivedTime !== -1)
var middle = ((request.responseReceivedTime - this._minimumBoundary) / this.boundarySpan()) * 100;
else
var middle = (this.startAtZero ? start : 100);

if (request.endTime !== -1)
var end = ((request.endTime - this._minimumBoundary) / this.boundarySpan()) * 100;
else
var end = (this.startAtZero ? middle : 100);

if (this.startAtZero) {
end -= start;
middle -= start;
start = 0;
}

return {start: start, middle: middle, end: end};
},

computePercentageFromEventTime: function(eventTime)
{



if (eventTime !== -1 && !this.startAtZero)
return ((eventTime - this._minimumBoundary) / this.boundarySpan()) * 100;

return 0;
},

updateBoundariesForEventTime: function(eventTime)
{
if (eventTime === -1 || this.startAtZero)
return false;

if (typeof this._maximumBoundary === "undefined" || eventTime > this._maximumBoundary) {
this._maximumBoundary = eventTime;
return true;
}
return false;
},

computeBarGraphLabels: function(request)
{
var rightLabel = "";
if (request.responseReceivedTime !== -1 && request.endTime !== -1)
rightLabel = this.formatTime(request.endTime - request.responseReceivedTime);

var hasLatency = request.latency > 0;
if (hasLatency)
var leftLabel = this.formatTime(request.latency);
else
var leftLabel = rightLabel;

if (request.timing)
return {left: leftLabel, right: rightLabel};

if (hasLatency && rightLabel) {
var total = this.formatTime(request.duration);
var tooltip = WebInspector.UIString("%s latency, %s download (%s total)", leftLabel, rightLabel, total);
} else if (hasLatency)
var tooltip = WebInspector.UIString("%s latency", leftLabel);
else if (rightLabel)
var tooltip = WebInspector.UIString("%s download", rightLabel);

if (request.cached)
tooltip = WebInspector.UIString("%s (from cache)", tooltip);
return {left: leftLabel, right: rightLabel, tooltip: tooltip};
},

updateBoundaries: function(request)
{
var didChange = false;

var lowerBound;
if (this.startAtZero)
lowerBound = 0;
else
lowerBound = this._lowerBound(request);

if (lowerBound !== -1 && (typeof this._minimumBoundary === "undefined" || lowerBound < this._minimumBoundary)) {
this._minimumBoundary = lowerBound;
didChange = true;
}

var upperBound = this._upperBound(request);
if (upperBound !== -1 && (typeof this._maximumBoundary === "undefined" || upperBound > this._maximumBoundary)) {
this._maximumBoundary = upperBound;
didChange = true;
}

return didChange;
},

formatTime: function(value)
{
return Number.secondsToString(value);
},

_lowerBound: function(request)
{
return 0;
},

_upperBound: function(request)
{
return 0;
},

__proto__: WebInspector.NetworkBaseCalculator.prototype
}


WebInspector.NetworkTransferTimeCalculator = function()
{
WebInspector.NetworkTimeCalculator.call(this, false);
}

WebInspector.NetworkTransferTimeCalculator.prototype = {
formatTime: function(value)
{
return Number.secondsToString(value);
},

_lowerBound: function(request)
{
return request.startTime;
},

_upperBound: function(request)
{
return request.endTime;
},

__proto__: WebInspector.NetworkTimeCalculator.prototype
}


WebInspector.NetworkTransferDurationCalculator = function()
{
WebInspector.NetworkTimeCalculator.call(this, true);
}

WebInspector.NetworkTransferDurationCalculator.prototype = {
formatTime: function(value)
{
return Number.secondsToString(value);
},

_upperBound: function(request)
{
return request.duration;
},

__proto__: WebInspector.NetworkTimeCalculator.prototype
}


WebInspector.NetworkDataGridNode = function(parentView, request)
{
WebInspector.DataGridNode.call(this, {});
this._parentView = parentView;
this._request = request;
}

WebInspector.NetworkDataGridNode.prototype = {
createCells: function()
{

this._element.addStyleClass("offscreen");
this._nameCell = this._createDivInTD("name");
this._methodCell = this._createDivInTD("method");
this._statusCell = this._createDivInTD("status");
this._typeCell = this._createDivInTD("type");
this._initiatorCell = this._createDivInTD("initiator");
this._sizeCell = this._createDivInTD("size");
this._timeCell = this._createDivInTD("time");
this._createTimelineCell();
this._nameCell.addEventListener("click", this.select.bind(this), false);
this._nameCell.addEventListener("dblclick", this._openInNewTab.bind(this), false);
},

isFilteredOut: function()
{
if (this._parentView._filteredOutRequests.get(this._request))
return true;
if (!this._parentView._hiddenCategories.all)
return false;
return this._request.type.name() in this._parentView._hiddenCategories;
},

select: function()
{
this._parentView.dispatchEventToListeners(WebInspector.NetworkLogView.EventTypes.RequestSelected, this._request);
WebInspector.DataGridNode.prototype.select.apply(this, arguments);
},

_highlightMatchedSubstring: function(regexp)
{
var domChanges = [];
var matchInfo = this._element.textContent.match(regexp);
if (matchInfo)
WebInspector.highlightSearchResult(this._nameCell, matchInfo.index, matchInfo[0].length, domChanges);
return domChanges;
},

_openInNewTab: function()
{
InspectorFrontendHost.openInNewTab(this._request.url);
},

get selectable()
{
return this._parentView._allowRequestSelection && !this.isFilteredOut();
},

_createDivInTD: function(columnIdentifier)
{
var td = document.createElement("td");
td.className = columnIdentifier + "-column";
var div = document.createElement("div");
td.appendChild(div);
this._element.appendChild(td);
return div;
},

_createTimelineCell: function()
{
this._graphElement = document.createElement("div");
this._graphElement.className = "network-graph-side";

this._barAreaElement = document.createElement("div");

this._barAreaElement.className = "network-graph-bar-area";
this._barAreaElement.request = this._request;
this._graphElement.appendChild(this._barAreaElement);

this._barLeftElement = document.createElement("div");
this._barLeftElement.className = "network-graph-bar waiting";
this._barAreaElement.appendChild(this._barLeftElement);

this._barRightElement = document.createElement("div");
this._barRightElement.className = "network-graph-bar";
this._barAreaElement.appendChild(this._barRightElement);


this._labelLeftElement = document.createElement("div");
this._labelLeftElement.className = "network-graph-label waiting";
this._barAreaElement.appendChild(this._labelLeftElement);

this._labelRightElement = document.createElement("div");
this._labelRightElement.className = "network-graph-label";
this._barAreaElement.appendChild(this._labelRightElement);

this._graphElement.addEventListener("mouseover", this._refreshLabelPositions.bind(this), false);

this._timelineCell = document.createElement("td");
this._timelineCell.className = "timeline-column";
this._element.appendChild(this._timelineCell);
this._timelineCell.appendChild(this._graphElement);
},

refreshRequest: function()
{
this._refreshNameCell();

this._methodCell.setTextAndTitle(this._request.requestMethod);

this._refreshStatusCell();
this._refreshTypeCell();
this._refreshInitiatorCell();
this._refreshSizeCell();
this._refreshTimeCell();

if (this._request.cached)
this._graphElement.addStyleClass("resource-cached");

this._element.addStyleClass("network-item");
if (!this._element.hasStyleClass("network-type-" + this._request.type.name())) {
this._element.removeMatchingStyleClasses("network-type-\\w+");
this._element.addStyleClass("network-type-" + this._request.type.name());
}
},

_refreshNameCell: function()
{
this._nameCell.removeChildren();

if (this._request.type === WebInspector.resourceTypes.Image) {
var previewImage = document.createElement("img");
previewImage.className = "image-network-icon-preview";
this._request.populateImageSource(previewImage);

var iconElement = document.createElement("div");
iconElement.className = "icon";
iconElement.appendChild(previewImage);
} else {
var iconElement = document.createElement("img");
iconElement.className = "icon";
}
this._nameCell.appendChild(iconElement);
this._nameCell.appendChild(document.createTextNode(this._request.name()));
this._appendSubtitle(this._nameCell, this._request.path());
this._nameCell.title = this._request.url;
},

_refreshStatusCell: function()
{
this._statusCell.removeChildren();

if (this._request.failed) {
var failText = this._request.canceled ? WebInspector.UIString("(canceled)") : WebInspector.UIString("(failed)");
if (this._request.localizedFailDescription) {
this._statusCell.appendChild(document.createTextNode(failText));
this._appendSubtitle(this._statusCell, this._request.localizedFailDescription);
this._statusCell.title = failText + " " + this._request.localizedFailDescription;
} else {
this._statusCell.setTextAndTitle(failText);
}
this._statusCell.addStyleClass("network-dim-cell");
this.element.addStyleClass("network-error-row");
return;
}

this._statusCell.removeStyleClass("network-dim-cell");
this.element.removeStyleClass("network-error-row");

if (this._request.statusCode) {
this._statusCell.appendChild(document.createTextNode(this._request.statusCode));
this._appendSubtitle(this._statusCell, this._request.statusText);
this._statusCell.title = this._request.statusCode + " " + this._request.statusText;
if (this._request.statusCode >= 400)
this.element.addStyleClass("network-error-row");
if (this._request.cached)
this._statusCell.addStyleClass("network-dim-cell");
} else {
if (!this._request.isHttpFamily() && this._request.finished)
this._statusCell.setTextAndTitle(WebInspector.UIString("Success"));
else if (this._request.isPingRequest())
this._statusCell.setTextAndTitle(WebInspector.UIString("(ping)"));
else
this._statusCell.setTextAndTitle(WebInspector.UIString("(pending)"));
this._statusCell.addStyleClass("network-dim-cell");
}
},

_refreshTypeCell: function()
{
if (this._request.mimeType) {
this._typeCell.removeStyleClass("network-dim-cell");
this._typeCell.setTextAndTitle(this._request.mimeType);
} else if (this._request.isPingRequest()) {
this._typeCell.removeStyleClass("network-dim-cell");
this._typeCell.setTextAndTitle(this._request.requestContentType());
} else {
this._typeCell.addStyleClass("network-dim-cell");
this._typeCell.setTextAndTitle(WebInspector.UIString("Pending"));
}
},

_refreshInitiatorCell: function()
{
var initiator = this._request.initiator;
if ((initiator && initiator.type !== "other") || this._request.redirectSource) {
this._initiatorCell.removeStyleClass("network-dim-cell");
this._initiatorCell.removeChildren();
if (this._request.redirectSource) {
var redirectSource = this._request.redirectSource;
this._initiatorCell.title = redirectSource.url;
this._initiatorCell.appendChild(WebInspector.linkifyRequestAsNode(redirectSource));
this._appendSubtitle(this._initiatorCell, WebInspector.UIString("Redirect"));
} else if (initiator.type === "script") {
var topFrame = initiator.stackTrace[0];

if (!topFrame.url) {
this._initiatorCell.addStyleClass("network-dim-cell");
this._initiatorCell.setTextAndTitle(WebInspector.UIString("Other"));
return;
}
this._initiatorCell.title = topFrame.url + ":" + topFrame.lineNumber;
var urlElement = this._parentView._linkifier.linkifyLocation(topFrame.url, topFrame.lineNumber - 1, 0);
this._initiatorCell.appendChild(urlElement);
this._appendSubtitle(this._initiatorCell, WebInspector.UIString("Script"));
} else { 
this._initiatorCell.title = initiator.url + ":" + initiator.lineNumber;
this._initiatorCell.appendChild(WebInspector.linkifyResourceAsNode(initiator.url, initiator.lineNumber - 1));
this._appendSubtitle(this._initiatorCell, WebInspector.UIString("Parser"));
}
} else {
this._initiatorCell.addStyleClass("network-dim-cell");
this._initiatorCell.setTextAndTitle(WebInspector.UIString("Other"));
}
},

_refreshSizeCell: function()
{
if (this._request.cached) {
this._sizeCell.setTextAndTitle(WebInspector.UIString("(from cache)"));
this._sizeCell.addStyleClass("network-dim-cell");
} else {
var resourceSize = typeof this._request.resourceSize === "number" ? Number.bytesToString(this._request.resourceSize) : "?";
var transferSize = typeof this._request.transferSize === "number" ? Number.bytesToString(this._request.transferSize) : "?";
this._sizeCell.setTextAndTitle(transferSize);
this._sizeCell.removeStyleClass("network-dim-cell");
this._appendSubtitle(this._sizeCell, resourceSize);
}
},

_refreshTimeCell: function()
{
if (this._request.duration > 0) {
this._timeCell.removeStyleClass("network-dim-cell");
this._timeCell.setTextAndTitle(Number.secondsToString(this._request.duration));
this._appendSubtitle(this._timeCell, Number.secondsToString(this._request.latency));
} else {
this._timeCell.addStyleClass("network-dim-cell");
this._timeCell.setTextAndTitle(WebInspector.UIString("Pending"));
}
},

_appendSubtitle: function(cellElement, subtitleText)
{
var subtitleElement = document.createElement("div");
subtitleElement.className = "network-cell-subtitle";
subtitleElement.textContent = subtitleText;
cellElement.appendChild(subtitleElement);
},

refreshGraph: function(calculator)
{
var percentages = calculator.computeBarGraphPercentages(this._request);
this._percentages = percentages;

this._barAreaElement.removeStyleClass("hidden");

if (!this._graphElement.hasStyleClass("network-type-" + this._request.type.name())) {
this._graphElement.removeMatchingStyleClasses("network-type-\\w+");
this._graphElement.addStyleClass("network-type-" + this._request.type.name());
}

this._barLeftElement.style.setProperty("left", percentages.start + "%");
this._barRightElement.style.setProperty("right", (100 - percentages.end) + "%");

this._barLeftElement.style.setProperty("right", (100 - percentages.end) + "%");
this._barRightElement.style.setProperty("left", percentages.middle + "%");

var labels = calculator.computeBarGraphLabels(this._request);
this._labelLeftElement.textContent = labels.left;
this._labelRightElement.textContent = labels.right;

var tooltip = (labels.tooltip || "");
this._barLeftElement.title = tooltip;
this._labelLeftElement.title = tooltip;
this._labelRightElement.title = tooltip;
this._barRightElement.title = tooltip;
},

_refreshLabelPositions: function()
{
if (!this._percentages)
return;
this._labelLeftElement.style.removeProperty("left");
this._labelLeftElement.style.removeProperty("right");
this._labelLeftElement.removeStyleClass("before");
this._labelLeftElement.removeStyleClass("hidden");

this._labelRightElement.style.removeProperty("left");
this._labelRightElement.style.removeProperty("right");
this._labelRightElement.removeStyleClass("after");
this._labelRightElement.removeStyleClass("hidden");

const labelPadding = 10;
const barRightElementOffsetWidth = this._barRightElement.offsetWidth;
const barLeftElementOffsetWidth = this._barLeftElement.offsetWidth;

if (this._barLeftElement) {
var leftBarWidth = barLeftElementOffsetWidth - labelPadding;
var rightBarWidth = (barRightElementOffsetWidth - barLeftElementOffsetWidth) - labelPadding;
} else {
var leftBarWidth = (barLeftElementOffsetWidth - barRightElementOffsetWidth) - labelPadding;
var rightBarWidth = barRightElementOffsetWidth - labelPadding;
}

const labelLeftElementOffsetWidth = this._labelLeftElement.offsetWidth;
const labelRightElementOffsetWidth = this._labelRightElement.offsetWidth;

const labelBefore = (labelLeftElementOffsetWidth > leftBarWidth);
const labelAfter = (labelRightElementOffsetWidth > rightBarWidth);
const graphElementOffsetWidth = this._graphElement.offsetWidth;

if (labelBefore && (graphElementOffsetWidth * (this._percentages.start / 100)) < (labelLeftElementOffsetWidth + 10))
var leftHidden = true;

if (labelAfter && (graphElementOffsetWidth * ((100 - this._percentages.end) / 100)) < (labelRightElementOffsetWidth + 10))
var rightHidden = true;

if (barLeftElementOffsetWidth == barRightElementOffsetWidth) {

if (labelBefore && !labelAfter)
leftHidden = true;
else if (labelAfter && !labelBefore)
rightHidden = true;
}

if (labelBefore) {
if (leftHidden)
this._labelLeftElement.addStyleClass("hidden");
this._labelLeftElement.style.setProperty("right", (100 - this._percentages.start) + "%");
this._labelLeftElement.addStyleClass("before");
} else {
this._labelLeftElement.style.setProperty("left", this._percentages.start + "%");
this._labelLeftElement.style.setProperty("right", (100 - this._percentages.middle) + "%");
}

if (labelAfter) {
if (rightHidden)
this._labelRightElement.addStyleClass("hidden");
this._labelRightElement.style.setProperty("left", this._percentages.end + "%");
this._labelRightElement.addStyleClass("after");
} else {
this._labelRightElement.style.setProperty("left", this._percentages.middle + "%");
this._labelRightElement.style.setProperty("right", (100 - this._percentages.end) + "%");
}
},

__proto__: WebInspector.DataGridNode.prototype
}


WebInspector.NetworkDataGridNode.NameComparator = function(a, b)
{
var aFileName = a._request.name();
var bFileName = b._request.name();
if (aFileName > bFileName)
return 1;
if (bFileName > aFileName)
return -1;
return 0;
}

WebInspector.NetworkDataGridNode.SizeComparator = function(a, b)
{
if (b._request.cached && !a._request.cached)
return 1;
if (a._request.cached && !b._request.cached)
return -1;

if (a._request.resourceSize === b._request.resourceSize)
return 0;

return a._request.resourceSize - b._request.resourceSize;
}

WebInspector.NetworkDataGridNode.InitiatorComparator = function(a, b)
{
if (!a._request.initiator || a._request.initiator.type === "Other")
return -1;
if (!b._request.initiator || b._request.initiator.type === "Other")
return 1;

if (a._request.initiator.url < b._request.initiator.url)
return -1;
if (a._request.initiator.url > b._request.initiator.url)
return 1;

return a._request.initiator.lineNumber - b._request.initiator.lineNumber;
}

WebInspector.NetworkDataGridNode.RequestPropertyComparator = function(propertyName, revert, a, b)
{
var aValue = a._request[propertyName];
var bValue = b._request[propertyName];
if (aValue > bValue)
return revert ? -1 : 1;
if (bValue > aValue)
return revert ? 1 : -1;
return 0;
}