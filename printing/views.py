import subprocess
import os
import tempfile
import json
import logging
import threading
import urllib,urlparse
import traceback
import sys

import StringIO
import time

from django.conf import settings
from django.http import HttpResponse,FileResponse,StreamingHttpResponse
from django.template import Context, Template

logger = logging.getLogger(__name__)


app_dir = os.path.dirname(os.path.abspath(__file__))
working_directory = os.path.join(app_dir,"static");

print_template = None

with open(os.path.join(app_dir,"static","js","print.bootstrap.js")) as f:
    print_template = Template(f.read())

class TmpFile(object):
    def __init__(self,f):
        self._file = f;

    @property
    def name(self):
        return self._file.name

    def read(self,*args,**kwargs):
        return self._file.read(*args,**kwargs)

    def open(self,*args,**kwargs):
        return self._file.open(*args,**kwargs)

    def close(self):
        try:
            self._file.close()
        except:
            pass
        try:
            os.remove(self._file.name)
            logger.info("Succeed to remove the temporary report file '{}'.".format(self._file.name))
        except Exception as ex:
            logger.error("Failed to remove temporary report file '{}'.{} ".format(self._file.name,ex))
    
class TmpFileResponse(StreamingHttpResponse):
    """ 
    A streaming HTTP response class optimized for files.
    """
    block_size = 4096

    def __init__(self,streaming_content=(), delete=True, *args, **kwargs):
        self._delete = delete
        super(TmpFileResponse, self).__init__(streaming_content,*args, **kwargs)

    def _set_streaming_content(self, value):
        if self._delete:
            value = TmpFile(value)
        filelike = value
        self._closable_objects.append(filelike)
        value = iter(lambda: filelike.read(self.block_size), b'')
        super(TmpFileResponse, self)._set_streaming_content(value)


def get_metadata(request):
    if request.META['CONTENT_TYPE'].lower() == "application/json":
        return json.loads(request.body.decode("utf-8"));
    else:
        return json.loads(request.POST["metadata"]) if "metadata" in request.POST else None

def print_to_png(request,template):
    return _print(request,template,"png",".png","image/png")

def print_to_pdf(request,template):
    return _print(request,template,"pdf",".pdf","application/pdf")

def print_to_jpg(request,template):
    return _print(request,template,"jpeg",".jpg","image/jpeg")

def print_to_bmp(request,template):
    return _print(request,template,"bmp",".bmp","image/bmp")

def print_to_gif(request,template):
    return _print(request,template,"gif",".gif","image/gif")

def log_subprocess_stdout(output,error_buff):
    for line in iter(output.readline,b''):
        #remove the line break
        line = line[:-1]
        line = line.decode("utf-8").replace("\\n","\n")
        msg = line.split(":",1)
        if len(msg) == 2 and msg[0] in ["debug","info","warning"]:
            getattr(logger,msg[0])(msg[1])
        elif len(msg) == 2 and msg[0] in ["error","critical"] :
            getattr(logger,msg[0])(msg[1])
            error_buff.write("{}\n".format(msg[1]))
        else:
            logger.info(msg)
    output.close()

def log_subprocess_stderr(output,error_buff):
    for line in iter(output.readline,b''):
        #remove the line break
        line = line[:-1]
        line = line.decode("utf-8").replace("\\n","\n")
        msg = line.split(":",1)
        if len(msg) == 2 and msg[0] in ["debug","info","error","warning","critical"]:
            error_buff.write("{}\n".format(msg[1]))
            getattr(logger,msg[0])(msg[1])
        else:
            error_buff.write("{}\n".format(line))
            logger.info(line)
    output.close()


