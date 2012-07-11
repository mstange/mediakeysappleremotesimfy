#include <queue>
#include <iostream>
#include <pthread.h>

#include "AppleRemoteThreadedCWrapper.h"
#import "apple_remote_control/AppleRemote.h"

@class MainThreadRemoteController;

struct AppleRemoteThreadMarshaller {
  std::queue<artcw_message> messages;
  pthread_mutex_t messagesMutex;
  pthread_cond_t messagesNotEmptyCV;
  MainThreadRemoteController* controller;
};

artcw_message
artcw_get_message(void* marshaller)
{
  AppleRemoteThreadMarshaller* m = (AppleRemoteThreadMarshaller*)marshaller;
  pthread_mutex_lock(&m->messagesMutex);
  if (m->messages.empty()) {
    // Block until a message arrives.
    pthread_cond_wait(&m->messagesNotEmptyCV, &m->messagesMutex);
  }
  artcw_message msg = m->messages.front();
  m->messages.pop();
  pthread_mutex_unlock(&m->messagesMutex);
  return msg;
}

static void
insertMessage(void* marshaller, artcw_message msg)
{
  AppleRemoteThreadMarshaller* m = (AppleRemoteThreadMarshaller*)marshaller;
  pthread_mutex_lock(&m->messagesMutex);
  m->messages.push(msg);
  pthread_cond_signal(&m->messagesNotEmptyCV);
  pthread_mutex_unlock(&m->messagesMutex);
}

@interface MainThreadRemoteController : NSObject
{
  AppleRemote* remoteControl;
  AppleRemoteThreadMarshaller* m;
}
- (id)initWithMarshaller:(id)marshaller;
- (void)sendRemoteButtonEvent:(RemoteControlEventIdentifier)buttonIdentifier pressedDown:(BOOL)pressedDown remoteControl:(RemoteControl*)remoteControl;
- (void)startListeningToAppleRemote;
- (void)stopListeningToAppleRemote;

@end

@implementation MainThreadRemoteController

- (id)initWithMarshaller:(id)marshaller
{
  [super init];

  remoteControl = [[AppleRemote alloc] initWithDelegate:self];
  [remoteControl setDelegate:self];
  m = (AppleRemoteThreadMarshaller*)[marshaller pointerValue];

  return self;
}

// delegate method
- (void)sendRemoteButtonEvent:(RemoteControlEventIdentifier)buttonIdentifier pressedDown:(BOOL)pressedDown remoteControl:(RemoteControl*)remoteControl
{
  artcw_message msg = { buttonIdentifier, pressedDown, false };
  insertMessage(m, msg);
}

- (void)startListeningToAppleRemote
{
  [remoteControl startListening: self];
}

- (void)stopListeningToAppleRemote
{
  [remoteControl stopListening:self];
}

- (void)dealloc
{
  [remoteControl release];
  [super dealloc];
}

@end

void* artcw_create()
{
  AppleRemoteThreadMarshaller* m = new AppleRemoteThreadMarshaller();
  m->controller = [MainThreadRemoteController alloc];

  NSAutoreleasePool* pool = [[NSAutoreleasePool alloc] init];
  [m->controller performSelectorOnMainThread:@selector(initWithMarshaller:) withObject:[NSValue valueWithPointer:m] waitUntilDone:NO];
  [pool drain];
  pthread_mutex_init(&m->messagesMutex, 0);
  pthread_cond_init(&m->messagesNotEmptyCV, 0);

  return m;  
}

void artcw_start_listening(void* marshaller)
{
  AppleRemoteThreadMarshaller* m = (AppleRemoteThreadMarshaller*)marshaller;
  [m->controller performSelectorOnMainThread:@selector(startListeningToAppleRemote) withObject:nil waitUntilDone:NO];
}

void artcw_stop_listening(void* marshaller)
{
  AppleRemoteThreadMarshaller* m = (AppleRemoteThreadMarshaller*)marshaller;
  [m->controller performSelectorOnMainThread:@selector(stopListeningToAppleRemote) withObject:nil waitUntilDone:NO];
}

void artcw_destroy(void* marshaller)
{
  AppleRemoteThreadMarshaller* m = (AppleRemoteThreadMarshaller*)marshaller;
  artcw_message msg = { 0, false, true };
  insertMessage(m, msg);

  [m->controller performSelectorOnMainThread:@selector(release) withObject:nil waitUntilDone:NO];
  pthread_cond_destroy(&m->messagesNotEmptyCV);
  pthread_mutex_destroy(&m->messagesMutex);
  delete m;
}
