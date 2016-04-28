"use strict"
{% autoescape off %}

var output_file = "{{output_file}}";
var output_format = "{{output_format}}";
var sso_cookie_name = "{{sso_cookie_name}}";
var sso_cookie_domain = "{{sso_cookie_domain}}";
var sso_cookie = "{{sso_cookie}}";
var print_html = "{{print_html}}";
var login_user = {{login_user}};
var metadata = {{metadata}};
var timeout = {{timeout}};
var quality = 100;
var log_level = {{log_level}};
var working_directory = '{{working_directory}}';
var keep_tmp_file = {{keep_tmp_file}}


if (metadata.quality != null) {
    quality = metadata.quality;
}

phantom.addCookie({'name':sso_cookie_name,"value":sso_cookie,"domain":sso_cookie_domain})


var webPage = require('webpage');
var fs = require('fs')
var page = webPage.create();
var logging = require(working_directory + '/js/logging');

logging.logger.set_level(log_level);

//page.customHeaders = {
//    'Authorization': 'Basic '+btoa('rocky.chen@dpaw.wa.gov.au:Easondad75')
//};
//page.settings.userName="rocky.chen@dpaw.wa.gov.au";
//page.settings.password="Easondad75";

page.onConsoleMessage = function(msg,lineNum,sourceId) {
    if (!logging.logger.relay(msg))
        phantom.exit(1)
};
page.onError = function(msg,trace) {
    var msgStack = ['ERROR: ' + msg];

    if (trace && trace.length) {
        msgStack.push('TRACE:');
        trace.forEach(function(t) {
           msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
        });
    }

    logging.logger.error(msgStack.join('\\n'))
    phantom.exit(1)
};

page.onResourceRequested = function(requestData, networkRequest) {
    logging.logger.debug('Request (#' + requestData.id + '): ' + JSON.stringify(requestData));
};
page.onResourceError = function(resourceError) {
    logging.logger.error('Unable to load resource (#' + resourceError.id + 'URL:' + resourceError.url + '). Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);
    phantom.exit(1)
};
page.onResourceReceived = function(response) {
    logging.logger.debug('Response (#' + response.id + ', stage "' + response.stage + '"): ' + JSON.stringify(response));
};
page.onResourceTimeout = function(request) {
    logging.logger.error('Response timeout (#' + request.id + '): ' + JSON.stringify(request));
    phantom.exit(1)
};

var run_time = 0;
var wait_interval = 1;
page.viewportSize = { width: 1920, height: 1200 };
page.open(print_html,function(status){
    if (status != 'success') {
        logging.logger.error('Failed to open ' + print_html);
        phantom.exit(1);
    } else {
        page.evaluate(function(login_user,metadata,log_level) {
            logger.set_level(log_level);
            restore = L.Restore("map",login_user,metadata);
        },login_user,metadata.map,log_level)
        var checking = setInterval(function(){
            run_time += wait_interval;
            var ready_to_print = page.evaluate(function() {
                return restore.finished;
            })
            if(ready_to_print) {
                clearInterval(checking);
                
                logging.logger.info('Wait extra 2 seconds for rendering the image');
                setTimeout(function() {
                    if (keep_tmp_file) {
                        fs.write(output_file + ".html",page.content);
                    }
                    page.render(output_file,{format:output_format,quality:quality});
                    phantom.exit();
                },2000);
            } else if(run_time > timeout) {
                clearInterval(checking);
                logging.logger.error("Timeout.");
                phantom.exit(1);
            }
        },wait_interval * 1000);
    }
})
{% endautoescape %}