def _print(request,template,output_format,output_file_ext,content_type):
    try:
        metadata = get_metadata(request)
        if not metadata:
            return HttpResponse("<html><head/><body><pre>{}</pre></body>".format("Missing report metadata"),status=400)
    except Exception as ex:
        return HttpResponse("<html><head/><body><h1>{}</h1><pre>{}</pre></body>".format("Invalid report metadata",ex),status=400)
        
    output_file = tempfile.mkstemp(suffix=output_file_ext,prefix="{}_".format(template))[1]
    output_file_basename = output_file[0:len(output_file_ext) * -1]
    print_js_file = "{}.js".format(output_file_basename)
    sso_cookie = request.COOKIES.get(settings.SSO_COOKIE_NAME,"")
    print_html = os.path.join(app_dir,"static","{}.html".format(template))
    outputs = []
    if not os.path.exists(print_html):
        print_html = os.path.join(app_dir,"static","{}.image.html".format(template))
        if output_format == "pdf":
            outputs.append({
                "format":"png",
                "file":"{}.png".format(output_file_basename),
                "url":urlparse.urljoin('file:',urllib.pathname2url(print_html)),
                "id":os.path.basename(print_html)
            })
            print_html = os.path.join(app_dir,"static","{}.pdf.html".format(template))
            if not os.path.exists(print_html):
                print_html = os.path.join(app_dir,"static","image_to_pdf.html")
            outputs.append({
                "format":"pdf",
                "file":"{}.pdf".format(output_file_basename),
                "url":urlparse.urljoin('file:',urllib.pathname2url(print_html)),
                "id":os.path.basename(print_html)})
    if not outputs:
        outputs.append({
            "format":output_format,
            "file":"{}{}".format(output_file_basename,output_file_ext),
            "url":urlparse.urljoin('file:',urllib.pathname2url(print_html)),
            "id":os.path.basename(print_html)
        })
        
    metadata_str = json.dumps(metadata,indent=4)
    context = Context({
        "outputs":json.dumps(outputs,indent=4),
        "sso_cookie":request.COOKIES.get(settings.SSO_COOKIE_NAME) or "",
        "sso_cookie_name":settings.SSO_COOKIE_NAME,
        "sso_cookie_domain":settings.SSO_COOKIE_DOMAIN,
        "metadata" : metadata_str,
        "login_user":json.dumps(dict([(k,getattr(request.user,k,"")) for k in ["username","first_name","last_name","email"]]),indent=4),
        "timeout":300,
        "log_level":settings.LOG_LEVEL,
        "working_directory":working_directory,
        "keep_tmp_file": json.dumps(settings.KEEP_TMP_FILE)
    })
    try:
        with open(print_js_file,'wb') as print_js:
            print_js.write(print_template.render(context))
            print_js.flush()
            print_process = subprocess.Popen(["phantomjs",print_js.name], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            log_stddout = threading.Thread(target="")
            error = StringIO.StringIO()
            try:
                stdout_thread = threading.Thread(target=log_subprocess_stdout,args=(print_process.stdout,error))
                stdout_thread.setDaemon(True)
                stdout_thread.start()
                stderr_thread = threading.Thread(target=log_subprocess_stderr,args=(print_process.stderr,error))
                stderr_thread.setDaemon(True)
                stderr_thread.start()
                stdout_thread.join()
                stderr_thread.join()
                print_process.poll()
                while(print_process.returncode is None):
                    print_process.poll()
                    time.sleep(1)

                if print_process.returncode != 0:
                    logger.error("Generate print document failed, \nreason={}".format(error.getvalue()))
                    for f in outputs:
                        try:
                            os.remove(f["file"])
                        except:
                            logger.error("Fail to remove temporary file '{}'".format(f["file"]));                           
                    return HttpResponse("<html><head/><body><pre>{}</pre></body>".format(error.getvalue()),status=500)

                if not settings.KEEP_TMP_FILE:
                    for f in outputs[0:-1]:
                        try:
                            os.remove(f["file"])
                        except:
                            logger.error("Fail to remove temporary file '{}'".format(f["file"]));                           

                return TmpFileResponse(open(output_file, 'rb'),delete=not settings.KEEP_TMP_FILE,content_type=content_type)
            finally:
                error.close()
    finally:
        if not settings.KEEP_TMP_FILE:
            os.remove(print_js_file)



