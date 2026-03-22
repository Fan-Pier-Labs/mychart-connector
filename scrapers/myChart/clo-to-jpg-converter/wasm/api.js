/**
 * Protect window.console method calls, e.g. console is not defined on IE unless dev tools are open
 */
if (typeof console == 'undefined') {
	var noop = function(){};
	console = { log: noop, debug: noop, error: noop, info: noop, trace: noop, warn: noop };
}

/**
 * For those browsers not supporting Array.indexOf() method
 * source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
 */
if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function indexOf(member, startFrom) {
		/*
		 * In non-strict mode, if the 'this' variable is null or undefined, then it is set to the window object.
		 * Otherwise, 'this' is automatically converted to an object. In strict mode, if the 'this' variable is
		 * null or undefined, a 'TypeError' is thrown.
		 */
		if (this == null) {
			throw new TypeError(
					"Array.prototype.indexOf() - cannot convert '" + this + "' to object");
		}

		var index = isFinite(startFrom) ? Math.floor(startFrom) : 0;
		var that = this instanceof Object ? this : new Object(this);
		var length = isFinite(that.length) ? Math.floor(that.length) : 0;

		if (index >= length) {
			return -1;
		}

		if (index < 0) {
			index = Math.max(length + index, 0);
		}

		if (member === undefined) {
			/*
			 * Since 'member' is undefined, keys that don't exist will
			 * have the same value as 'member', and thus do need to be
			 * checked.
			 */
			do {
				if (index in that && that[index] === undefined) {
					return index;
				}
			} while (++index < length);
		} else {
			do {
				if (that[index] === member) {
					return index;
				}
			} while (++index < length);
		}

		return -1;
	};
}

