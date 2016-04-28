import subprocess
import os
import tempfile
import json
import logging
import threading
import pathlib

try:
    import StringIO
except:
    from io import StringIO
import time

from django.conf import settings
from django.http import HttpResponse,FileResponse
from django.template import Context, Template

logger = logging.getLogger(__name__)


app_dir = os.path.dirname(os.path.abspath(__file__))
working_directory = os.path.join(app_dir,"static");

print_template = None
with open(os.path.join(app_dir,"static","js","print.js")) as f:
    print_template = Template(f.read())

def close_temp_file(f):
    _close = f.close
    def _close_temp_file():
        _close()
        try:
            os.remove(f.name)
        except:
            logger.error("Failed to remove temporary report file '{}'.".format(f.name))
    
    return _close_temp_file;

class TempFileResponse(FileResponse):
    def _set_streaming_content(self,value):
        value.close = close_temp_file(value)
        super(TempFileResponse,self)._set_streaming_content(value)

def get_metadata(request):
    if request.META['CONTENT_TYPE'].lower() == "application/json":
        return request.body.decode("utf-8");
    else:
        return json.loads(request.POST["metadata"])

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
    metadata = get_metadata(request)
    output_file = tempfile.mkstemp(suffix=output_file_ext,prefix="{}_".format(template))[1]
    print_js_file = "{}.js".format(output_file)
    sso_cookie = request.COOKIES.get(settings.SSO_COOKIE_NAME,"")
    print_html = pathlib.Path(os.path.join(app_dir,"static","{}.html".format(template))).as_uri()
    metadata_str = json.dumps(metadata,indent=4)
    context = Context({
        "output_format":output_format,
        "output_file":output_file,
        "sso_cookie":'1qzhg1by1hs5c4frudmftbq2we8v97j2',
        "sso_cookie_name":settings.SSO_COOKIE_NAME,
        "sso_cookie_domain":settings.SSO_COOKIE_DOMAIN,
        "print_html":print_html,
        "metadata" : metadata_str,
        "login_user":{"name":"rockyc","email":"rocky.chen@dpaw.wa.gov.au"},
        "timeout":300,
        "log_level":logger.getEffectiveLevel(),
        "working_directory":working_directory,
        "keep_tmp_file": json.dumps(settings.KEEP_TMP_FILE)
    })
    try:
        with open(print_js_file,'wb') as print_js:
            print_js.write(bytes(print_template.render(context),'UTF-8'))
            print_js.flush()
            print_process = subprocess.Popen(["phantomjs",print_js.name], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            log_stddout = threading.Thread(target="")
            error = StringIO()
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
                    os.remove(output_file)
                    return HttpResponse("<html><head/><body><pre>{}</pre></body>".format(error.getvalue()),status=500)

                if settings.KEEP_TMP_FILE:
                    response = FileResponse(open(output_file, 'rb'),content_type=content_type)
                else:
                    response = TempFileResponse(open(output_file, 'rb'),content_type=content_type)
                return response;
            finally:
                error.close()
    finally:
        if not settings.KEEP_TMP_FILE:
            os.remove(print_js_file)



