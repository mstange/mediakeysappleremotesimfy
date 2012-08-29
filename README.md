Media Keys and Apple Remote Support for simfy.de
================================================

This is a restartless Firefox extension that lets you control playback on [www.simfy.de](http://www.simfy.de/) using the media keys on Apple keyboards and using the Apple Remote. It can be installed by dragging the file ```mediakeysappleremotesimfy.xpi``` into Firefox.

It's compatible with Firefox 13 or higher on Mac OS X.

Exclusive access to the media keys and to the Apple Remote is held while at least one simfy tab is open. Close all simfy tabs in order to be able to control iTunes (or anything else) again.

Building the extension
----------------------

This extension is built using the Add-on SDK, so if you want to make changes to it, you'll need to install that first.

    git clone https://github.com/mozilla/addon-sdk/
    git clone https://github.com/mstange/mediakeysappleremotesimfy/
    cd addon-sdk/
    git checkout release
    . bin/activate
    cd ../mediakeysappleremotesimfy/
    cfx run # to test
    cfx xpi # to rebuild mediakeysappleremotesimfy.xpi

The hard work of interfacing with the OS X APIs for the Apple Remote and the media keys is done through [js-ctypes](https://developer.mozilla.org/en/js-ctypes) with the libraries ```data/libAppleRemoteThreadedCWrapper.dylib``` and ```data/libOSXMediaKeysThreadedCWrapper.dylib``` which are distributed with the add-on in binary form. Their source code is in the ```src``` folder; I've basically built C wrappers around the existing github projects [apple_remote_control](https://github.com/seanm/apple_remote_control) and [SPMediaKeyTap](https://github.com/nevyn/SPMediaKeyTap). If you make changes to those files you can recompile the libraries by executing the ```rebuild.sh``` scripts.
