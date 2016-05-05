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
var ok = phantom.injectJs("logging.js");
if (!ok) {
    phantom.exit(1);
}
logger.set_level(log_level);
ok = phantom.injectJs("jquery.min.js");
if (!ok) {
    logger.error('Load jquery failed');
    phantom.exit(1);
}

//page.customHeaders = {
//    'Authorization': 'Basic '+btoa('rocky.chen@dpaw.wa.gov.au:Easondad75')
//};
//page.settings.userName="rocky.chen@dpaw.wa.gov.au";
//page.settings.password="Easondad75";

page.onConsoleMessage = function(msg,lineNum,sourceId) {
    logger.relay(msg);
};
page.onError = function(msg,trace) {
    var msgStack = ['ERROR: ' + msg];

    if (trace && trace.length) {
        msgStack.push('TRACE:');
        trace.forEach(function(t) {
           msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
        });
    }

    logger.error(msgStack.join('\\n'))
    phantom.exit(1)
};

page.onResourceRequested = function(requestData, networkRequest) {
    logger.debug('Request (#' + requestData.id + '): ' + JSON.stringify(requestData));
};
page.onResourceError = function(resourceError) {
    logger.error('Unable to load resource (#' + resourceError.id + 'URL:' + resourceError.url + '). Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);
    phantom.exit(1)
};
page.onResourceReceived = function(response) {
    logger.debug('Response (#' + response.id + ', stage "' + response.stage + '"): ' + JSON.stringify(response));
};
page.onResourceTimeout = function(request) {
    logger.error('Response timeout (#' + request.id + '): ' + JSON.stringify(request));
    phantom.exit(1)
};

var run_time = 0;
var wait_interval = 1;

function callback(status) {
    if (status != 'success') {
        logger.error('Failed to open ' + outputs[output_index].url);
        phantom.exit(1);
    } else {
        page.evaluate(function(login_user,metadata,log_level,output_pages) {
            logger.set_level(log_level);
            print_status = print_doc(login_user,metadata,output_pages);
        },login_user,metadata.map,log_level,output_pages)
        var checking = setInterval(function(){
            run_time += wait_interval;
            var ready_to_print = page.evaluate(function() {
                return print_status.ready_to_print;
            })
            if(ready_to_print) {
                clearInterval(checking);
                
                logger.info('Wait extra 2 seconds for rendering the image');
                setTimeout(function() {
                    if (keep_tmp_file) {
                        fs.write(outputs[output_index].file + ".html",page.content);
                    }
                    if ((output_index < outputs.length - 1) && (outputs[output_index].format != "pdf")) {
                        var page_settings = page.evaluate(function() {
                            return webpage.get_settings();
                        })
                        output_pages.push({id:outputs[output_index].id,file:outputs[output_index].file,page_settings:page_settings});
                        //clear the margin
                        var page_size = page.evaluate(function(page_settings) {
                            return webpage.clear_margin(page_settings);
                        },page_settings)
                        page.clipRect = {
                            top:0,
                            left:0,
                            width:page_size[0],
                            height:page_size[1]
                        };
                        
                    }

                    if ((outputs[output_index].format == "pdf") && (output_index == outputs.length - 1)) {
                        if ((output_index > 0) && ( outputs[output_index].id == "image_to_pdf.html")) {
                            //get the page size from before steps.
                            page.paperSize = {
                                format:output_pages[0].page_settings.printing.paper,
                                orientation:output_pages[0].page_settings.printing.orientation,
                                margin: {
                                    left:output_pages[0].page_settings.printing.margin.left + "mm",
                                    right:output_pages[0].page_settings.printing.margin.right + "mm",
                                    top:output_pages[0].page_settings.printing.margin.top + "mm",
                                    bottom:output_pages[0].page_settings.printing.margin.bottom + "mm",
                                },
                                //header: {
                                //    height:output_pages[0].page_settings.printing.margin.top + "mm",
                                //    contents: phantom.callback(function(pageNum, numPages) {
                                //        return "<div/>";
                                //    })
                                //},
                                footer:{
                                    height:"5mm",
                                    contents:phantom.callback(function(pageNum, numPages) {
                                        return "<table ><tr><th align='left' style='padding-right:5px;padding-left:100px'>Creator:</th><td>" + login_user.email + "</td><th align='left' style='padding-right:5px;padding-left:100px'>Time:</th><td>" + new Date().toLocaleString() + "</td></table>";
                                    })
                                },
                            }
                            page.evaluate(function(page_settings) {
                                webpage.clear_margin(page_settings);
                            },output_pages[0].page_settings)
                        }
                        //logger.info(JSON.stringify(page.paperSize));
                    }
                    page.render(outputs[output_index].file,{format:outputs[output_index].format,quality:quality});
                    if (output_index == outputs.length - 1) {
                        phantom.exit();
                    } else {
                        output_index += 1;
                        logger.info("Try to open url '" + outputs[output_index].url + "'")
                        page.open(outputs[output_index].url,callback);
                    }
                },2000);
            } else if(run_time > timeout) {
                clearInterval(checking);
                logger.error("Timeout.");
                phantom.exit(1);
            }
        },wait_interval * 1000);
    }
}
//page.viewportSize = { width: 420, height: 297 };
logger.info("Try to open url '" + outputs[output_index].url + "'")
page.open(outputs[output_index].url,callback);
