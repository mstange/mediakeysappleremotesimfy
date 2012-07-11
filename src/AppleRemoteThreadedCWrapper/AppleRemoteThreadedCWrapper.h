/**
 * artcw = Apple Remote Threaded C Wrapper
 *
 * The purpose of this wrapper is to provide a C API that can be used from a
 * Firefox extension through js-ctypes.
 *
 * You probably don't need to look at this very closely; the only user of this
 * API is the "apple-remote" module located under /lib/apple-remote.js which
 * accesses this API through two ChromeWorker threads
 * (/data/AppleRemoteControllerWorker.js and -ListenerWorker.js).
 *
 * The API and implementation of this wrapper is almost exactly the same as
 * OSXMediaKeysThreadedCWrapper. If you've understood one of them you've
 * understood both of them.
 *
 * Here are the design considerations behind this wrapper:
 *
 * The central requirement to this API is that it should be able to be
 * accessed from a thread that is not the main thread. There are two reasons
 * for this requirement: The first is that library loading takes a short time,
 * mostly for reading the library from disk (IO), and I want to avoid blocking
 * the main thread during that time. The second reason is that in the future,
 * add-ons might be run off the main thread, so we wouldn't be able to rely on
 * starting out on the main thread anyway.
 * Since the Apple Remote library which we're wrapping around can only be used
 * on the main thread, we'll have to do our own inter-thread marshalling.
 *
 * Now to the problem of notifying JavaScript of a button press event:
 * These events come in through the Cocoa event loop (which runs on the main
 * thread), and we need to notify some JavaScript which runs somewhere in a
 * worker thread. We can't inject an event of our own into the worker's event
 * loop (we don't have access to that), so we need to make sure that our own
 * code is running in that thread so that we can accept the event there.
 * One way of doing that would be to busy-wait on the thread, calling
 * periodically into our C wrapper and asking "has a new event arrived yet?".
 * But busy-waiting is bad. Another way would be to use a condition variable
 * and wait on that; pthread_cond_wait keeps the CPU idle. So the idea is to
 * have the worker thread block on pthread_cond_wait which is called from our
 * own C code until we're notified from the main thread that a new event has
 * arrived. Then we return this event into the JavaScript code that called us
 * and wait for it to call back into us to wait for the next event.
 * This is what artcw_get_message does; it blocks until an event arrives and
 * returns it as soon as that happens.
 * Note that this means that we need a second worker thread since we also want
 * to be able to call startListening/stopListening on the AppleRemote while
 * we're blocking in artcw_get_message. That's why there are two JavaScript
 * ChromeWorkers: ControllerThread and ListenerThread.
 * We want to terminate ListenerThread when the AppleRemote module is shut
 * down. For that we have an "isDestroyNotification" flag on the events that
 * are returned by artcw_get_message so we don't have to terminate the thread
 * forcefully while it blocks on pthread_cond_wait.
 */

#ifndef __cplusplus
#include <stdbool.h>
#endif

#ifdef __cplusplus
extern "C" {
#endif

// Call these from any thread.
void* artcw_create();
void artcw_start_listening(void* arctw);
void artcw_stop_listening(void* arctw);
void artcw_destroy(void* arctw);

typedef struct artcw_message
{
  unsigned int type;
  bool pressedDown;
  bool isDestroyNotification;
} artcw_message;

// Call this from a thread that's NOT the main thread and that
// can afford to block until a message arrives.
artcw_message artcw_get_message(void* arctw);

#ifdef __cplusplus
}
#endif
