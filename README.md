# YouTube English Auto-Sub → SRV2

A small Chrome Manifest V3 extension that watches the current YouTube page for an English auto-generated caption (`/api/timedtext` with `lang=en*` and `kind=asr`), refetches that exact request as `fmt=srv2`, and lets you save the result as `.srv2`.

## Why it uses MAIN world

The caption request is created by YouTube's own page code. The interceptor therefore runs in Chrome's `MAIN` execution world at `document_start`, so it can wrap the page's `fetch()` and XHR methods. Chrome documents `MAIN` as the page's JavaScript world, distinct from an extension's default isolated world.

## Install

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `youtube-srv2-extension` directory.
5. Open or reload a YouTube video.
6. Turn on the video's **English (auto-generated)** subtitles and play far enough for YouTube to request timedtext.
7. Click the extension icon and choose **Save .srv2**.

## Notes

- This does **not** download the video or audio.
- The extension relies on YouTube's current internal timedtext behavior, which is not a stable public extension API and can change.
- The request URL that YouTube actually creates is reused, including query parameters/tokens already present on that request. Only `fmt=srv2` is changed for the refetch.
- If YouTube returns JSON instead of SRV2 XML despite `fmt=srv2`, a small JSON3 → SRV2 fallback converter is included.
- The current implementation targets `www.youtube.com` watch pages and English auto-generated captions.
