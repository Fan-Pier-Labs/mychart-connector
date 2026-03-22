var EUNITY_LAUNCHER = function(){

    var DEFAULT_LAUNCH_TIMEOUT_MS   = 100;
    var DEFAULT_EXPIRED_TIME_MS     = 1000;

    var iosAppStoreLink              = 'https://itunes.com/apps/eunity';
    var playAppStoreLink             = 'https://play.google.com/store/apps/details?id=air.com.clientoutlook.eunitymobile';

    var is_iOS = false;
    var is_Android = false;
    var is_Mobile= false;

   
    var log = function(text){
        if( window.console && window.console.log ){
            window.console.log(text);
        }
    };

    var get_app_store_link = function() {
        var link = "";
        if( is_iOS ){
            link = iosAppStoreLink;
        }

        if( is_Android ){
            link = playAppStoreLink;
        }
        return link;
    };

    var get_native_app_link = function( web_server_link, optional_username ) {
        var username = typeof optional_username !== 'undefined' ? optional_username : null;

        //
        // Support only HTTPS launch
        var link = "eunity://?host="+web_server_link+"&port="+443+"&protocol="+"https";
        if( username ){
            link += "&user="+username;
        }
        return link;
    };

    var is_expired = function( launch_time ) {
        var current_time = new Date().getTime();
        return current_time - launch_time > DEFAULT_EXPIRED_TIME_MS;
    };

    var sanitize_link = function(link){
        // remove protocol (Https is always assumed)
        link  = link.replace(/.*?:\/\//g, "");
        return link;
    };
    
    var internal_launch = function( queryString ){
    	var launch_time = new Date().getTime();
    	
    	if( is_Mobile ){
    		//
            // Attempt to launch native app.
            window.location = queryString;

            // 
            // Poll to see if app launched within DEFAULT_LAUNCH_TIMEOUT_MS
            setTimeout(function () {
                // Keep attempting to launch app or app store

                //
                // if we're here, native app is not installed
                if ( is_expired(launch_time) ) {
                    // we're back in, so open native app
                    window.location = get_native_app_link(web_server_link, optional_username);
                } else {
                    // link timed out, attempt app_store link again.
                    window.location = get_app_store_link();
                }

            }, DEFAULT_LAUNCH_TIMEOUT_MS);
    	}
    };

    return {

    	init : function(appStoreLink, playStoreLink, isMobile, isIOS, isAndroid){
    		is_iOS = isIOS;
    	    is_Android = isAndroid;
    	    is_Mobile= isMobile;
    		
    		if(appStoreLink){
    			iosAppStoreLink = appStoreLink;
    		}
    		
    		if(playStoreLink){
    			playAppStoreLink = playStoreLink;
    		}
    	},
    	
    	launchWithQueryString : function( queryString ){
    		
    		internal_launch( queryString );
    		
    	},
    	
        launch : function( web_server_link, optional_username ){
            
        	 web_server_link = sanitize_link( web_server_link );

             var queryString = get_native_app_link(web_server_link, optional_username);
             
             internal_launch( queryString );

        }
    };
}();