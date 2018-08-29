## About

Videos can be imported by using the associated import dialog button or by drag and dropping video files onto the dropzone area of the import dialog.

Any common videos with monophonic or stereophonic audio channels can be imported that way.

Videos are constantly playing, the playback rate parameter in the input settings can be changed to 0 to stop videos.

VIdeos are useful as a quick way to produce visuals within Fragment.

Fragment videos features

- loop settings
- playback rate (play backward or forward at any supported rates)
- OSC control (see *osc* section)

Just like sounds import, videos audio channel can be imported into Fragment by checking the corresponding checkbox in the audio import settings panel, see *sounds import* section for more details related to sounds import

## How-to

Since videos are converted to images and sounds, see *images import* and *sounds import* section for its usage and import settings

Videos have specific settings which are

##### Smooth

This control the looping mode, when checked, the video loop will be smooth, alternating between forward and backward play, this is currently not supported by most web. browser

##### Playback rate

This control the playback rate of the video, a negative value will play the video backward (this does not work on Chrome browser due to implementation issue), the default playback value is 1, a value of less than 1 will play the video slowly while a value higher than 1 will play it fast

##### Video start

This control the starting point of the video, the video duration is normalized to 0 - 1 range

This also seek automatically the video to the start point when changed

##### Video end

This control the ending point of the video, the video duration is normalized to 0 - 1 range

## Note

- VFlip input settings does not work with videos
- Video play position is accessible within the Fragment shader as `fvidN` where `N` is the input ID.
- Imported videos are not saved, instead videos input will be seen as a broken input upon session reload which act as a dummy input until you replace it, videos are not saved because they can be quite large and this may introduce issues on usability.