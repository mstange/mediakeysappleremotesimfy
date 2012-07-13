let Core = window.unsafeWindow.Core;

self.port.on("togglePlayback", function () {
  if (!Core.EI)
    return;

  if (Core.EI.player_is_playing)
    Core.EI.pausePlayback();
  else
    Core.EI.resumePlayback();
});

self.port.on("playNext", function () {
  if (!Core.EI)
    return;

  Core.EI.playNext();
});

self.port.on("playPrevious", function () {
  if (!Core.EI)
    return;

  Core.EI.playPrevious();
});
