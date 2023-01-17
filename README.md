# Restic Backup GUI #

Restic + Vue3 + Electron

## Features ##

- setup profiles with multiple backup locations
- forget settings
- store repo password
- shows repo size

## Roadmap ##

- expose the concept of snapshots

## dev ##

### setup

download latest restic release and place in ./bin/linux/restic
for packaging, download mac and win versions to ./bin/mac/restic and ./bin/win/restic.exe

### todo

- confirm profile delete
- on wrong pw or repo not found, display error
- prevent duplicate folders
- prevent adding repo to itself
- rename profile-list to close profile, and delete from memory
- about page

- fix unmount problem