var VIEWER = function() {
	// If the hash tag has changed navigate to the new patient
	var JS_COMMAND = "jscommand";

	// PostMessage declaration
	var POSTMESSAGE_INCOMING_MESSAGE_TYPE_COMMAND_REQUEST = "command-request";
	
	var POSTMESSAGE_TYPE_KEEP_ALIVE = "keep-alive";
	var POSTMESSAGE_TYPE_COMMAND_RESPONSE = "command-response";
	var POSTMESSAGE_TYPE_CUSTOM_ACTION = "custom-action";
	var POSTMESSAGE_TYPE_SUBSCRIBED_NOTIFICATION = "subscribed-notification";
	
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
	var POSTMESSAGE_COMMAND_HANDLED_IN_VIEWER = 9;
	var POSTMESSAGE_COMMAND_ERROR_UNKNOWN = 9999;

	var LOAD_NEW_CONTEXT_COMMAND = "loadNewContextCommand";
	var ADD_RELATED_STUDY_COMMAND = "addRelatedStudyCommand";
	var LOAD_STUDY_WITH_PARAM_COMMAND = "loadStudyWithParamCommand";
	var SET_STUDY_STATUS_COMMAND = "setStudyStatusCommand";
	var ADD_NOTIFICATION_COMMAND = "addNotificationCommand";
	var OPEN_IMAGE_COMMAND = "openImageCommand";
	var SAVE_STUDIES_COMMAND = "saveStudiesCommand";
	var CLOSE_STUDY_COMMAND = "closeStudyCommand";
	
	var _singlePatientId = false;
	var _isPostMessageAPIEnabled = false;
	var _postMessageAllowedOrigins = [];
	var _isViewer = false;
	var _isDebugMode = false;
	var _loadClearForNewPatientReloadRate;
	var _page;
	//A list of calls that have been attempted while the viewer is blocked. Once we receive the callback that the viewer is unblocked, execute the calls in this list 
	var _pendingCallsForBlockedViewer = [];
	var _defaultLoadNewContextTimeout = 0;

	var _setEunityConfigValues = function (singlePatientId) {
		_singlePatientId = singlePatientId;
	};

	var _handleHashChange = function(hash) {
		var hasJSCommand = hash.indexOf(JS_COMMAND) >= 0;			
		if (hasJSCommand) {
			var queryParams = _extractQueryParams(hash);
			var commandName = queryParams[JS_COMMAND];
			if( commandName != null && commandName != "" ){
				_executeCommandByName(commandName, queryParams);
			}
		} else {
			_loadClearForNewPatient(hash);
		}
	};

	// optional: queryParams, callback, timeout
	var _executeCommandByName = function(commandName, queryParams) {
		if (commandName.toUpperCase() === "EUNITY_loadStudyWithPidAndAccession".toUpperCase() || commandName.toUpperCase() === "loadStudyWithPidAndAccession".toUpperCase()) {
			console.log(commandName+"("+queryParams["patient_id"]+", "+queryParams["accession_number"]+", "+queryParams["serviceInstance"]+", "+queryParams["studyStatus"]+")");
			
			var context = {
				serviceInstance: queryParams["serviceInstance"],
				studyStatus: queryParams["studyStatus"]
			};
			return _loadStudyWithPidAndAccession(queryParams["patient_id"], queryParams["accession_number"], context);
		}
		
		if (commandName.toUpperCase() === "EUNITY_loadClearForNewPatient".toUpperCase() || commandName.toUpperCase() === "loadClearForNewPatient".toUpperCase()) {
			console.log(commandName+"("+queryParams["queryString"]+")");
			var queryString = queryParams["queryString"];
			if (!queryString) {
				queryString = queryParams;
			}
			var callback = queryParams["callback"];
			var timeout = queryParams["timeout"];
			return _loadClearForNewPatient(queryString, callback, timeout);
		}
		
		if (commandName.toUpperCase() === "EUNITY_loadStudyWithParam".toUpperCase() || commandName.toUpperCase() === "loadStudyWithParam".toUpperCase()) {
			console.log(commandName+"("+queryParams["studyUID"]+", "+queryParams["accession_number"]+", "+queryParams["serviceInstance"]+", "+queryParams["studyStatus"]+")");

			// ideally centralized _addRelatedStudy(context) should be used, but there is a backwards compatibility issue,
			// i.e. in _addRelatedStudy(context) patientId is required when studyUID is null and singlePatientId is false,
			// which is not applied here
			var context = {
				studyUID: queryParams["studyUID"],
				accessionNumber: queryParams["accession_number"],
				serviceInstance: queryParams["serviceInstance"],
				studyStatus: queryParams["studyStatus"]
			};
			return _loadStudyWithParam(context);
		}	
		
		if (commandName.toUpperCase() === "EUNITY_setStudyStatus".toUpperCase() || commandName.toUpperCase() === "setStudyStatus".toUpperCase()) {
			console.log(commandName+"("+queryParams["studyUID"]+", "+queryParams["accession_number"]+", "+queryParams["studyStatus"]+")");
			
			var studyUID = queryParams["studyUID"];
			var accessionNumber = queryParams["accession_number"];
			var studyStatus = queryParams["studyStatus"];

			if (!!studyUID) {
				return _setStudyStatus({studyUID:studyUID, studyStatus:studyStatus});
			}
			else if (!!accessionNumber) {
				return _setStudyStatus({accessionNumber:accessionNumber, studyStatus:studyStatus});
			}
		}	
		
		if (commandName.toUpperCase() === "EUNITY_setStudyStatusWithStudyUID".toUpperCase() || commandName.toUpperCase() === "setStudyStatusWithStudyUID".toUpperCase()) {
			console.log(commandName+"("+queryParams["studyUID"]+", "+queryParams["studyStatus"]+")");
			return _setStudyStatus({
				studyUID: queryParams["studyUID"],
				studyStatus: queryParams["studyStatus"]
			});
		}
		
		if (commandName.toUpperCase() === "closeViewer".toUpperCase()) {
			return _closeViewer({force: queryParams['force']});
		}

		if (commandName.toUpperCase() === "addNotification".toUpperCase()) {
			console.log(commandName+"("+queryParams["context"]+")");
			return _addNotification(queryParams["context"]);
		}
		
		if (commandName.toUpperCase() === "ADDRELATEDSTUDY") {
			console.log(commandName+"("+queryParams["studyUID"]+", "+queryParams["patient_id"]+", "+queryParams["accession_number"]+", "+queryParams["serviceInstance"]+", "+queryParams["studyStatus"]+")");
			
			var context = {
					studyUID: queryParams["studyUID"],
					patientId: queryParams["patient_id"],
					accessionNumber: queryParams["accession_number"],
					serviceInstance: queryParams["serviceInstance"],
					studyStatus: queryParams["studyStatus"]
				};
			return _addRelatedStudy(context);
		}
		
		if(commandName.toUpperCase() === "openImage".toUpperCase()){
			console.log(commandName+"("+queryParams["seriesUID"]+", "+queryParams["intanceUID"]);
			var context = {
					seriesUID: queryParams["seriesUID"],
					instanceUID: queryParams["intanceUID"],
					frameNumber: 0
				};
			return _openImage(context);
		}
	};

	var _extractQueryParams = function(queryString){
		var queryParams = {};
	
		if (!!queryString) {
			var nameValPairs = queryString.split("&");
			for(var pairIdx=0; pairIdx < nameValPairs.length; pairIdx++){
				var pairStr = nameValPairs[pairIdx];
				var pairArr = pairStr.split("=");
				if( pairArr != null && pairArr.length == 2 && pairArr[0] != null){
					queryParams[pairArr[0]] = pairArr[1];
				}
			}
		}
		
		return queryParams;
	};

	var _getPage = function() {
		return _page;
	}

	var _getViewer = function () {
		var viewer = null;
		
		if (_isInViewer()) {
			if (getViewerType() === "HTML") {
		    	viewer = window;
		    } else {
				var eunityElements = document.getElementsByName('Eunity');
				if (!!eunityElements && !!eunityElements[0] && eunityElements[0].loadStudy) {
					viewer = eunityElements[0];
				}
				
				if (viewer == null) {
					viewer = document.getElementById('Eunity');
				}	
			}
		} else {
			throw new NonViewerPageException("Viewer not found.");
		}

		if(typeof viewer.jsApiInitialized !== 'function'){
			throw new APINotInitializedException("Viewer API is not yet initialized");
		}

		return viewer;
	};
	
	var _isInViewer = function() {
		return VIEWER.getPage() === "VIEWER";
	}
	
	var _isInSearchList = function() {
		return VIEWER.getPage() === "SEARCHVIEW";
	}

	var _closeViewer = function (context) {
		if(_isInSearchList()){
			if (getSearchType() === "legacy" || getSearchType() === "responsive") {
				closeSearch();
				return true;
			}
		}else{
			// still allowed after the viewer is closed
			if (!_isMethodSupported(true)) {
				return false;
			}
			
			//clear any pending requests and say that we received a callback (in the case we close the viewer in the middle of a call before the callback is received)
			_viewerCallbackReceived = true;
			_pendingCallsForBlockedViewer = [];
			
			try{
				//TODO: Remove this later - api.js shouldn't reach for the window object to grab the inactivityTimer obj
				if (inactivityTimer != null) {					
				inactivityTimer.resetIdleTimeForJSCall();
			}
			}catch(e){
				console.error("Cannot reset idleTimeout before close. Error="+e);
			}
			var force = false;
			if(context != null && context["force"] != null && typeof context["force"] == "boolean") {
				force = context["force"];
			}
			return _getViewer().closeViewer(force);
		}
	}
	
	var _isViewerClosedFromSearchList = function() {
		return isSearchClosed ? isSearchClosed() : false;
	}

	var _isViewerClosed = function () {
		if(_isInSearchList()){
			return _isViewerClosedFromSearchList();
		}
		
		if (!_isViewer) {
			return null;
		}
		
		var viewer = _getViewer();
		if (!!viewer) {
			return viewer.isViewerClosed();
		}
		return false;
	}

	var _isViewerBlocked = function() {
		if (!_isViewer) {
			return null;
		}
		
		var viewer = _getViewer();
		if (!!viewer) {
			return viewer.isViewerBlocked();
		}
		return false;
	}

	var _getPhysicalMonitors = function () {	
		if (!_isInViewer()) {
			return 1;
		}

		var viewer = _getViewer();
		if (!!viewer) {
			return viewer.getPhysicalMonitors();
		}
		return null;
	}

	var _openImage = function(context) {
		if (!_isMethodSupported()) {
			return false;
		}
		
		if (!context) {
			console.error("Parameter context is mandatory.");
			return false;
		}
		
		if (!context.seriesUID && !context.instanceUID) {
			console.error("Must contain seriesUID or instanceUID.");
			return false;
		}

		if(_isViewerBlocked() || !_viewerCallbackReceived) {
			_pendingCallsForBlockedViewer.push({commandName: OPEN_IMAGE_COMMAND, parameters: {context: context}});
			return false;
		}

		return _getViewer().openImage(context);
	};
	

	
	var _getStudyStatuses = function () {
		var viewer = _getViewer();
		if (!viewer) {
			console.error("Viewer not found.");
			return;
		}
		return viewer.getStudyStatuses();
	}
	
	var _isMethodSupported = function (allowWhenViewerIsClosed) {
		var viewer = _getViewer();
		if (!viewer) {
			console.error("Viewer not found.");
			return false;
		}
		if (allowWhenViewerIsClosed || !_isViewerClosed()) {
			return true;
		} else {
			console.error('This method is not supported when viewer is closed.');
			return false;
		}
	}
	
	var _setStudyStatus = function (parameters) {
		if (!_isMethodSupported()) {
			return false;
		}
		
		if (!parameters || !parameters.studyStatus) {
			console.error("Parameters and studyStatus are mandatory.");
			return false;
		}
		
		if (!parameters.studyUID && !parameters.accessionNumber) {
			console.error("Must contain studyUID or accessionNumber.");
			return false;
		}
		
		if (!parameters.studyUID) {
			// _setStudyStatusWithAccession or _setStudyStatusWithPidAndAccession
			if (!_singlePatientId) {
				// use _setStudyStatusWithPidAndAccession
				if (!parameters.patientId) {
					console.error('SinglePatientId is false. Please provide patientId also.');
					return false;
				}
			} else {
				// use _setStudyStatusWithAccession
				if (!!parameters.patientId) {
					console.error('SinglePatientId is true. Please remove patientId.');
					return false;
				}
			}
		}

		if(_isViewerBlocked() || !_viewerCallbackReceived) {
			_pendingCallsForBlockedViewer.push({commandName: SET_STUDY_STATUS_COMMAND, parameters: {params: parameters}});
			return false;
		}

		return _getViewer().setStudyStatus(parameters.studyUID, parameters.patientId, parameters.accessionNumber, parameters.studyStatus);
	}
	
	var _setStudyStatusWithStudyUID = function (studyUID, studyStatus) {
		return _setStudyStatus({
			studyUID: studyUID,
			studyStatus: studyStatus
		});
	};
	
	var _setStudyStatusWithAccession = function (accessionNumber, studyStatus) {
		if (!_isMethodSupported()) {
			return false;
		}
		
		if (!_singlePatientId) {
			console.error('This method can not be used when SinglePatientId is false. Please use "setStudyStatusWithPidAndAccession" instead.');
			return false;
		}
		
		return _setStudyStatus({
			accessionNumber: accessionNumber,
			studyStatus: studyStatus
		});
	};

	var _setStudyStatusWithPidAndAccession = function (patientId, accessionNumber, studyStatus) {
		if (!_isMethodSupported()) {
			return false;
		}
		
		if (_singlePatientId && !!patientId) {
			console.error('This method can not be used when SinglePatientId is true. Please use "setStudyStatusWithAccession" instead.');
			return false;
		}
		return _setStudyStatus({
			patientId: patientId,
			accessionNumber: accessionNumber,
			studyStatus: studyStatus
		});
	};

	var _ping = function() {
		// still allowed after the viewer is closed
		if(typeof apiPingSupported === 'function' || _isMethodSupported(true)){
			return "pong";
		}else{
			return false;
		}
	};
	
	var _getTimeToFirstImageFromPageLoad = function() {
		if(_isMethodSupported(false)){
			return _getViewer().getTimeToFirstImageFromPageLoad();
		}
	};
	
	var _getViewerLoadTime = function(){
		if(_isMethodSupported(false)){
			return _getViewer().getViewerLoadTime();
		}
	};
	
	var _getTimeToFirstImageFromNewContext = function() {
		if(_isMethodSupported(false)){
			return _getViewer().getTimeToFirstImageFromNewContext();
		}
	};
	
	var _getTimeToFirstImageFromRelatedStudy = function() {
		if(_isMethodSupported(false)){
			return _getViewer().getTimeToFirstImageFromRelatedStudy();
		}
	};
	
	var _getTimeToFirstImage = function() {
		if(_isMethodSupported(false)){
			return _getViewer().getTimeToFirstImage();
		}
	}
	
	var _addRelatedStudy = function(context) {
		if (!_isMethodSupported()) {
			return false;
		}
		
		if (!context) {
			console.error("Parameter context is mandatory.");
			return false;
		}
		if (!context.studyUID && !context.accessionNumber) {
			console.error("Must contain studyUID or accessionNumber.");
			return false;
		}

		if (!context.studyUID) {
			// _loadStudyWithAccession or _loadStudyWithPidAndAccession
			if (!_singlePatientId) {
				// use _loadStudyWithPidAndAccession
				if (!context.patientId) {
					console.error('SinglePatientId is false. Please provide patientId also.');
					return false;
				}
			}
		}

		if(_isViewerBlocked() || !_viewerCallbackReceived) {
			_pendingCallsForBlockedViewer.push({commandName :ADD_RELATED_STUDY_COMMAND, parameters :{context :context}});
			return false;
		}
	
		return _getViewer().loadStudy(context.studyUID, context.patientId, context.accessionNumber, context);
	};
	
	var _loadStudyWithParam = function(context) {
		if (!_isMethodSupported()) {
			return false;
		}
		
		if (!context) {
			console.error("Parameter context is mandatory.");
			return false;
		}
		if (!context.studyUID && !context.accessionNumber) {
			console.error("Must contain studyUID or accessionNumber.");
			return false;
		}
		if(_isViewerBlocked() || !_viewerCallbackReceived) {
			_pendingCallsForBlockedViewer.push({commandName: LOAD_STUDY_WITH_PARAM_COMMAND, parameters: {context :context}});
			return false;
		}
		return _getViewer().loadStudy(context.studyUID, null, context.accessionNumber, context);
	}

	var _loadStudyWithStudyUID = function(studyUID, context) {
		context = context || {};

		context.studyUID = studyUID;
		return _addRelatedStudy(context);
	};
	
	var _loadStudyWithAccession = function(accessionNumber, context) {
		if (!_isMethodSupported()) {
			return false;
		}
		
		if (!_singlePatientId) {
			console.error('This method can not be used when SinglePatientId is false. Please use "loadStudyWithPidAndAccession" instead.');
			return false;
		}
		
		context = context || {};
		context.accessionNumber = accessionNumber;
		return _addRelatedStudy(context);
	};	

	var _loadStudyWithPidAndAccession = function(patientId, accessionNumber, context) {
		context = context || {};
		context.patientId = patientId;
		context.accessionNumber = accessionNumber;
		return _addRelatedStudy(context);
	};

	var _viewerCallbackReceived = true;
	var _internalViewerCallback = function(){
		_viewerCallbackReceived = true;
	};

	var _viewerBlockReleasedCallback = function(){
		//If API calls happened while we were blocked, execute them now
		if(_pendingCallsForBlockedViewer.length > 0){
			//Setting callback received to true here as well because if we've received the block released callback, that means we are done loading the study that was loading
			_viewerCallbackReceived = true;
			var brokeEarly = false;
			for (var i = 0; i < _pendingCallsForBlockedViewer.length; i++) {
				var pendingCall = _pendingCallsForBlockedViewer[i];
				if(_isViewerBlocked() || !_viewerCallbackReceived) {
					//If one of the calls in the loop has caused the viewer to become blocked we don't want to continue to do more things in the list.
					//Break out, and the list of pending calls will resume once the block is released
					//Remove the items of the list that we have completed so far before breaking out - this will allow us to pick up here where we left off when the block state is released again
					_pendingCallsForBlockedViewer.splice(0,i);
					brokeEarly = true;
					break;
				}
				
				switch (pendingCall.commandName) {
					case LOAD_NEW_CONTEXT_COMMAND:
						_debug("BLOCK_RELEASED_LOAD_NEW_CONTEXT_COMMAND");
						_loadNewContext(pendingCall.parameters.context, pendingCall.parameters.callback);
						break;
					case ADD_RELATED_STUDY_COMMAND:
						_debug("BLOCK_RELEASED_ADD_RELATED_STUDY_COMMAND");
						_addRelatedStudy(pendingCall.parameters.context);
						break;
					case LOAD_STUDY_WITH_PARAM_COMMAND:
						_debug("BLOCK_RELEASED_LOAD_STUDY_WITH_PARAM_COMMAND");
						_loadStudyWithParam(pendingCall.parameters.context);
						break;
					case SET_STUDY_STATUS_COMMAND:
						_debug("BLOCK_RELEASED_SET_STUDY_STATUS_COMMAND");
						_setStudyStatus(pendingCall.parameters.params);
						break;
					case ADD_NOTIFICATION_COMMAND:
						_debug("BLOCK_RELEASED_ADD_NOTIFICATION_COMMAND");
						_addNotification(pendingCall.parameters.context);
						break;
					case OPEN_IMAGE_COMMAND:
						_debug("BLOCK_RELEASED_OPEN_IMAGE_COMMAND");
						_openImage(pendingCall.parameters.context);
						break;
					case SAVE_STUDIES_COMMAND:
						_debug("BLOCK_RELEASED_SAVE_STUDIES_COMMAND");
						_saveStudies(pendingCall.parameters.context, pendingCall.parameters.callback);
						break;
					case CLOSE_STUDY_COMMAND:
						_debug("BLOCK_RELEASED_CLOSE_STUDY_COMMAND");
						_closeStudy(pendingCall.parameters.context, pendingCall.parameters.callback);
						break;
					default:
						console.error("Error calling pending API call - unknown command name: " + pendingCall.commandName);
						break;
				}
			}

			if(!brokeEarly){
				//if we didnt break out of the loop early, then all the calls are completed and we can reset the list of pending calls
				_pendingCallsForBlockedViewer = [];
			}
		} 
	}
	
	var _baseUrl = function() {
		return location.protocol + "//" + location.hostname + (location.port && ":" + location.port);
	};
	
	var _getViewerUrlWithQueryString = function (viewerQueryString) {
		var baseUrl = _baseUrl();
		return baseUrl + "/e/viewer?" + viewerQueryString;
	};
	
	var _reloadViewerWithUrl = function (reloadUrl) {
		if (reloadUrl != null) {
			window.location = reloadUrl;
		}
	};
	
	var _loadTimeoutHandler = function () {
		if (!_viewerCallbackReceived) {
			var reloadUrl = _getViewerUrlWithQueryString(_currentViewerQueryString);
			_reloadViewerWithUrl(reloadUrl);
		}
		_currentViewerQueryString = "";
	};
	

	var _reloadTimeoutId = 0;
	var _loadClearCount = 0;
	var shouldPerformFullReloadImmediately = false;
	var _currentViewerQueryString;
	var _loadClearForNewPatient = function (queryString, callback, timeout) {
		if (!queryString) {
			console.error("Parameter queryString is mandatory.");
			return;
		}
	
		var context = {
			queryString : queryString,
			timeout : timeout
		};
		
		var wrappedCallback;
		if (!!callback) {
			try {
				eval('var func = ' + callback);
				if (typeof func === "function") {
					wrappedCallback = 'function(response) {response = response || {}; var callback = ' + callback + '; callback(response.statusCode, response.statusDetails, response.studiesLoaded);}';
				}
			}
			catch (exception) {
				console.error(exception);
			}
		}
		_loadNewContext(context, wrappedCallback);
		return true; //case 13243 - added to preserve backward compatibility 
	};

	var _isParentCrossOrigin = function() {
		var doc = null;
		try {
			doc = window.parent.document;
		} catch (e) {}
	
		return doc == null;
	};
	
	var _loadNewContext = function (context, callback) {
		if (!context) {
			console.error("Parameter context is mandatory.");
			return;
		}
		
		// Case 6909
		if (_loadClearForNewPatientReloadRate > 0) {
			shouldPerformFullReloadImmediately = Math.floor(++_loadClearCount % _loadClearForNewPatientReloadRate) == 0;
		}
		
		var queryString = context.queryString;
		
		// Case 7082
		if(queryString != null && queryString.indexOf('+') > 0){
			var ESCAPED_SPACE = "%20";
			queryString = queryString.replace(/\+/g,ESCAPED_SPACE);
		}
		
		if( shouldPerformFullReloadImmediately || !_isViewer ) {
			if (window.parent !== window && !_isParentCrossOrigin() && typeof window.parent.VIEWER !== 'undefined') {
				// This is an iframe embedded inside an instance of eUnity... So, do nothing!
				return;
			} 
			// Case 6909
			_currentViewerQueryString = queryString;
			var reloadUrl = _getViewerUrlWithQueryString(queryString);
			_reloadViewerWithUrl(reloadUrl);
		}else{
			if (_getViewer()) {
				if(_isViewerBlocked() || !_getViewer().loadClearForNewPatient(queryString, callback)) {
					//if the viewer is blocked, store the loadNewContext for when it becomes unblocked.  If there is already a loadNewContext in the queue, remove it (and any calls since)
					//and add this one
					if(_pendingCallsForBlockedViewer.length > 0) {
						var otherLoadNewContextCommandIndex = -1;
						for (var i = 0; i < _pendingCallsForBlockedViewer.length; ++i) {
							if (_pendingCallsForBlockedViewer[i].commandName == LOAD_NEW_CONTEXT_COMMAND) {
								otherLoadNewContextCommandIndex = i;
								break;
							}
						}
						//If the queue already has a load new context, slice the list to only be what's before that load new context, thus removing the previous loadNewContext and any calls that have happened since
						if(otherLoadNewContextCommandIndex > -1){
							_pendingCallsForBlockedViewer = _pendingCallsForBlockedViewer.slice(0, otherLoadNewContextCommandIndex);
						}
					}
					_pendingCallsForBlockedViewer.push({commandName: LOAD_NEW_CONTEXT_COMMAND, parameters: {context: context, callback: callback}});
					return;
				}
			
				if (_reloadTimeoutId > 0) {
					window.clearTimeout(_reloadTimeoutId);
				}

				_viewerCallbackReceived = false;
				_currentViewerQueryString = queryString;
				
				var timeout = context.timeout > 0 ? context.timeout : _defaultLoadNewContextTimeout;
				if( timeout > 0 ) {
					_reloadTimeoutId = window.setTimeout(_loadTimeoutHandler, timeout);
				}
			}
		}
	};

	var _addNotification = function (context) {
		if (!_isMethodSupported()) {
			return false;
		}
		
		if (!context) {
			console.error("Parameter context is mandatory.");
			return false;
		}

		if(_isViewerBlocked() || !_viewerCallbackReceived) {
			_pendingCallsForBlockedViewer.push({commandName: ADD_NOTIFICATION_COMMAND, parameters: {context: context}});
			return false;
		}
		
		var type = context.type;
		var summary = context.summary;
		var details = context.detail;
		var priority = context.priority;
		var parameters = context.parameters;
		var showPopup = context.showPopup;
		var popupDisplayTime = context.popupDisplayTime;
		
		return _getViewer().addNotification(type, summary, details, priority, parameters, showPopup, popupDisplayTime);
	};

	var _saveStudies = function (context, callback) {
		if (!_isMethodSupported()) {
			return false;
		}
		
		if(_isViewerBlocked() || !_viewerCallbackReceived) {
			_pendingCallsForBlockedViewer.push({commandName: SAVE_STUDIES_COMMAND, parameters: {context: context, callback: callback}});
			return false;
		}

		var studyUids = !!context ? context['studyUids'] : null;
		if (typeof studyUids == 'string') {
			studyUids = [studyUids];
		}

		_getViewer().saveStudies(studyUids, callback);
	}

	var _closeStudy = function (context, callback) {
		if (!_isMethodSupported()) {
			return false;
		}
		
		if (!context.studyUID && !context.accessionNumber) {
			console.error("Must contain studyUID or accessionNumber.");
			return false;
		}
		
		if (!context.studyUID) {
			if (!_singlePatientId) {
				if (!context.patientId) {
					console.error('SinglePatientId is false. Please provide patientId also.');
					return false;
				}
			} else {
				if (!!context.patientId) {
					console.error('SinglePatientId is true. Please remove patientId.');
					return false;
				}
			}
		}

		if(_isViewerBlocked() || !_viewerCallbackReceived) {
			_pendingCallsForBlockedViewer.push({commandName: CLOSE_STUDY_COMMAND, parameters: {context: context, callback: callback}});
			return false;
		}
		
		_getViewer().closeStudy(context.studyUID, context.patientId, context.accessionNumber, callback);
	}
	
	// 
	// Start Extended JavaScript API
	//
	
	var _getViewerState = function() {
		if (!_isMethodSupported()) {
			return null;
		}
		return _getViewer().getViewerState();
	};
	
	var _getToolbarModes = function() {
		if (!_isMethodSupported()) {
			return null;
		}
		return _getViewer().getToolbarModes();
	};
	
	var _setToolbarModeByName = function(name) {
		if (!_isMethodSupported()) {
			return null;
		}
		return _getViewer().setToolbarModeByName(name);
	};

	//
	// Stop Extended JavaScript API
	//
	
	// Place holder for local callback for loadClearForNewPatient 
	var _localCallback = function () {
		console.error("Callback was not initialized.")
	};
	
	var _initLocalCallback = function (callback) {
		try {
			eval("_localCallback = " + callback);
		}
		catch (exception) {
			_localCallback = null;
		}

		if (typeof _localCallback !== "function") {
			_localCallback = function () {
				console.error("Callback is not a function.")
			};
		}

		this.localCallback = _localCallback;
	};
	
	var _observers = [];
	var _subscribe = function (target, origin) {
		if (!target || !origin) {
			console.error("Parameters target and origin are mandatory.")
			return;
		}
		
		if (_observers == null) {
			_observers = [];
		}
		else {
			for (var i = 0; i < _observers.length; i++) {
				if (_observers[i].target == target && _observers[i].origin == origin) {
					return;
				}
			}
		}

		_observers.push({
			target: target,
			origin: origin
		});
	};

	var _unsubscribe = function (target, origin) {
		if (!target || !origin) {
			console.error("Parameters target and origin are mandatory.")
			return;
		}
		
		if (_observers == null) {
			return;
		}

		for (var i = 0; i < _observers.length; i++) {
			if (_observers[i].target == target && _observers[i].origin == origin) {
				_observers.splice(i, 1);
				break;
			}
		}
	};

	var _viewerEventPostMessageSubscribe = function(context, source, origin) {
		var result = _viewerEventSubscribe(context, origin, function(data, origin) { 
			source.postMessage(JSON.stringify(data), origin);
		});
		
		source.postMessage(JSON.stringify({
			"messageType": "command-response",
			"requestData": {
				"data": {
					"command": "viewerEventSubscribe",
					"context": context
				}
			},
			"data": result
		}), origin);
	}

	var _viewerEventJSSubscribe = function(context, callback) {
		return _viewerEventSubscribe(context, 'JS', function(response, _) {callback(response)});
	}

	var _viewerEventSubscribe = function(context, origin, callback) {
		if (!context || !context.events || !(context.events instanceof Array) || context.events.length == 0 || !callback) {
			throw new ParametersException("Context.events and callback parameters are mandatory and context.events cannot be empty.");
		}
		
		var success = _getViewer().startListeningForEvents(context.events, origin, callback);
		return {
			"statusCode": success ? 0 : 1,
			"statusDetails": success ? "Successfully subscribed to: " + context.events : "One or more of the requested events were invalid"
		};
	}

	var _viewerEventPostMessageUnsubscribe = function(context, source, origin) {
		var result = _viewerEventUnsubscribe(context, origin);
		
		source.postMessage(JSON.stringify({
			"messageType": "command-response",
			"requestData": {
				"data": {
					"command": "viewerEventUnsubscribe",
					"context": context
				}
			},
			"data": result
		}), origin);
	}

	var _viewerEventJSUnsubscribe = function(context) {
		return _viewerEventUnsubscribe(context, 'JS');
	}

	var _viewerEventUnsubscribe = function(context, origin) {
		if (!context || !context.events || !(context.events instanceof Array) || context.events.length == 0) {
			throw new ParametersException("Context.events parameter is mandatory and cannot be empty.");
		}

		var success = _getViewer().stopListeningForEvents(context.events, origin);
		return {
			"statusCode": success ? 0 : 1,
			"statusDetails": success ? "Successfully unsubscribed to: " + context.events : "One or more of the requested events were invalid"
		};
	}
	
	var _notify = function (message) {
		if (!message) {
			console.error("Parameter message is mandatory.")
			return;
		}
		
		if (_observers == null) {
			return;
		}

		for (var i = 0; i < _observers.length; i++) {
			var observer = _observers[i];
			if ( (typeof observer.target.postMessage == "function") || (typeof observer.target.postMessage == "object") ) {
				// typeof function returns 'object' on ie6/ie7/ie8
				try{
					observer.target.postMessage(message, observer.origin);
				}catch(e){}
			}
		}
	};

	//
	// POST MESSAGE WRAPPER STARTS
	//

	// Expecting event.data to have the following format:
	// request = {
	//		messageType:String - Currently only supporting "command-request"
	//		payload:Object - payload to echo back out to the caller
	//		data:Object - data (depends on message-type)
	//		if [messageType === 'command-request'] then
	//			data = {
	//				command:String -> Name of JS method. E.g. VIEWER.command
	//				context:Object - format varies per command
	//			}
	//		end
	//
	// };

	// Return object has the following format:
	// response = {
	//		messageType:String - One of: "keep-alive", "command-response", "subscribed-notification"
	//		requestData:Object - payload to echo back out to the caller
	//   	data:Object - data (depends on message-type)
	//		if [messageType === 'command-response'] then
	//			data = {
	//				statusCode:String - whether execution succeeded. 0 for success. 1 rejected (e.g. not in origin list). 2. API not enabled.
	//					3 API not supported(e.g. wrong page, or disabled). 4 InvalidCall. 5. Exec error. 9999. Other
	//		 		statusDetails:String - details on error. 0 - nothing. 1 - details on error. 2 - details on rejection.
	//				command:String - name of the function that was executed
	//				response:Object - the responseObject (varies for each function)
	//			}
	//		end
	//		if [messageType === "subscribed-notification"] then
	//			data = { // TODO: not yet complete
	//				eventName:String,
	//				... 
	//			}
	//		end
	//		if [messageType === "keep-alive"] then
	//			data = {}
	//		end
	// };
	
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
	
	var _initForViewer = function (isPostMessageAPIEnabled, postMessageAllowedOrigins, page, defaultLoadNewContextTimeout, debugMode) {
		// Initialize the Location Hash listener
		if ("onhashchange" in window) { // event supported?
			window.addEventListener('hashchange', function () {
				if( window.location.hash ){			
					var hash = window.location.hash.substring(1,window.location.hash.length); //remove the beginning '#'
					_handleHashChange(hash);
				}
			});
		} else { // event not supported:
			var storedHash = window.location.hash;
			window.setInterval(function () {
				if (window.location.hash != storedHash) {
					storedHash = window.location.hash;
					if (storedHash) {
						var hash = storedHash.substring(1, storedHash.length);
						_handleHashChange(hash);
					}
				}
			}, 500);
		}
		
		_isPostMessageAPIEnabled = isPostMessageAPIEnabled;
		_postMessageAllowedOrigins = postMessageAllowedOrigins;	
		_isViewer = true;
		_isDebugMode = debugMode;
		_page = page;
		_defaultLoadNewContextTimeout = defaultLoadNewContextTimeout;

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

	_debugListeners = [];
	_debug = function() {
		if(!_isDebugMode) {
			return;
		}
		
        for (var i = 0; i < _debugListeners.length; i++) {
            if (typeof _debugListeners[i] == 'function') {
				_debugListeners[i].apply(this, arguments);
            }
      	}
    }

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
		
		if ((typeof dataStr === "object" && dataStr.type == 'IFrameWrapperMessage') || (typeof dataStr === "string" && dataStr.indexOf("test-") != -1)) {
			// this request will be handled by the IFrameWrapper class, or the Testing api
			return;
		}
		
		var responseData = {};
		
		var request = null;
		try {
			request = JSON.parse(dataStr);
			
			request.source = event.source;
			request.origin = event.origin;
			
			var requestDataMessageType = request.messageType;
			var requestData = request.data;
							
			if ( requestDataMessageType == POSTMESSAGE_TYPE_CUSTOM_ACTION){
				//we don't want to listen for our custom actions
				return;
			}
							
			if (!_isPostMessageAPIEnabled) {
				responseData.statusCode = POSTMESSAGE_COMMAND_NOT_ENABLED;
				responseData.statusDetails = "[POSTMESSAGE_COMMAND_NOT_ENABLED] The postMessage API is not enabled. Make sure the server has the following flag set: EnablePostMessageJavaScriptAPI=true";
			} else if (!_postMessageVerifyOrigin(origin, _postMessageAllowedOrigins)) {
				responseData.statusCode = POSTMESSAGE_COMMAND_REJECTED;
				responseData.statusDetails = "[POSTMESSAGE_COMMAND_REJECTED] Invalid origin "+origin+" valid origins="+_postMessageAllowedOrigins.join();
			} else if (requestDataMessageType !== POSTMESSAGE_INCOMING_MESSAGE_TYPE_COMMAND_REQUEST) {
				// only supporting incoming messageTypes of "command-request"
				responseData.statusCode = POSTMESSAGE_COMMAND_UNKNOWN_MESSAGE_TYPE;
				responseData.statusDetails = "[POSTMESSAGE_COMMAND_UNKNOWN_MESSAGE_TYPE] message-type "+requestDataMessageType+" is not supported. Only 'command-request' is supported.";
			} else if (source === null || requestData === null || (typeof requestData !== 'object')) {
				responseData.statusCode = POSTMESSAGE_COMMAND_ERROR_UNKNOWN;
				responseData.statusDetails = "[POSTMESSAGE_COMMAND_ERROR_UNKNOWN] Error Unknown";	
			} else {
				// API enabled, correct message type and origins verified
				// Execute command now.
				if (requestData.command == 'viewerEventSubscribe') {
					responseData.statusCode = POSTMESSAGE_COMMAND_HANDLED_IN_VIEWER;
					_viewerEventPostMessageSubscribe(requestData.context, source, origin);
				} else if(requestData.command == 'viewerEventUnsubscribe') {
					responseData.statusCode = POSTMESSAGE_COMMAND_HANDLED_IN_VIEWER;
					_viewerEventPostMessageUnsubscribe(requestData.context, source, origin);	
				}else {
					// handle the rest of API calls here
					responseData = _handlePostMessage(request, responseData);
				}
			}			
		} catch (e) {
			if (!request) {
				// FIX for EUOLD-10727
				// do nothing - unexpected post message received
				return;
			}
			
			//
			// Attempt to match error with the problem response code / error detail
			if (e instanceof NonViewerPageException) {
				responseData.statusCode = POSTMESSAGE_COMMAND_NOT_SUPPORTED;
				responseData.statusDetails = "The PostMessage API is not support on non viewer pages";
			} else if (e instanceof APINotInitializedException) {
				responseData.statusCode = POSTMESSAGE_COMMAND_UNINITIALIZED;
				responseData.statusDetails = "[POSTMESSAGE_COMMAND_UNINITIALIZED] "+e.message;
			} else {
				// couldn't parse the object. Object in invalid format. 
				responseData.statusCode = POSTMESSAGE_COMMAND_ERROR_UNKNOWN;
				responseData.statusDetails = "[POSTMESSAGE_COMMAND_ERROR_UNKNOWN] Parsing error. name="+e.name+" message="+e.message+". Expecting JSON.parse(event.data) to work.";
			}
			console.error(e);
		}
		
		if (responseData.statusCode != null && responseData.statusCode != POSTMESSAGE_COMMAND_HANDLED_IN_VIEWER) {
			// return value back to caller
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
		
		// a list of methods for backwards compatibility
		var command = request.data.command;
		var commandToUpper = command.toUpperCase();
		if (['EUNITY_LOADSTUDYWITHPIDANDACCESSION',
			 'LOADSTUDYWITHPIDANDACCESSION',
			 'EUNITY_LOADSTUDYWITHPARAM',
			 'LOADSTUDYWITHPARAM',
			 'LOADSTUDYWITHSTUDYUID',
			 'LOADSTUDYWITHACCESSION',
			 'LOADSTUDYWITHPIDANDACCESSION',
			 'EUNITY_LOADCLEARFORNEWPATIENT',
			 'LOADCLEARFORNEWPATIENT',
			 'EUNITY_SETSTUDYSTATUS',
			 'EUNITY_SETSTUDYSTATUSWITHSTUDYUID',
			 'SETSTUDYSTATUSWITHSTUDYUID'
			 ].indexOf(commandToUpper) != -1) {
			if (['EUNITY_LOADCLEARFORNEWPATIENT','LOADCLEARFORNEWPATIENT'].indexOf(commandToUpper) == -1
					&& _isViewerClosed()) {
				console.error('Method \"' + command + '\" is not supported when viewer is closed.');
				responseData.statusCode = POSTMESSAGE_COMMAND_VIEWER_LOCKED;
				responseData.statusDetails = "The viewer is CLOSED. Please run loadNewContext to load the viewer.";
				responseData.response = false;
			} else {
				responseData = setPostMessageResponse(request, responseData);
			}
		} else {
			// for current API
			if (['ADDRELATEDSTUDY','SETSTUDYSTATUS','ADDNOTIFICATION','GETVIEWERSTATE','GETVIEWERLOADTIME','GETTIMETOFIRSTIMAGEFROMRELATEDSTUDY','GETTIMETOFIRSTIMAGEFROMNEWCONTEXT','GETTIMETOFIRSTIMAGEFROMPAGELOAD', 'SAVESTUDIES'].indexOf(commandToUpper) != -1 && _isViewerClosed()) {
				console.error('Method \"' + command + '\" is not supported when viewer is closed.');
				responseData.statusCode = POSTMESSAGE_COMMAND_VIEWER_LOCKED;
				responseData.statusDetails = "The viewer is CLOSED. Please run loadNewContext to load the viewer.";
				responseData.response = false;
			} else {
				_executePostMessage(request);
				responseData.statusCode = POSTMESSAGE_COMMAND_HANDLED_IN_VIEWER;
				
				if ((shouldPerformFullReloadImmediately || !_isViewer) && ['LOADNEWCONTEXT'].indexOf(commandToUpper) != -1) {
					// loadNewContext successfully reload from non viewer page
					responseData.statusCode = POSTMESSAGE_COMMAND_SUCCESS;
					responseData.statusDetails = "[POSTMESSAGE_COMMAND_SUCCESS]";
					responseData.response = true;
				}
			}
		}
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
		var success = !!response && response.statusCode.toString() === "0";
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
	
	var _initForNonViewer = function (isPostMessageAPIEnabled, postMessageAllowedOrigins, loadClearForNewPatientReloadRate, page) {
		_isPostMessageAPIEnabled = isPostMessageAPIEnabled;
		_postMessageAllowedOrigins = postMessageAllowedOrigins;
		_loadClearForNewPatientReloadRate = loadClearForNewPatientReloadRate;
		_isViewer = false;
		_page = page;
		if (isPostMessageAPIEnabled) {
			_initPostMessageWrapper();
		}
	};
	
	function NonViewerPageException(message) {
		this.message = message;
		this.stack = Error().stack;
	}
	if (typeof Object.create != 'undefined') {
		NonViewerPageException.prototype = Object.create(Error.prototype);
	}
	NonViewerPageException.prototype.name = "NonViewerPageException";

	function APINotInitializedException(message) {
		this.message = message;
		this.stack = Error().stack;
	}
	if (typeof Object.create != 'undefined') {
		APINotInitializedException.prototype = Object.create(Error.prototype);
	}
	APINotInitializedException.prototype.name = "APINotInitializedException";

	function ParametersException(message) {
		this.message = message;
		this.stack = Error().stack;
	}
	if (typeof Object.create != 'undefined') {
		ParametersException.prototype = Object.create(Error.prototype);
	}
	ParametersException.prototype.name = "ParametersException";
	
	function setPostMessageResponse(request, responseData) {
		var command = request.data.command;
		var context = request.data.context;
		var responseVal = _executeCommandByName(command, context);
		// For now, just check for obvious error responses
		responseData.statusCode = (responseVal === null || responseVal === false) ? POSTMESSAGE_COMMAND_EXEC_ERROR : POSTMESSAGE_COMMAND_SUCCESS;
		responseData.statusDetails = (responseVal === null || responseVal === false) ? "[POSTMESSAGE_COMMAND_EXEC_ERROR]" : "[POSTMESSAGE_COMMAND_SUCCESS]";
		responseData.response = responseVal;
		return responseData;
	}
	//
	// POST MESSAGE WRAPPER ENDS
	//
	
	//
	// Legacy methods on the window object
	window.EUNITY_viewer = _getViewer;
	window.EUNITY_getStudyStatuses = _getStudyStatuses;
	window.EUNITY_setStudyStatus = function (studyUID, accessionNumber, studyStatus) {
		if (studyUID != null && studyUID.length > 0) {
			return _setStudyStatusWithStudyUID(studyUID, studyStatus);
		}
		else if (accessionNumber != null && accessionNumber.length > 0) {
			return _setStudyStatusWithAccession(accessionNumber, studyStatus);
		}
		else {
			return false;
		}
	};
	window.EUNITY_ping = _ping;
	window.EUNITY_loadStudy = _addRelatedStudy;
	window.EUNITY_loadStudyWithPidAndAccession = function (patientId, accessionNumber, serviceInstance, studyStatus) {
		var context = {
			serviceInstance: serviceInstance,
			studyStatus: studyStatus,
		};
		return _loadStudyWithPidAndAccession(patientId, accessionNumber, context);
	};
	window.EUNITY_loadStudyWithParam = function (studyUID, accessionNumber, serviceInstance, studyStatus) {
		// ideally centralized _addRelatedStudy(context) function should be used, but there is backwards compatibility issue,
		// i.e. in _addRelatedStudy(context) patientId is required when studyUID is null and singlePatientId is false,
		// which is not applied here
		var context = {
			studyUID: studyUID,
			accessionNumber: accessionNumber,
			serviceInstance: serviceInstance,
			studyStatus: studyStatus
		};
		return _loadStudyWithParam(context);
	};
	window.EUNITY_loadClearForNewPatient = _loadClearForNewPatient;
	window.internalViewerCallback = _internalViewerCallback;
	window.viewerBlockReleasedCallback = _viewerBlockReleasedCallback;
	window.EUNITY_initLocalCallback = _initLocalCallback;
	window.EUNITY_localCallback = _localCallback;
	window.EUNITY_subscribe = _subscribe;
	window.EUNITY_unsubscribe = _unsubscribe;
	window.EUNITY_notify = _notify;
	
	return {
		// Backwards compatibility methods
		setStudyStatusWithStudyUID: _setStudyStatusWithStudyUID,
		setStudyStatusWithAccession: _setStudyStatusWithAccession,
		setStudyStatusWithPidAndAccession: _setStudyStatusWithPidAndAccession,
		loadStudyWithStudyUID: _loadStudyWithStudyUID,
		loadStudyWithAccession: _loadStudyWithAccession,
		loadStudyWithPidAndAccession: _loadStudyWithPidAndAccession,
		loadClearForNewPatient: _loadClearForNewPatient,

 		//         
		// Current API	
		//          
		getViewer: _getViewer,
		closeViewer: _closeViewer,
		getStudyStatuses: _getStudyStatuses,
		ping: _ping,
		getTimeToFirstImageFromPageLoad: _getTimeToFirstImageFromPageLoad,
		getTimeToFirstImageFromNewContext: _getTimeToFirstImageFromNewContext,
		getTimeToFirstImageFromRelatedStudy: _getTimeToFirstImageFromRelatedStudy,
		getTimeToFirstImage: _getTimeToFirstImage,
		getViewerLoadTime: _getViewerLoadTime,
		isViewerBlocked: _isViewerBlocked,
		getPage: _getPage,

		// @since 6.5
		addNotification: _addNotification,
		loadNewContext: _loadNewContext,
		addRelatedStudy: _addRelatedStudy,
		setStudyStatus: _setStudyStatus,

		// @since 6.10.1
		saveStudies: _saveStudies,

		// @since 7.1
		closeStudy: _closeStudy,
		viewerEventSubscribe: _viewerEventJSSubscribe,
		viewerEventUnsubscribe: _viewerEventJSUnsubscribe,
          
		// @future (unsupported)    
		getViewerState: _getViewerState,
		getToolbarModes: _getToolbarModes,
		setToolbarModeByName: _setToolbarModeByName,
          
		// Nuance experimental
		openImage: _openImage,

		//Debug
		debugListeners: _debugListeners,

 		// Internal/Helper methods
		subscribe: _subscribe,
		unsubscribe: _unsubscribe,
		notify: _notify,
		internalViewerCallback: _internalViewerCallback,
		viewerBlockReleasedCallback: _viewerBlockReleasedCallback,
		initLocalCallback: _initLocalCallback,
		localCallback: _localCallback,
		executeCommandByName: _executeCommandByName,
		setEunityConfigValues: _setEunityConfigValues,
		initForViewer: _initForViewer,
		initForNonViewer: _initForNonViewer,        
		isViewerClosed: _isViewerClosed,
		isViewerBlocked: _isViewerBlocked,
		getPhysicalMonitors: _getPhysicalMonitors

	}
}();