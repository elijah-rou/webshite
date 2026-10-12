---
name: icloud-photos-cli
repo: https://github.com/elijah-rou/icloud-photos-cli
language: Swift
summary: Native Swift port of icloudpd that downloads iCloud Photos to local folders.
order: 4
---
`icp` downloads iCloud Photos to local folders. It is a native Swift port of
icloud_photos_downloader (icloudpd) with a new command syntax and one engine
shared by the CLI and a macOS app. It keeps icloudpd's on-disk layout, so
existing download trees are recognised unchanged.

It covers:

- sign-in with two-factor codes, including Advanced Data Protection libraries
- whole libraries, albums, shared libraries and Shared Albums
- originals, edits, RAW+JPEG pairs and Live Photo motion files
- resumable downloads that check sizes before a file is published
- reruns that fetch only what is new, previews with `icp plan`, and saved
  profiles repeated on a schedule with `icp watch`

It builds on macOS and Linux. Security-key (FIDO2) sign-in is not implemented,
and it has not yet been checked against Apple's live service.
