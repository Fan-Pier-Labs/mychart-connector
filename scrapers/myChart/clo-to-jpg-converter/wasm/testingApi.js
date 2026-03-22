var TESTING = function() {
	// PostMessage declaration
	var POSTMESSAGE_INCOMING_MESSAGE_TYPE_COMMAND_REQUEST = "test-command-request";

	var POSTMESSAGE_TYPE_COMMAND_RESPONSE = "command-response";

	var POSTMESSAGE_COMMAND_UNINITIALIZED = -1;
	var POSTMESSAGE_COMMAND_SUCCESS = 0;
	var POSTMESSAGE_COMMAND_REJECTED = 1;
	var POSTMESSAGE_COMMAND_NOT_ENABLED = 2;
	var POSTMESSAGE_COMMAND_NOT_SUPPORTED = 3;
	var POSTMESSAGE_COMMAND_INVALID = 4;
	var POSTMESSAGE_COMMAND_EXEC_ERROR = 5;
	var POSTMESSAGE_COMMAND_EXCEEDED_COMMAND_THRESHOLD = 6;
	var POSTMESSAGE_COMMAND_UNKNOWN_MESSAGE_TYPE = 7;
	var POSTMESSAGE_COMMAND_VIEWER_LOCKED = 8;
	var POSTMESSAGE_COMMAND_ERROR_UNKNOWN = 9999;

	var _isPostMessageAPIEnabled = false;
	var _postMessageAllowedOrigins = [];

	var _getViewer = function () {
		if (VIEWER == null) {
			throw new Error("Viewer not found.");
		}
		
		return VIEWER.getViewer();
	};
	
	var _isMethodSupported = function (allowWhenViewerIsClosed) {
		var viewer = VIEWER.getViewer();
		if (!viewer) {
			console.error("Viewer not found.");
			return false;
		}
		if (allowWhenViewerIsClosed || !VIEWER.isViewerClosed()) {
			return true;
		} else {
			console.error('This method is not supported when viewer is closed.');
			return false;
		}
	}

	//
	// Stop Extended JavaScript API
	//

	var _postMessageVerifyOrigin = function(originToCheck, validOrigins) {
		console.log("Checking "+originToCheck+" in list "+validOrigins);
		var hasValidOrigin = false;

		if (validOrigins.length == 1) {
			if (validOrigins[0] === "*") {
				hasValidOrigin = true;
			}
		}
		if (!hasValidOrigin) {
			for (var i=0; i<validOrigins.length; i++) {
				var validOrigin = validOrigins[i];
				if (validOrigin === originToCheck) {
					hasValidOrigin = true;
					break;
				}
			}
		}

		return hasValidOrigin;
	};

	var _init = function (isPostMessageAPIEnabled, postMessageAllowedOrigins) {
		_isPostMessageAPIEnabled = isPostMessageAPIEnabled;
		_postMessageAllowedOrigins = postMessageAllowedOrigins;	

		_initPostMessageWrapper();
	};

	var _initPostMessageWrapper = function () {
		if (typeof window.addEventListener != 'undefined') { // all browsers except IE < 9
			window.addEventListener("message", _postMessageReceiveHandler, false);
		}
		else if (typeof window.attachEvent != 'undefined') { // IE < 9
			window.attachEvent("onmessage", _onMessageReceiveHandler);
		}
	};

	/*
	 * [case:10737] due to window.attachEvent handle post message is different from addEventListener,
	 * i.e. in our case, after a request sending from 'keep-alive', the response whose messageType is
	 * POSTMESSAGE_TYPE_COMMAND_RESPONSE becomes another request, so the postMessageReceiveHandler
	 * runs into infinity loop, and this method mitigates it by filtering out that message request
	 */
	var _onMessageReceiveHandler = function (event) {
		var dataStr = event.data;
		if (!dataStr || dataStr === '') return;
		try {
			var request = JSON.parse(dataStr);
			var requestDataMessageType = request.messageType;
			if (requestDataMessageType !== POSTMESSAGE_TYPE_COMMAND_RESPONSE) {
				_postMessageReceiveHandler(event);
			}
		} catch (e) {
			console.error(e);
		}
	}

	var _postMessageReceiveHandler = function (event) {
		var origin = event.origin;
		var source = event.source;
		var dataStr = event.data;

		if (!dataStr) {
			return;
		}

		if ((typeof dataStr === "object" && dataStr.type == 'IFrameWrapperMessage') || (typeof dataStr === "string" && dataStr.indexOf("test-") === -1)) {
			// this request will be handled by the IFrameWrapper class or the VIEWER api
			return;
		}

		var responseData = {};
		// Default response status
		responseData.statusCode = POSTMESSAGE_COMMAND_UNINITIALIZED;
		responseData.statusDetails = "[POSTMESSAGE_COMMAND_UNINITIALIZED] response data uninitialized";

		var request = null;		
		try {
			request = JSON.parse(dataStr);

			request.source = event.source;
			request.origin = event.origin;

			var requestDataMessageType = request.messageType;
			var requestData = request.data;

			if (!_isPostMessageAPIEnabled) {
				responseData.statusCode = POSTMESSAGE_COMMAND_NOT_ENABLED;
				responseData.statusDetails = "[POSTMESSAGE_COMMAND_NOT_ENABLED] The postMessage API is not enabled. Make sure the server has the following flag set: EnablePostMessageJavaScriptAPI=true";
			} else if (!_postMessageVerifyOrigin(origin, _postMessageAllowedOrigins)) {
				responseData.statusCode = POSTMESSAGE_COMMAND_REJECTED;
				responseData.statusDetails = "[POSTMESSAGE_COMMAND_REJECTED] Invalid origin "+origin+" valid origins="+_postMessageAllowedOrigins.join();
			} else if (requestDataMessageType !== POSTMESSAGE_INCOMING_MESSAGE_TYPE_COMMAND_REQUEST) {
				// only supporting incoming messageTypes of "test-command-request"
				responseData.statusCode = POSTMESSAGE_COMMAND_UNKNOWN_MESSAGE_TYPE;
				responseData.statusDetails = "[POSTMESSAGE_COMMAND_UNKNOWN_MESSAGE_TYPE] message-type "+requestDataMessageType+" is not supported. Only '"+POSTMESSAGE_INCOMING_MESSAGE_TYPE_COMMAND_REQUEST+"' is supported.";
			} else if (source === null || requestData === null || (typeof requestData !== 'object')) {
				responseData.statusCode = POSTMESSAGE_COMMAND_ERROR_UNKNOWN;
				responseData.statusDetails = "[POSTMESSAGE_COMMAND_ERROR_UNKNOWN] Error Unknown";	
			} else {
				// API enabled, correct message type and origins verified
				// Execute command now.
				console.log("Origin "+origin+" verified");
				responseData = _handlePostMessage(request, responseData);
			}			
		} catch (e) {
			if (!request) {
				// directly return if we get unexpected post message
				return;
			}
			
			if (e.name === NonViewerPageException.name) {
				responseData.statusCode = POSTMESSAGE_COMMAND_NOT_SUPPORTED;
				responseData.statusDetails = "The TESTING API is not supported on non viewer pages";
			} else {
				// couldn't parse the object. Object in invalid format. 
				responseData.statusCode = POSTMESSAGE_COMMAND_ERROR_UNKNOWN;
				responseData.statusDetails = "[POSTMESSAGE_COMMAND_ERROR_UNKNOWN] Parsing error. name="+e.name+" message="+e.message+". Expecting JSON.parse(event.data) to work.";
			}
			
			console.error(e);
		}
		
    function NonViewerPageException(message) {
	this.message = message;
	this.stack = Error().stack;
	}
	if (typeof Object.create != 'undefined') {
		NonViewerPageException.prototype = Object.create(Error.prototype);
	}
	NonViewerPageException.prototype.name = "NonViewerPageException";           
                  
		
		if (responseData.statusCode != POSTMESSAGE_COMMAND_UNINITIALIZED) {
			// return value back to caller
			console.log("Sending "+responseData+" to "+origin);
			if (_postMessageAllowedOrigins.length==1 && _postMessageAllowedOrigins[0] === "*") {
				// put a warning if origins have not be specified.
				responseData.statusDetails = "[WARNING] No origins have been specified. Allowing queries from all origins. Contact support for information how to configure this. "+responseData.statusDetails;
			}
			_postMessageSendResponse(request, responseData);
		}
	};

	var _handlePostMessage = function (request, responseData) {
		if (!request || !request.data || !responseData) {
			console.log("request, request.data and responseData are mandatory.");
			return responseData;
		}

		_executePostMessage(request);
		return responseData;
	};

	var _postMessageSendResponse = function (request, responseData) {
		if (!request) {
			console.log("request is mandatory.");
			return;
		}
		var requestData = {
			payload: request.payload,
			data: request.data
		}
		var response = {
			messageType: POSTMESSAGE_TYPE_COMMAND_RESPONSE,
			requestData: requestData,
			data: responseData
		};
		request.source.postMessage(JSON.stringify(response), request.origin);
	};

	var _postMessageRequestMap = {};
	var _executePostMessage = function (request) {
		if (!request || !request.data) {
			console.log("request and request.data are mandatory.");
			return;
		}

		var command = request.data.command;
		var context = request.data.context;
		var fn = '';
		try {
			fn = eval('_' + command);
		} catch (e) {
			var responseData = {};
			responseData.statusCode = POSTMESSAGE_COMMAND_INVALID;
			responseData.statusDetails = "The PostMessage API command " + command + " is invalid";
			responseData.response = false;
			_postMessageSendResponse(request, responseData);
			console.log(e);
			return;
		}
		var uid = uuidv4();
		var response = fn(context, 
			'function(response) {' +
			'	_postMessageCallbackWrapper(\'' + uid + '\', response);' +
			'}');

		if (response != null) {
			// Synchronous
			var responseData = {};
			responseData.statusCode = (response === false ? POSTMESSAGE_COMMAND_EXEC_ERROR : POSTMESSAGE_COMMAND_SUCCESS);
			responseData.statusDetails = (response === false ? "[POSTMESSAGE_COMMAND_EXEC_ERROR]" : "[POSTMESSAGE_COMMAND_SUCCESS]");
			responseData.response = response;
			_postMessageSendResponse(request, responseData);
		}
		else {
			// Asynchronous
			_postMessageRequestMap[uid] = request;	
		}
	};

	var _postMessageCallbackWrapper = function (uid, response) {
		var request = _postMessageRequestMap[uid];
		delete _postMessageRequestMap[uid];

		var responseData = {};
		var success = !!response && response.statusCode === "0";
		responseData.statusCode = (success ? POSTMESSAGE_COMMAND_SUCCESS : POSTMESSAGE_COMMAND_EXEC_ERROR);
		responseData.statusDetails = (success ? "[POSTMESSAGE_COMMAND_SUCCESS]" : "[POSTMESSAGE_COMMAND_EXEC_ERROR]");
		responseData.response = response;
		_postMessageSendResponse(request, responseData);
	};

	var uuidv4 = function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	}

	//
	// POST MESSAGE WRAPPER ENDS
	//

	var _setWindowLevel = function (center, width) {
		if (arguments.length == 2 && arguments[0] instanceof Object && typeof arguments[1] === 'string') {
			var args = arguments[0];
			center = args['center'];
			width = args['width'];
		}
		return _getViewer().test_setWindowLevel(center, width);
	};
	
	var _toggleImageSharpening = function () {
		return _getViewer().test_toggleImageSharpening();
	};
	
	var _doInvert = function () {
		return _getViewer().test_doInvert();
	};
	
	var _putSeriesInSelectedViewPort = function (seriesUID, viewPortNum, studyNum, monitorNum) {
		if (arguments.length == 2 && arguments[0] instanceof Object && typeof arguments[1] === 'string') {
			var args = arguments[0];
			seriesUID = args['seriesUID'];
			viewPortNum = args['viewPortNum'];
			studyNum = args['studyNum'];
			monitorNum = args['monitorNum'];
		}
		if (viewPortNum !== undefined) {
			return _getViewer().test_putSeriesInSelectedViewPort(seriesUID, viewPortNum, studyNum, monitorNum);
		}else if (studyNum === undefined && monitorNum === undefined) {
			return _getViewer().test_putSeriesInSelectedViewPort(seriesUID, viewPortNum, -1, 1);
		}else {
			return _getViewer().test_putSeriesInSelectedViewPort(seriesUID, -1, studyNum, monitorNum);
		}
	};
	var _putAdvancedVisSeriesOnMonitor = function (seriesUID, studyNum, monitorNum, layoutName) {
		if (arguments.length == 2 && arguments[0] instanceof Object && typeof arguments[1] === 'string') {
			var args = arguments[0];
			seriesUID = args['seriesUID'];
			studyNum = args['studyNum'];
			monitorNum = args['monitorNum'];
			layoutName = args['layoutName'];
		}
		return _getViewer().test_putAdvancedVisSeriesOnMonitor(seriesUID, studyNum, monitorNum, layoutName);
	};

	var _putAdvancedVisSeriesGuidOnMonitor = function (seriesGuid, monitorNum) {
		return _getViewer().test_putAdvancedVisSeriesGuidOnMonitor(seriesGuid, monitorNum);
	};

	var _getReviewLayoutType = function (monitorNum) {
		if (arguments[0] instanceof Object) {
			var args = arguments[0];
			monitorNum = args['monitorNum'];
		}
		return _getViewer().test_getReviewLayoutType(monitorNum);
	};  
	
	var _exportImage = function (fileName) {
		if (arguments[0] instanceof Object) {
			var args = arguments[0];
			fileName = args['fileName'];
		}
		return _getViewer().test_exportImage(fileName);
	};
	var _getLoadedStudies = function (fileName) {
		if (arguments[0] instanceof Object) {
			var args = arguments[0];
			fileName = args['fileName'];
		}
		return _getViewer().test_getLoadedStudies();
	};
	var _waitForImagesToInitialize = function(callbackName, replayRecent) {
		if (arguments[0] instanceof Object && typeof arguments[1] === 'string') {
			if(arguments[0] instanceof Object) {
				var args = arguments[0];
				callbackName = args['callbackName'];
				replayRecent = args['replayRecent'] != null ? args['replayRecent'] : false;
			}
		} else if (arguments.length == 1) {
			replayRecent = false;
		}
		_getViewer().test_waitForImagesToInitialize(callbackName, replayRecent);
	};

	var _waitForUserStateSave = function(callbackName) {
		if (arguments[0] instanceof Object) {
			var args = arguments[0];
			callbackName = args['callbackName'];
		}
		_getViewer().test_waitForUserStateSave(callbackName);
	};
	
	var _getScreenLayoutByName = function(layoutName) {
		if (arguments[0] instanceof Object) {
			var args = arguments[0];
			layoutName = args['layoutName'];
		}
		return _getViewer().test_getScreenLayoutByName(layoutName);
	};
	var _getStudyCompareModeByName = function(compareName) {
		if (arguments[0] instanceof Object) {
			var args = arguments[0];
			compareName = args['compareName'];
		}
		return _getViewer().test_getStudyCompareModeByName(compareName);
	};
	var _getViewProxyInCell = function(cellId) {
		if (arguments[0] instanceof Object) {
			var args = arguments[0];
			compareName = args['cellId'];
		}
		return _getViewer().test_getViewProxyInCell(cellId);
	};
	var _getImageUIDInCellTile = function(cellId, row, col) {
		if (arguments.length == 2 && arguments[0] instanceof Object && typeof arguments[1] === 'string') {
			var args = arguments[0];
			cellId = args['cellId'];
			row = args['row'];
			col = args['col'];
		}
		return _getViewer().test_getImageUIDInCellTile(cellId, row, col);
	};
	var _swapSeriesCells = function(seriesCellIndex1, seriesCellIndex2) {
		if (arguments[0] instanceof Object && typeof arguments[1] === 'string') {
			var args = arguments[0];
			cellId = args['cellId'];
			seriesCellIndex1 = args['seriesCellIndex1'];
			seriesCellIndex2 = args['seriesCellIndex2'];
		}
		return _getViewer().test_swapSeriesCells(seriesCellIndex1,seriesCellIndex2);
	};
	var _getSelectedCell = function() {
		return _getViewer().test_getSelectedCell();
	};
	var _performAction = function(actionObject){
		return _getViewer().test_performAction(JSON.stringify(actionObject));
	};
	var _addMarkup = function(requestObject) {
		return _getViewer().test_addMarkup(JSON.stringify(requestObject));
	};
	var _removeMarkup = function(requestObject){
		return _getViewer().test_removeMarkup(JSON.stringify(requestObject));
	};
	var _getMarkups = function(requestObject) {
		return _getViewer().test_getMarkups(JSON.stringify(requestObject));
	};
	var _getImageSize = function(requestObject) {
		return _getViewer().test_getImageSize(JSON.stringify(requestObject));
	};

	function objArrayToStringArray(objArray) {
		var stringArray = [];
		for(var i = 0; i < objArray.length; i++) {
			stringArray[i] = JSON.stringify(objArray[i]);
		}
		return stringArray;
	}

	var _addMarkups = function(requestObjects) {
		//Given we expect to recieve objects from PostMessage, we must potentially convert requestObjects from object to array.
		if(requestObjects["requestObjects"] != null) {
			requestObjects = requestObjects["requestObjects"];
		}
		return _getViewer().test_addMarkups(objArrayToStringArray(requestObjects));
	};
	
	var _removeMarkups = function(requestObjects) {
		//Given we expect to recieve objects from PostMessage, we must potentially convert requestObjects from object to array.
		if(requestObjects["requestObjects"] != null) {
			requestObjects = requestObjects["requestObjects"];
		}
		return _getViewer().test_removeMarkups(objArrayToStringArray(requestObjects));
	};
	
	var _throwError = function(){
		_getViewer().test_throwError();
	}

	var _loseWebGlContext = function() {
		_getViewer().test_loseWebglContext();
	}
	
	var _iterateNextRelevantPrior = function() {
		_getViewer().test_iterateNextRelevantPrior();
	}

	var _iteratePreviousRelevantPrior = function() {
		_getViewer().test_iteratePreviousRelevantPrior();
	}

	var _iterateNextSeries = function() {
		_getViewer().test_iterateNextSeries();
	}

	var _iteratePreviousSeries = function() {
		_getViewer().test_iteratePreviousSeries();
	}

	var _iterateNextImage = function() {
		_getViewer().test_iterateNextImage();
	}

	var _iteratePreviousImage = function() {
		_getViewer().test_iteratePreviousImage();
	}
	
	var _setUIScaleFactor = function(uiScaleFactor) {
		_getViewer().test_setUIScaleFactor(uiScaleFactor);
	}

	var _executeAction = function(name, params){
		return _getViewer().test_executeAction(name, params);
	};

	var _getViewerState = function() {
		if (!_isMethodSupported()) {
			return null;
		}
		return _getViewer().test_getViewerState();
	};

	var _putSeriesGuidInSelectedViewPort = function (seriesGuid, viewPortNum, monitorNum) {
		return _getViewer().test_putSeriesGuidInSelectedViewPort(seriesGuid, viewPortNum, monitorNum);
	};

	var _getImageGuidsForSeries = function(seriesGuid) {
		return _getViewer().test_getImageGuidsForSeries(seriesGuid);
	}

	var _getUserAction = function(name) {
		return _getViewer().test_getUserAction(name);
	}

	var _getUserActions = function() {
		return _getViewer().test_getUserActions();
	}

	return {
		init: _init,
		setWindowLevel: _setWindowLevel,
		toggleImageSharpening: _toggleImageSharpening,
		doInvert: _doInvert,
		putSeriesInSelectedViewPort: _putSeriesInSelectedViewPort,
		putSeriesGuidInSelectedViewPort: _putSeriesGuidInSelectedViewPort,
		putAdvancedVisSeriesOnMonitor: _putAdvancedVisSeriesOnMonitor,
		putAdvancedVisSeriesGuidOnMonitor: _putAdvancedVisSeriesGuidOnMonitor,
		getReviewLayoutType: _getReviewLayoutType,
		exportImage: _exportImage,
		getLoadedStudies : _getLoadedStudies,
		waitForImagesToInitialize: _waitForImagesToInitialize,
		waitForUserStateSave: _waitForUserStateSave,
		getScreenLayoutByName: _getScreenLayoutByName,
		getStudyCompareModeByName: _getStudyCompareModeByName,
		getViewerState: _getViewerState,
		getViewProxyInCell: _getViewProxyInCell,
		getImageUIDInCellTile: _getImageUIDInCellTile,
		getImageGuidsForSeries: _getImageGuidsForSeries,
		swapSeriesCells: _swapSeriesCells,
		getSelectedCell: _getSelectedCell,
		performAction: _performAction,
		addMarkup: _addMarkup,
		removeMarkup: _removeMarkup,
		getMarkups : _getMarkups,
		getImageSize : _getImageSize,
		addMarkups : _addMarkups,
		removeMarkups : _removeMarkups,
		throwError : _throwError,
		loseWebglContext: _loseWebGlContext,
		iterateNextRelevantPrior: _iterateNextRelevantPrior,
		iteratePreviousRelevantPrior: _iteratePreviousRelevantPrior,
		iterateNextSeries: _iterateNextSeries,
		iteratePreviousSeries: _iteratePreviousSeries,
		iterateNextImage: _iterateNextImage,
		iteratePreviousImage: _iteratePreviousImage,
		setUIScaleFactor: _setUIScaleFactor,
		executeAction: _executeAction,
		getUserAction: _getUserAction,
		getUserActions: _getUserActions
	}
}();