#!/bin/sh

appname=popupalt

cp buildscript/make_new.sh ./
./make_new.sh $appname version=0
rm ./make_new.sh

