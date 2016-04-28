"""printing URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.9/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import url,include
from django.views.decorators.csrf import csrf_exempt

from printing.views import print_to_png,print_to_pdf,print_to_gif,print_to_bmp,print_to_jpg

urlpatterns = [
    url(r'^(?P<template>[a-z0-9_]*)/png/?$', csrf_exempt(print_to_png)),
    url(r'^(?P<template>[a-z0-9_]*)/bmp/?$', csrf_exempt(print_to_bmp)),
    url(r'^(?P<template>[a-z0-9_]*)/jpg/?$', csrf_exempt(print_to_jpg)),
    url(r'^(?P<template>[a-z0-9_]*)/gif/?$', csrf_exempt(print_to_gif)),
    url(r'^(?P<template>[a-z0-9_]*)/pdf/?$', csrf_exempt(print_to_pdf)),
]
