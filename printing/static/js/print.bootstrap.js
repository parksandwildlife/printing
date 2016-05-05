"use strict"
{% autoescape off %}

var outputs = {{outputs}};
var sso_cookie_name = "{{sso_cookie_name}}";
var sso_cookie_domain = "{{sso_cookie_domain}}";
var sso_cookie = "{{sso_cookie}}";
var login_user = {{login_user}};
var metadata = {{metadata}};
var timeout = {{timeout}};
var quality = 100;
var log_level = {{log_level}};
var working_directory = '{{working_directory}}';
var keep_tmp_file = {{keep_tmp_file}};
var output_files = {};

var output_index = 0;


if (metadata.quality != null) {
    quality = metadata.quality;
}

phantom.libraryPath = working_directory + "/js"

phantom.addCookie({'name':sso_cookie_name,"value":sso_cookie,"domain":sso_cookie_domain})


var webPage = require('webpage');
var fs = require('fs')
var page = webPage.create();
var logging = require(working_directory + '/js/logging');

logging.logger.set_level(log_level);

var ok = phantom.injectJs("jquery.min.js");
if (!ok) {
    logging.logger.error('Load jquery failed');
    phantom.exit(1);
}

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

function callback(status) {
    if (status != 'success') {
        logging.logger.error('Failed to open ' + outputs[output_index].url);
        phantom.exit(1);
    } else {
        page.evaluate(function(login_user,metadata,log_level,output_files) {
            logger.set_level(log_level);
            print_status = print_doc(login_user,metadata,output_files);
        },login_user,metadata.map,log_level,output_files)
        var checking = setInterval(function(){
            run_time += wait_interval;
            var ready_to_print = page.evaluate(function() {
                return print_status.ready_to_print;
            })
            if(ready_to_print) {
                clearInterval(checking);
                
                logging.logger.info('Wait extra 2 seconds for rendering the image');
                setTimeout(function() {
                    if (keep_tmp_file) {
                        fs.write(outputs[output_index].file + ".html",page.content);
                    }
                    if (outputs[output_index].format == "pdf") {
                        logging.logger.info('set pagerSize');
                        page.paperSize = {
                            width:"420mm",
                            height:"297mm",
                            margin: {
                                top:"0mm",
                                left:"0mm",
                                bottom:"0mm",
                                right:"0mm"
                            },
                            /*
                            footer:{
                                height:"10mm",
                                contents:phantom.callback(function(pageNum, numPages) {
                                    return "<table><tr><th>Creator</th><td>aaa</td><th>Time</th><td></td></table>";
                                })
                            },
                            */
                        }
                        logging.logger.info(JSON.stringify(page.paperSize));
                    }
                    page.render(outputs[output_index].file,{format:outputs[output_index].format,quality:quality});
                    if (output_index == outputs.length - 1) {
                        phantom.exit();
                    } else {
                        output_files[outputs[output_index].id] = outputs[output_index].file;
                        output_index += 1;
                        page.open(outputs[output_index].url,callback);
                    }
                },2000);
            } else if(run_time > timeout) {
                clearInterval(checking);
                logging.logger.error("Timeout.");
                phantom.exit(1);
            }
        },wait_interval * 1000);
    }
}
//page.viewportSize = { width: 420, height: 297 };
page.open(outputs[output_index].url,callback);
{% endautoescape %}
