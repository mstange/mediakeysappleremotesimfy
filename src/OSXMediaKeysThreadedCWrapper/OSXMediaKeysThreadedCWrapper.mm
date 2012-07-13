#include <queue>
#include <iostream>
#include <pthread.h>

#include "OSXMediaKeysThreadedCWrapper.h"
#import "SPMediaKeyTap/SPMediaKeyTap.h"

@class MainThreadMediaKeysController;

struct MediaKeysThreadMarshaller {
  std::queue<mktcw_message> messages;
  pthread_mutex_t messagesMutex;
  pthread_cond_t messagesNotEmptyCV;
  MainThreadMediaKeysController* controller;
};

mktcw_message
mktcw_get_message(void* marshaller)
{
  MediaKeysThreadMarshaller* m = (MediaKeysThreadMarshaller*)marshaller;
  pthread_mutex_lock(&m->messagesMutex);
  if (m->messages.empty()) {
    // Block until a message arrives.
    pthread_cond_wait(&m->messagesNotEmptyCV, &m->messagesMutex);
  }
  mktcw_message msg = m->messages.front();
  m->messages.pop();
  pthread_mutex_unlock(&m->messagesMutex);
  return msg;
}

static void
insertMessage(void* marshaller, mktcw_message msg)
{
  MediaKeysThreadMarshaller* m = (MediaKeysThreadMarshaller*)marshaller;
  pthread_mutex_lock(&m->messagesMutex);
  m->messages.push(msg);
  pthread_cond_signal(&m->messagesNotEmptyCV);
  pthread_mutex_unlock(&m->messagesMutex);
}

@interface MainThreadMediaKeysController : NSObject
{
  SPMediaKeyTap* mediaKeys;
  MediaKeysThreadMarshaller* m;
}
- (id)initWithMarshaller:(id)marshaller;
- (void)mediaKeyTap:(SPMediaKeyTap*)keyTap receivedMediaKeyEvent:(NSEvent*)event;
- (void)startListeningToMediaKeys;
- (void)stopListeningToMediaKeys;

@end

@implementation MainThreadMediaKeysController

- (id)initWithMarshaller:(id)marshaller
{
  [super init];

  mediaKeys = [[SPMediaKeyTap alloc] initWithDelegate:self];
  m = (MediaKeysThreadMarshaller*)[marshaller pointerValue];

  return self;
}

// delegate method
- (void)mediaKeyTap:(SPMediaKeyTap*)keyTap receivedMediaKeyEvent:(NSEvent*)event
{
  // From the example app that's included with SPMediaKeyTap:
  int keyCode = (([event data1] & 0xFFFF0000) >> 16);
  int keyFlags = ([event data1] & 0x0000FFFF);
  BOOL keyIsPressed = (((keyFlags & 0xFF00) >> 8)) == 0xA;
  bool keyRepeat = !!(keyFlags & 0x1);

  mktcw_message msg = { false, !!keyIsPressed, keyCode, keyFlags, keyRepeat };
  insertMessage(m, msg);
}

- (void)startListeningToMediaKeys
{
  [mediaKeys startWatchingMediaKeys];
}

- (void)stopListeningToMediaKeys
{
  [mediaKeys stopWatchingMediaKeys];
}

- (void)dealloc
{
  // XXX We need to call [mediaKeys stopWatchingMediaKeys] first, because if
  // we're still watching, the SPMediaKeyTap object will be kept alive by its
  // watch thread, so calling release won't dealloc it, and it won't stop
  // watching.
  [mediaKeys stopWatchingMediaKeys];

  [mediaKeys release];
  [super dealloc];
}

@end

void* mktcw_create()
{
  MediaKeysThreadMarshaller* m = new MediaKeysThreadMarshaller();
  m->controller = [MainThreadMediaKeysController alloc];

  NSAutoreleasePool* pool = [[NSAutoreleasePool alloc] init];
  [m->controller performSelectorOnMainThread:@selector(initWithMarshaller:) withObject:[NSValue valueWithPointer:m] waitUntilDone:NO];
  [pool drain];
  pthread_mutex_init(&m->messagesMutex, 0);
  pthread_cond_init(&m->messagesNotEmptyCV, 0);

  return m;  
}

void mktcw_start_listening(void* marshaller)
{
  MediaKeysThreadMarshaller* m = (MediaKeysThreadMarshaller*)marshaller;
  [m->controller performSelectorOnMainThread:@selector(startListeningToMediaKeys) withObject:nil waitUntilDone:NO];
}

void mktcw_stop_listening(void* marshaller)
{
  MediaKeysThreadMarshaller* m = (MediaKeysThreadMarshaller*)marshaller;
  [m->controller performSelectorOnMainThread:@selector(stopListeningToMediaKeys) withObject:nil waitUntilDone:NO];
}

void mktcw_destroy(void* marshaller)
{
  MediaKeysThreadMarshaller* m = (MediaKeysThreadMarshaller*)marshaller;
  mktcw_message msg = { true, false, 0, 0, false };
  insertMessage(m, msg);

  [m->controller performSelectorOnMainThread:@selector(release) withObject:nil waitUntilDone:NO];
  pthread_cond_destroy(&m->messagesNotEmptyCV);
  pthread_mutex_destroy(&m->messagesMutex);
  delete m;
}
